import fs from 'fs';

const code = fs.readFileSync('src/modules/fleet/import.routes.ts', 'utf8');
const lines = code.split('\\n');
const aliasesLine = lines.findIndex(l => l.includes('const FIELD_ALIASES'));
console.log("Aliases found at line:", aliasesLine);

for (let i = aliasesLine; i < aliasesLine + 20 && i < lines.length; i++) {
    console.log(lines[i]);
}

const resolveLine = lines.findIndex(l => l.includes('function resolveColumnMap'));
console.log("\\nResolve function at line:", resolveLine);
for (let i = resolveLine; i < resolveLine + 30 && i < lines.length; i++) {
    console.log(lines[i]);
}

console.log("\\nAllocation POST found at line:", lines.findIndex(l => l.includes('/import/allocation/preview')));
