const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// In-memory storage
let comparisons = [];
let comparisonIdCounter = 1;

// Initialize SDKs
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Model API configurations
const MODEL_CONFIGS = {
    'chatgpt': {
        type: 'groq',
        model: 'llama3-70b-8192',
        displayName: 'ChatGPT'
    },
    'claude': {
        type: 'groq',
        model: 'mixtral-8x7b-32768',
        displayName: 'Claude'
    },
    'gemini': {
        type: 'groq',
        model: 'gemma-7b-it',
        displayName: 'Gemini'
    },
    'grok': {
        type: 'groq',
        model: 'llama3-8b-8192',
        displayName: 'Grok'
    },
    'midjourney': {
        type: 'pollinations',
        model: 'midjourney',
        displayName: 'Midjourney'
    }
};

// Helper function to call different model APIs
async function callModelAPI(modelKey, prompt, temperature = 0.7) {
    const config = MODEL_CONFIGS[modelKey];
    if (!config) {
        throw new Error(`Model ${modelKey} not configured`);
    }

    const startTime = Date.now();

    try {
        let content;
        let tokens = 0;

        if (config.type === 'groq') {
            if (!groq) throw new Error('Groq API Key missing in .env');

            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: config.model,
                temperature: temperature,
            });

            content = completion.choices[0]?.message?.content || "";
            tokens = completion.usage?.total_tokens || 0;

        } else if (config.type === 'pollinations') {
            const encodedPrompt = encodeURIComponent(prompt);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
            content = `![${prompt}](${imageUrl})`;
            tokens = 0;
        } else {
            throw new Error(`Unknown model type: ${config.type}`);
        }

        const cost = "Free";

        return {
            content,
            latency: (Date.now() - startTime) / 1000,
            tokens,
            cost,
            error: null
        };

    } catch (error) {
        console.error(`Error calling ${modelKey}:`, error);
        return {
            content: null,
            latency: (Date.now() - startTime) / 1000,
            tokens: 0,
            cost: 0,
            error: error.message || 'API call failed'
        };
    }
}

function analyzeResponses(responses) {
    return {
        consensus: [],
        conflicts: [],
        bestResponse: responses[0]?.model || 'None'
    };
}

app.get("/api", (req, res) => {
  res.send("API is running");
});

// Routes
app.post('/api/compare', async (req, res) => {
    const { prompt, models, temperature = 0.7 } = req.body;

    if (!prompt || !models || models.length === 0) {
        return res.status(400).json({ error: 'Prompt and models are required' });
    }

    const comparison = {
        id: comparisonIdCounter++,
        prompt,
        models,
        temperature,
        timestamp: new Date().toISOString(),
        status: 'processing',
        responses: []
    };

    comparisons.push(comparison);

    res.json({
        id: comparison.id,
        message: 'Comparison started',
        status: 'processing'
    });

    processComparison(comparison);
});

async function processComparison(comparison) {
    const responses = [];

    for (const modelKey of comparison.models) {
        try {
            const result = await callModelAPI(modelKey, comparison.prompt, comparison.temperature);
            responses.push({
                model: modelKey,
                ...result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            responses.push({
                model: modelKey,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    const analysis = analyzeResponses(responses.filter(r => !r.error));

    comparison.responses = responses;
    comparison.analysis = analysis;
    comparison.status = 'completed';
    comparison.completedAt = new Date().toISOString();
}

app.get('/api/comparisons/:id', (req, res) => {
    const comparison = comparisons.find(c => c.id === parseInt(req.params.id));
    if (!comparison) {
        return res.status(404).json({ error: 'Comparison not found' });
    }
    res.json(comparison);
});

app.get('/api/comparisons/:id/status', (req, res) => {
    const comparison = comparisons.find(c => c.id === parseInt(req.params.id));
    if (!comparison) {
        return res.status(404).json({ error: 'Comparison not found' });
    }
    res.json({
        id: comparison.id,
        status: comparison.status,
        completedAt: comparison.completedAt,
        responseCount: comparison.responses.length
    });
});

app.get('/api/comparisons', (req, res) => {
    res.json(comparisons);
});

app.delete('/api/comparisons/:id', (req, res) => {
    const index = comparisons.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ error: 'Comparison not found' });
    }
    comparisons.splice(index, 1);
    res.json({ message: 'Comparison deleted' });
});

app.get('/api/search', (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.json(comparisons);
    }

    const results = comparisons.filter(c =>
        c.prompt.toLowerCase().includes(query.toLowerCase())
    );
    res.json(results);
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        config: {
            groq: !!process.env.GROQ_API_KEY,
            gemini: !!process.env.GEMINI_API_KEY
        }
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Polyquery backend running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
    console.log('\n🔧 Configured Free/Proxy Services:');
    console.log(`   ${process.env.GROQ_API_KEY ? '✅' : '❌'} Groq (ChatGPT/Claude/Grok proxy)`);
    console.log(`   ${process.env.GEMINI_API_KEY ? '✅' : '❌'} Gemini`);
    console.log(`   ✅ Pollinations (Midjourney proxy - No Key Needed)`);
});

module.exports = app;