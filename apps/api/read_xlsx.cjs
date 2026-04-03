const xlsx = require('xlsx');
const fs = require('fs');

function find(d) {
  try {
    for(let x of fs.readdirSync(d, {withFileTypes:true})) {
      let p = d + '/' + x.name;
      if(x.isDirectory() && !['node_modules','.git'].includes(x.name)) {
        find(p);
      } else if (x.name.toLowerCase().includes('bus allocation march 24')) {
        const wb = xlsx.readFile(p);
        const ws = wb.Sheets[wb.SheetNames[0]];
        console.log("Found: " + p);
        console.log("Headers: " + JSON.stringify(xlsx.utils.sheet_to_json(ws, {header: 1})[0]));
        process.exit(0);
      }
    }
  } catch(e){}
}
find('c:/SIMS');
