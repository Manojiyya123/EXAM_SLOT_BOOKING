const https = require('https');

const hostname = 'db.qkuzqoxoccfydnlemdnt.supabase.co';
const url = `https://dns.google/resolve?name=${hostname}`;

console.log(`Querying ${url}...`);

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            console.log('DoH Response:', JSON.stringify(response, null, 2));

            if (response.Answer) {
                const ip = response.Answer.find(a => a.type === 1)?.data;
                console.log(`\n✅ Resolved Public IP: ${ip}`);
            } else {
                console.log('\n❌ No A records found in DoH response.');
            }
        } catch (e) {
            console.error('Error parsing response:', e);
            console.log('Raw data:', data);
        }
    });
}).on('error', (err) => {
    console.error('DoH Request failed:', err.message);
});
