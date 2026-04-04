import PDFParser from "pdf2json";
import { join } from 'path';
import fs from 'fs';

async function run() {
  const dataDir = "c:/SIMS/sams-render/apps/api/prisma/import-data";
  const pdfFileName = "New Flyer 40 ft. Electric - Bus #6000-6203 (1).pdf";
  const pdfPath = join(dataDir, pdfFileName);

  const pdfParser = new PDFParser(this, 1);
  await new Promise((resolve, reject) => {
    pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", pdfData => {
      fs.writeFileSync('c:/SIMS/sams-render/apps/api/pdf-out-utf8.txt', pdfParser.getRawTextContent());
      resolve(true);
    });
    pdfParser.loadPDF(pdfPath);
  });
  console.log("Written.");
}
run().catch(console.error);
