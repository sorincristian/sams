import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

async function testPdfParse() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
  const dataDir = "c:/SIMS/sams-render/apps/api/prisma/import-data";
  const pdfFileName = "New Flyer 40 ft. Electric - Bus #6000-6203 (1).pdf";
  const pdfPath = join(dataDir, pdfFileName);

  const data = new Uint8Array(readFileSync(pdfPath));
  const loadingTask = (pdfjsLib as any).getDocument({ data, disableFontFace: true, verbosity: 0 });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items.map((item: any) => item.str);
    console.log(`\n\n--- PAGE ${i} ---`);
    console.log(items.slice(0, 100).join(' | '));
  }
}

testPdfParse().catch(console.error);
