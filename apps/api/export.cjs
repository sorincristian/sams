const rawCatalog = [
  { partNumber: '70446', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'SLIM RED BACK' },
  { partNumber: '70449', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'SLIM RED CUSHION' },
  { partNumber: '70452', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'T2C BLUE BACK' },
  { partNumber: '70730', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'T2C BLUE CUSHION' },
  { partNumber: '71213', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'SLIM RED BACK' },
  { partNumber: '71062', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'SLIM RED BOTTOM' },
  { partNumber: '71065', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'T2C BLUE BACK' },
  { partNumber: '71068', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'T2C BLUE BOTTOM' },
  { partNumber: '63109', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'HIGH BACK RED' },
  { partNumber: '63110', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'HIGH CUSHION RED' },
  { partNumber: '63112', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'HIGH BACK BLUE' },
  { partNumber: '63113', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'HIGH BOTTOM BLUE' },
  { partNumber: '63044', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'GEMINI RED BACK' },
  { partNumber: '63045', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'GEMINI RED BOTTOM' },
  { partNumber: '63056', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'GEMINI BLUE BACK' },
  { partNumber: '63057', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'GEMINI BLUE CUSHION' },
  { partNumber: '63050', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'SLIM RED BACK' },
  { partNumber: '63051', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'SLIM RED CUSHION' },
  { partNumber: '63015', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'T2C BLUE BACK' },
  { partNumber: '63016', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'T2C BLUE BOTTOM' },
  { partNumber: '63052', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'HIGH BACK RED' },
  { partNumber: '63053', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'HIGH CUSHION RED' },
  { partNumber: '63047', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'GEMINI BLUE BACK' },
  { partNumber: '63048', group: 'NOVA 3000 SERIES BUS USSC INSERTS', rawDesc: 'GEMINI BLUE BOTTOM' },
  { partNumber: '22636', group: 'NOVA 8000-9000 SERIES & ORION 7', rawDesc: 'GEMINI RED BACK' },
  { partNumber: '22909', group: 'NOVA 8000-9000 SERIES & ORION 7', rawDesc: 'GEMINI RED CUSHION' },
  { partNumber: '63115', group: 'NOVA 8000-9000 SERIES & ORION 7', rawDesc: 'SLIM BLUE BACK' },
  { partNumber: '63116', group: 'NOVA 8000-9000 SERIES & ORION 7', rawDesc: 'SLIM BLUE BOTTOM' },
  { partNumber: '63142', group: 'NOVA 8000-9000 SERIES & ORION 7', rawDesc: 'T2C RED BACK' },
  { partNumber: '63143', group: 'NOVA 8000-9000 SERIES & ORION 7', rawDesc: 'T2C RED CUSHION' },
  { partNumber: '79283', group: 'PROTERRA', rawDesc: 'HIGH BACK BLUE' },
  { partNumber: '79287', group: 'PROTERRA', rawDesc: 'HIGH BOTTOM BLUE' },
  { partNumber: '79211', group: 'PROTERRA', rawDesc: 'SLIM RED BACK' },
  { partNumber: '79206', group: 'PROTERRA', rawDesc: 'SLIM RED CUSHION' },
  { partNumber: '79208', group: 'PROTERRA', rawDesc: 'T2C BLUE BACK' },
  { partNumber: '79212', group: 'PROTERRA', rawDesc: 'T2C BLUE CUSHION' },
  { partNumber: '42886', group: 'PROTERRA', rawDesc: 'GEMINI RED BACK' },
  { partNumber: '42885', group: 'PROTERRA', rawDesc: 'GEMINI RED BOTTOM' },
  { partNumber: '79629', group: 'BYD Ebus', rawDesc: 'STANDARD BLUE BACK BUY' },
  { partNumber: '79628', group: 'BYD Ebus', rawDesc: 'STANDARD BLUE CUSHION BUY' },
  { partNumber: '79627', group: 'BYD Ebus', rawDesc: 'STANDARD RED BACK CORE' },
  { partNumber: '79626', group: 'BYD Ebus', rawDesc: 'STANDARD RED CUSHION CORE' },
  { partNumber: '79632', group: 'BYD Ebus', rawDesc: 'STANDARD BLUE BACK REBUILT' },
  { partNumber: '79625', group: 'BYD Ebus', rawDesc: 'STANDARD BLUE CUSHION REBUILT' }
];

function parse(item) {
  const desc = item.rawDesc.toUpperCase();
  let pos = 'UNKNOWN';
  if (desc.includes('BACK')) pos = 'BACK';
  else if (desc.includes('CUSHION') || desc.includes('BOTTOM')) pos = 'CUSHION';
  let color = 'UNKNOWN';
  if (desc.includes('RED')) color = 'RED';
  else if (desc.includes('BLUE')) color = 'BLUE';
  let style = 'STANDARD';
  if (desc.includes('SLIM')) style = 'SLIM';
  else if (desc.includes('T2C')) style = 'T2C';
  else if (desc.includes('HIGH')) style = 'HIGH_BACK';
  else if (desc.includes('GEMINI')) style = 'GEMINI';
  
  let bus = '';
  if (item.group.includes('NOVA 3000')) bus = 'NOVA_3000';
  else if (item.group.includes('8000')) bus = 'NOVA_8000_9000 & ORION_7';
  else if (item.group.includes('PROTERRA')) bus = 'PROTERRA';
  else if (item.group.includes('BYD')) bus = 'BYD_EBUS';
  
  let variant = '';
  if (bus === 'BYD_EBUS') {
    if (desc.includes('BUY')) variant = 'BUY';
    else if (desc.includes('CORE')) variant = 'CORE';
    else if (desc.includes('REBUILT')) variant = 'REBUILT';
  }
  
  const tags = [pos, color, style, bus, variant].filter(Boolean);
  const cleanDescription = `${pos} ${color !== 'UNKNOWN' ? color + ' ' : ''}${style} Seat Insert${variant ? ' [' + variant + ']' : ''} - ${bus}`;
  
  return { p: item.partNumber, desc: cleanDescription, pos, color, style, bus, variant, tags, group: item.group };
}

const rows = rawCatalog.map(parse);

const sql = `INSERT INTO "SeatInsertType" ("id", "partNumber", "description", "vendor", "active", "componentType", "trimSpec", "compatibleBusModels", "alternatePartNumbers", "createdAt", "updatedAt")\nVALUES\n` + 
  rows.map(r => `('cuid_${r.p}', '${r.p}', '${r.desc}', 'TTC', true, '${r.pos}', '${r.color} | ${r.style}', ARRAY['${r.bus}'], ARRAY['${r.tags.join("', '")}'], NOW(), NOW())`).join(',\n') + 
  '\nON CONFLICT ("partNumber") DO NOTHING;';

const csv = `partNumber,description,vendor,active,seatPosition,color,seatStyle,busSeries,group,variant,tags\n` + 
  rows.map(r => `"${r.p}","${r.desc}","TTC","true","${r.pos}","${r.color}","${r.style}","${r.bus}","${r.group}","${r.variant}","${r.tags.join(';')}"`).join('\n');

const fs = require('fs');
fs.writeFileSync('out.sql', sql);
fs.writeFileSync('out.csv', csv);
console.log('Done!');
