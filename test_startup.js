const { spawn } = require('child_process');
const http = require('http');

console.log("Starting server...");
const server = spawn('node', ['server.js'], { stdio: 'pipe' });

server.stdout.on('data', (data) => {
    console.log(`SERVER: ${data}`);
});

server.stderr.on('data', (data) => {
    console.log(`SERVER_ERR: ${data}`);
});

server.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
});

setTimeout(() => {
    console.log("Checking health...");
    const req = http.get('http://localhost:3000/api/health', (res) => {
        console.log('STATUS: ' + res.statusCode);
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            console.log('BODY: ' + chunk);
            server.kill();
            process.exit(0);
        });
    });

    req.on('error', (e) => {
        console.log('HEALTH_CHECK_ERROR: ' + e.message);
        server.kill();
        process.exit(1);
    });
}, 5000);
