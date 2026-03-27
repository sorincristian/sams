import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();
const uploadsDir = path.join(process.cwd(), 'uploads');

function normalizeName(name: string) {
    return decodeURIComponent(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function run() {
  const attachments = await db.catalogAttachment.findMany();
  if (!fs.existsSync(uploadsDir)) {
      console.log("No uploads dir.");
      process.exit(1);
  }
  const actualFiles = fs.readdirSync(uploadsDir);
  
  let total = attachments.length;
  let valid = 0;
  let fixed = 0;
  let broken = 0;
  let samples: string[] = [];

  for (const a of attachments) {
    if (!a.urlOrPath) {
       await db.catalogAttachment.delete({ where: { id: a.id } });
       broken++;
       continue;
    }

    const rawFilename = a.urlOrPath.replace('/uploads/', '').replace(/^\/+/, '');
    const filename = decodeURIComponent(rawFilename);
    const filePath = path.join(uploadsDir, filename);
    const exists = fs.existsSync(filePath);

    if (exists) {
      valid++;
      if (samples.length < 3) samples.push(`http://localhost:4000/uploads/${encodeURIComponent(filename)}`);
    } else {
      const targetName = normalizeName(filename);
      const match = actualFiles.find(f => {
         const cleanF = normalizeName(f);
         return cleanF === targetName || (cleanF.includes(targetName) && targetName.length > 5) || (targetName.includes(cleanF) && cleanF.length > 5);
      });

      if (match) {
         await db.catalogAttachment.update({
            where: { id: a.id },
            data: { urlOrPath: `/uploads/${match}` } // encodeURIComponent if necessary, but files with spaces are fine if Express handles it, though encodeURI is safer. Wait, if URL contains spaces, Express handles raw strings with spaces if fetched properly? Better to encodeURIComponent but standardizing on raw name mapped inside /uploads/ is normal.
         });
         await db.catalogAttachment.update({
            where: { id: a.id },
            data: { urlOrPath: `/uploads/${encodeURIComponent(match)}` }
         });
         fixed++;
         if (samples.length < 3) samples.push(`http://localhost:4000/uploads/${encodeURIComponent(match)}`);
      } else {
         await db.catalogAttachment.delete({ where: { id: a.id } });
         broken++;
      }
    }
  }

  console.log(JSON.stringify({ total, valid, fixed, broken, samples }, null, 2));
  process.exit(0);
}

run();
