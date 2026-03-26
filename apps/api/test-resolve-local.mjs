const FIELD_ALIASES = {
  fleetNumber: ['fleetnumber', 'fleetno', 'busnumber', 'busno', 'vehiclenumber', 'vehicleno', 'bus', 'unit', 'unitnumber', 'vehicle'],
  model: ['model', 'busmodel', 'vehiclemodel'],
  manufacturer: ['manufacturer', 'make', 'brand', 'oem', 'mfg'],
  garage: ['garage', 'garagename', 'garagedepot', 'depot', 'yard', 'facility', 'location', 'base', 'division'],
  status: ['status', 'busstatus', 'vehiclestatus']
};

function normalizeHeader(h) {
  if (!h) return '';
  return String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveColumnMap(rawHeaders, manualMapping, savedMapping) {
  const mapping = {};
  const meta = {};
  const usedHeaders = new Set();

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const manual = manualMapping[field];
    if (manual) {
      const match = rawHeaders.find(h => h.trim().toLowerCase() === manual.trim().toLowerCase());
      if (match) {
        mapping[field] = match;
        meta[field] = { source: 'manual', confidence: 1.0 };
        usedHeaders.add(match);
        continue;
      }
    }

    let bestMatch = null;
    let bestConfidence = 0;
    let bestAlias;

    for (const rawHeader of rawHeaders) {
      if (usedHeaders.has(rawHeader)) continue;
      const normalized = normalizeHeader(rawHeader);

      if (normalized === field.toLowerCase()) {
        bestMatch = rawHeader;
        bestConfidence = 1.0;
        bestAlias = field;
        break;
      }

      for (const alias of aliases) {
        const normalizedAlias = normalizeHeader(alias);
        if (normalized === normalizedAlias) {
          const score = rawHeader.trim().toLowerCase() === alias ? 0.95 : 0.85;
          if (score > bestConfidence) {
            bestMatch = rawHeader;
            bestConfidence = score;
            bestAlias = alias;
          }
          break;
        }
      }
      if (bestConfidence >= 0.95) break;
    }

    mapping[field] = bestMatch;
    if (bestMatch) {
      meta[field] = { source: bestConfidence >= 1.0 ? 'exact' : 'alias', confidence: bestConfidence, matchedAlias: bestAlias };
      usedHeaders.add(bestMatch);
    }
  }
  return { mapping, meta };
}

const rawHeaders = ['Vehicle', 'Location', 'InSrvDate', 'Model', 'Status - Workflow/OOS'];
const result = resolveColumnMap(rawHeaders, {}, null);
console.log(JSON.stringify(result, null, 2));
