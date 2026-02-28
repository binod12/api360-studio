const axios = require('axios');

async function testFetch() {
    console.log("Starting Axios test...");
    try {
        const response = await axios({
            method: 'GET',
            url: 'https://json2jsonp.com/?url=http://domain.com/some/json&callback=cbfunc',
            validateStatus: () => true,
            maxRedirects: 5
        });
        console.log("Status:", response.status);
        console.log("Data length:", JSON.stringify(response.data || {}).length);
        console.log("Data snippet:", JSON.stringify(response.data || {}).substring(0, 50));
    } catch (error) {
        console.error("AXIOS ERROR CAUGHT:");
        console.error("Message:", error.message);
        if (error.response) {
            console.error("Response Status:", error.response.status);
        } else if (error.request) {
            console.error("No response received. Request dumped:", error.request.url);
        }
    }
}

testFetch();
