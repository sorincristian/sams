import * as pdfjsLib from 'pdfjs-dist';
import * as fs from 'fs';
import * as path from 'path';

async function extractText(pdfPath: string) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items.map((item: any) => item.str).join(' | ');
    console.log(`Page ${i}:`, items.substring(0, 1000));
  }
}

extractText('c:/SIMS/sams-render/apps/api/prisma/import-data/New Flyer 40 ft. Electric - Bus #6000-6203 (1).pdf').catch(console.error);
