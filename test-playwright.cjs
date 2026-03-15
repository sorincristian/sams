const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  let logStr = "";
  function log(s) { 
    console.log(s); 
    logStr += s + "\n"; 
  }

  log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('response', async response => {
    if(response.url().includes('login') || response.url().includes('me')) {
       log('\n>>> [NETWORK RESPONSE] ' + response.request().method() + ' ' + response.url() + ' ' + response.status());
       const headers = await response.headers();
       log('>>> CORS HEADER: ' + (headers['access-control-allow-origin'] || 'NONE'));
       if (response.request().method() !== 'OPTIONS') {
         try {
           const body = await response.text();
           log('>>> BODY: ' + body.substring(0, 100));
         } catch(e) {
           log('>>> BODY: could not read');
         }
       }
    }
  });

  log('Navigating...');
  await page.goto('https://sams-web-emwb.onrender.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  log('Filling form...');
  try {
    await page.fill('input[placeholder="Email"]', 'admin@ttc.ca');
    await page.fill('input[placeholder="Password"]', 'admin');
    
    log('Submitting...');
    await page.click('button[type="submit"]');
  } catch(e) {
    log("Form not found? " + e.message);
  }
  
  await page.waitForTimeout(5000);
  log('Done.');
  fs.writeFileSync('browser-trace.txt', logStr, 'utf8');
  await browser.close();
})();
