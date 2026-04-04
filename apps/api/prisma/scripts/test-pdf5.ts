import { PdfReader } from "pdfreader";

new PdfReader().parseFileItems("c:/SIMS/sams-render/apps/api/prisma/import-data/New Flyer 40 ft. Electric - Bus #6000-6203 (1).pdf", (err, item) => {
  if (err) console.error("error:", err);
  else if (!item) console.log("Done.");
  else if (item.text) console.log(item.text);
});
