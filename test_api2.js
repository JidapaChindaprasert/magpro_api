const http = require('http');

const data = JSON.stringify({
    email: 'admin@gmail.com',
    password: 'mag123'
});

const req = http.request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    let cookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0] : '';
    
    // Now request lesson 1
    const req2 = http.request({
        hostname: '127.0.0.1',
        port: 3000,
        path: '/api/v1/lesson/1?lang=en',
        method: 'GET',
        headers: {
            'Cookie': cookie
        }
    }, (res2) => {
        let body = '';
        res2.on('data', d => body += d);
        res2.on('end', () => console.log('STATUS:', res2.statusCode, 'BODY:', body));
    });
    req2.end();
});

req.write(data);
req.end();
