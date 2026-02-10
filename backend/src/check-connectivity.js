const dns = require('dns');
const net = require('net');

const hostname = 'db.qkuzqoxoccfydnlemdnt.supabase.co';
const google = 'google.com';

function checkDns(host) {
    return new Promise((resolve) => {
        console.log(`Resolving ${host}...`);
        dns.lookup(host, { all: true }, (err, addresses) => {
            if (err) {
                console.error(`DNS Lookup failed for ${host}:`, err.message);
                resolve([]);
            } else {
                console.log(`DNS Lookup success for ${host}:`, addresses);
                resolve(addresses);
            }
        });
    });
}

function checkTcp(host, port, family) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        console.log(`Connecting to ${host}:${port} (${family})...`);

        socket.setTimeout(5000);

        socket.connect(port, host, () => {
            console.log(`✅ Connected to ${host}:${port}`);
            socket.end();
            resolve(true);
        });

        socket.on('error', (err) => {
            console.error(`❌ Connection failed to ${host}:${port}:`, err.message);
            resolve(false);
        });

        socket.on('timeout', () => {
            console.error(`❌ Connection timed out to ${host}:${port}`);
            socket.destroy();
            resolve(false);
        });
    });
}

(async () => {
    console.log('--- Connectivity Check ---');

    // Check Internet
    await checkDns(google);
    await checkTcp(google, 80);

    // Check Supabase
    const addresses = await checkDns(hostname);

    for (const addr of addresses) {
        // addr is object { address: '...', family: 4/6 }
        await checkTcp(addr.address, 5432, `IPv${addr.family}`);
        await checkTcp(addr.address, 6543, `IPv${addr.family}`); // Pooler port
    }

    if (addresses.length === 0) {
        console.log('Trying fallback DNS resolution using 8.8.8.8 (Google DNS) via doh (not implemented easily without fetch) - skipping.');
    }
})();
