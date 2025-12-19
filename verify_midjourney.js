const axios = require('axios');

async function testMidjourney() {
    try {
        console.log("Testing Midjourney (Pollinations)...");
        const response = await axios.post('http://localhost:3000/api/compare', {
            prompt: "A futuristic city",
            models: ["midjourney"]
        });
        console.log("Initial Response:", response.data);

        // Wait a bit and check status (Pollinations is instant in this code, but good to follow flow)
        setTimeout(async () => {
            const status = await axios.get(`http://localhost:3000/api/comparisons/${response.data.id}`);
            console.log("Result:", JSON.stringify(status.data.responses, null, 2));
        }, 2000);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testMidjourney();
