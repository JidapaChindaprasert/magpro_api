const https = require('https');

// Change the '1' at the end of the URL if your connected_id is different
const API_URL = 'https://physiot.kmitl.ac.th/api/v1/telemetry/latest/1';
let lastTimestamp = null;

console.log(`====================================================`);
console.log(`📡 Watching Real-Time Telemetry from Production Server`);
console.log(`URL: ${API_URL}`);
console.log(`Polling every 500ms... Press Ctrl+C to stop.`);
console.log(`====================================================\n`);

setInterval(() => {
    https.get(API_URL, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                
                // If there is no data at all yet
                if (json.success && !json.data) {
                    if (lastTimestamp !== 'empty') {
                        console.log(`[Waiting] No data found for this device yet...`);
                        lastTimestamp = 'empty';
                    }
                    return;
                }

                if (json.success && json.data) {
                    const currentTimestamp = json.data.create_at;
                    
                    // Only log when a new reading arrives
                    if (currentTimestamp !== lastTimestamp) {
                        lastTimestamp = currentTimestamp;
                        const date = new Date(currentTimestamp).toLocaleTimeString();
                        console.log(`[${date}] ✅ New Reading -> Magnetic Field: ${Number(json.data.magnetic_field).toFixed(4)} G | Voltage: ${Number(json.data.voltage).toFixed(4)} V`);
                    }
                }
            } catch (err) {
                // Ignore parse errors from occasional network hiccups
            }
        });
    }).on('error', (err) => {
        console.error('Network Error:', err.message);
    });
}, 500);
