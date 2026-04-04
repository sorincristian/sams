import PDFParser from "pdf2json";
import { join } from 'path';
import fs from 'fs';

const dataDir = "c:/SIMS/sams-render/apps/api/prisma/import-data";
const pdfFileName = "New Flyer 40 ft. Electric - Bus #6000-6203 (1).pdf";
const pdfPath = join(dataDir, pdfFileName);

const pdfParser = new PDFParser(this, 1);
pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
  fs.writeFileSync('pdf-out-utf8.txt', pdfParser.getRawTextContent(), 'utf-8');
});

pdfParser.loadPDF(pdfPath);
