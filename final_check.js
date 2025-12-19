const axios = require('axios');

async function check() {
    try {
        const res = await axios.post('http://localhost:3000/api/compare', {
            prompt: "hi",
            models: ["chatgpt"]
        });
        console.log("ID:", res.data.id);

        setTimeout(async () => {
            try {
                const status = await axios.get(`http://localhost:3000/api/comparisons/${res.data.id}`);
                const response = status.data.responses[0];
                if (response.error) {
                    console.log("FAILURE: " + response.error);
                } else {
                    console.log("SUCCESS: " + response.content.substring(0, 20));
                }
            } catch (e) { console.log("POLL_ERR"); }
        }, 1500);
    } catch (e) {
        console.log("REQ_ERR: " + e.message);
    }
}
check();
