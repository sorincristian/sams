const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');
const path = require('path');

async function extract() {
  const dataDir = "c:/SIMS/sams-render/apps/api/prisma/import-data";
  const pdfFileName = "New Flyer 40 ft. Electric - Bus #6000-6203 (1).pdf";
  const pdfPath = path.join(dataDir, pdfFileName);

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data, disableFontFace: true, verbosity: 0 });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items.map((item) => item.str);
    console.log(`\n--- PAGE ${i} ---`);
    console.log(items.slice(0, 100).join(' | '));
  }
}
extract().catch(console.error);
