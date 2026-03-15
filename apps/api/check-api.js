import https from 'https';
import fs from 'fs';

let results = {};

function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sams-api-vfvj.onrender.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Origin': 'https://sams-web-emwb.onrender.com',
        'Authorization': 'Bearer test'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        results[method] = {
          status: res.statusCode,
          headers: res.headers,
          body: body.substring(0, 200)
        };
        resolve();
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

(async () => {
  await makeRequest('OPTIONS', '/api/buses');
  await makeRequest('GET', '/api/buses');
  fs.writeFileSync('out.json', JSON.stringify(results, null, 2));
})();
