import pdf from 'pdf-parse';
import fs from 'fs';
import path from 'path';

async function testPdfParse() {
  const dataDir = "c:/SIMS/sams-render/apps/api/prisma/import-data";
  const pdfFileName = "New Flyer 40 ft. Electric - Bus #6000-6203 (1).pdf"; // Let's check this one
  const pdfPath = path.join(dataDir, pdfFileName);

  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);

  console.log(data.text.substring(0, 500));
}

testPdfParse().catch(console.error);
