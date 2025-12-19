// Backup of the functional backend code
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 3002; // Change this back to 3000 later if needed

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// In-memory storage (replace with database in production)
let comparisons = [];
let comparisonIdCounter = 1;

// Initialize SDKs
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Model API configurations
const MODEL_CONFIGS = {
    // 1. ChatGPT (Mapped to Groq Llama3-70b/8b as proxy for high quality chat)
    'chatgpt': {
        type: 'groq',
        model: 'llama3-70b-8192', // Excellent free tier model
        displayName: 'ChatGPT'
    },
    // 2. Claude (Mapped to Groq Mixtral as proxy for reasoning)
    'claude': {
        type: 'groq',
        model: 'mixtral-8x7b-32768',
        displayName: 'Claude'
    },
    // 3. Gemini (Mapped to Groq Gemma as user provided Groq key)
    'gemini': {
        type: 'groq',
        model: 'gemma-7b-it', // Google's open model running on Groq
        displayName: 'Gemini'
    },
    // 4. Grok (Mapped to Groq Llama3-8b as distinct fast model)
    'grok': {
        type: 'groq',
        model: 'llama3-8b-8192',
        displayName: 'Grok'
    },
    // 5. Midjourney (Mapped to Pollinations.ai)
    'midjourney': {
        type: 'pollinations',
        model: 'midjourney', // Pollinations style
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
            // For image generation, we return a markdown image link
            const encodedPrompt = encodeURIComponent(prompt);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
            // Return as an image tag or markdown image
            content = `![${prompt}](${imageUrl})`;
            tokens = 0;
        } else {
            throw new Error(`Unknown model type: ${config.type}`);
        }

        // Calculate simple cost (always Free for these APIs)
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

// Mock analysis since we removed OpenAI for analysis
function analyzeResponses(responses) {
    return {
        consensus: [],
        conflicts: [],
        bestResponse: responses[0]?.model || 'None'
    };
}


// --- Routes ---

// Compare models
app.post('/api/compare', async (req, res) => {
    const { prompt, models, temperature = 0.7 } = req.body;

    if (!prompt || !models || models.length === 0) {
        return res.status(400).json({ error: 'Prompt and models are required' });
    }

    // Create comparison entry
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

    // Send immediate response with comparison ID
    res.json({
        id: comparison.id,
        message: 'Comparison started',
        status: 'processing'
    });

    // Process models asynchronously
    processComparison(comparison);
});

async function processComparison(comparison) {
    const responses = [];

    // Call each model
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

    // Analyze responses
    const analysis = analyzeResponses(responses.filter(r => !r.error));

    // Update comparison
    comparison.responses = responses;
    comparison.analysis = analysis;
    comparison.status = 'completed';
    comparison.completedAt = new Date().toISOString();
}

// Get comparison status (for polling)
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

// Delete comparison
app.delete('/api/comparisons/:id', (req, res) => {
    const index = comparisons.findIndex(c => c.id === parseInt(req.params.id));
    if (index === -1) {
        return res.status(404).json({ error: 'Comparison not found' });
    }
    comparisons.splice(index, 1);
    res.json({ message: 'Comparison deleted' });
});

// Search comparisons
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

// Health check
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

// Error handling middleware
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
