const axios = require('axios');

async function testChatGPT() {
    try {
        console.log("Testing ChatGPT (Groq Proxy)...");
        const response = await axios.post('http://localhost:3000/api/compare', {
            prompt: "Say Hello",
            models: ["chatgpt"]
        });
        console.log("Initial Response:", response.data);

        setTimeout(async () => {
            try {
                const status = await axios.get(`http://localhost:3000/api/comparisons/${response.data.id}`);
                const result = status.data.responses[0];
                if (result.error) {
                    console.error("FAILED:", result.error);
                } else {
                    console.log("SUCCESS:", result.content);
                }
            } catch (e) {
                console.error("Error polling:", e.message);
            }
        }, 2000);
    } catch (e) {
        console.error("Error starting:", e.message);
    }
}

testChatGPT();
