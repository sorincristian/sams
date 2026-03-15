import https from 'https';

function makeRequest(method, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'sams-api-vfvj.onrender.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Origin': 'https://sams-web-emwb.onrender.com'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`\n--- ${method} ${path} ---`);
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
      
      let bodyData = '';
      res.on('data', (d) => { bodyData += d; });
      res.on('end', () => {
        console.log(`BODY: ${bodyData.substring(0, 300)}`);
        resolve();
      });
    });

    req.on('error', (e) => console.error(e));
    req.end();
  });
}

(async () => {
  await makeRequest('OPTIONS', '/api/me');
  await makeRequest('GET', '/api/me');
})();
