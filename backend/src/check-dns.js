const dns = require('dns');
const hostname = 'db.qkuzqoxoccfydnlemdnt.supabase.co';

console.log(`Resolving ${hostname}...`);

dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) {
        console.error('DNS Lookup failed:', err);
    } else {
        console.log('DNS Lookup success:', addresses);
    }
});

// Also try to resolve specifically for IPv4
dns.resolve4(hostname, (err, addresses) => {
    if (err) {
        console.error('IPv4 Resolve failed:', err);
    } else {
        console.log('IPv4 Resolve success:', addresses);
    }
});
