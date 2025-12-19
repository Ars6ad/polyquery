// Quick test to verify ChatGPT API key works
require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error('❌ API Key not found in .env file');
    process.exit(1);
}

console.log('✅ API Key found:', apiKey.substring(0, 15) + '...');
console.log('🔍 Testing API connection...\n');

axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o',
    messages: [
        { role: 'user', content: 'Say "Hello" if you can hear me.' }
    ],
    max_tokens: 50
}, {
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    }
})
.then(response => {
    console.log('✅ SUCCESS! API is working!');
    console.log('Response:', response.data.choices[0].message.content);
    process.exit(0);
})
.catch(error => {
    console.error('❌ API Error:');
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
        console.error('Error:', error.message);
    }
    process.exit(1);
});




