#!/usr/bin/env node
/**
 * Synchronize all .json localization files in a directory using en.json as the source.
 *
 * Usage:
 *   node sync.js
 *   node sync.js ./i18n
 *
 * Behavior:
 * - Adds missing keys to other json files with { fallback: <enValue>, value: "", needs_edit: "" }
 * - Removes keys that are not present in en.json
 * - When en.json value changed (compared with other.fallback), does:
 *      other.fallback = <enValue>   (always)
 *      if other.needs_edit is empty AND other.value is non-empty:
 *          other.needs_edit = <fallback>
 *      else:
 *          other.needs_edit remains unchanged
 *   The translation (other.value) is preserved.
 */

const fs = require('fs').promises;
const path = require('path');

async function readJson(filePath) {
  try {
    const txt = await fs.readFile(filePath, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    throw new Error(`Failed to read/parse JSON file "${filePath}": ${err.message}`);
  }
}

async function writeJson(filePath, obj) {
  const txt = JSON.stringify(obj, null, 2) + '\n';
  await fs.writeFile(filePath, txt, 'utf8');
}

function normalizeEntry(entry) {
  // Ensure object has keys: value, fallback, needs_edit
  if (!entry || typeof entry !== 'object') {
    return { value: '', fallback: '', needs_edit: '' };
  }
  return {
    value: typeof entry.value === 'string' ? entry.value : '',
    fallback: typeof entry.fallback === 'string' ? entry.fallback : '',
    needs_edit: typeof entry.needs_edit === 'string' ? entry.needs_edit : ''
  };
}

async function syncDir(dirPath) {
  const enFilename = 'en.json';
  const enPath = path.join(dirPath, enFilename);

  // load en.json
  let enData;
  try {
    enData = await readJson(enPath);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // normalize enData: support { key: { value: "..." } } or { key: "..." }
  const enKeys = Object.keys(enData);
  const enNormalized = {};
  for (const k of enKeys) {
    const entry = enData[k];
    // support en.json entries that follow the same object shape { value, fallback, needs_edit }
    if (entry && typeof entry === 'object' && typeof entry.value === 'string') {
      enNormalized[k] = { value: entry.value };
    } else if (typeof entry === 'string') {
      // in case en.json is simply {"key": "Text"} support that
      enNormalized[k] = { value: entry };
    } else {
      // fallback to empty string if malformed
      enNormalized[k] = { value: '' };
    }
  }

  // list json files
  const files = await fs.readdir(dirPath);
  const jsonFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('menu.json'));

  for (const file of jsonFiles) {
    if (file === enFilename) continue; // skip source

    const filePath = path.join(dirPath, file);
    console.log(`\nProcessing ${file}...`);

    let otherDataRaw;
    try {
      otherDataRaw = await readJson(filePath);
    } catch (err) {
      console.error(`  Skipping ${file}: ${err.message}`);
      continue;
    }

    // normalize otherData so each key maps to an object with value,fallback,needs_edit
    const otherData = {};
    for (const [k, v] of Object.entries(otherDataRaw)) {
      otherData[k] = normalizeEntry(v);
    }

    // prepare new object in the order of en.json keys (keeps files consistent)
    const newOther = {};
    const changes = { added: [], removed: [], updated: [] };

    // Add or update keys from en.json
    for (const k of Object.keys(enNormalized)) {
      const enValue = enNormalized[k].value;

      if (!Object.prototype.hasOwnProperty.call(otherData, k)) {
        // missing -> add with fallback set to en value (so translator sees the english)
        newOther[k] = {
          value: '',
          fallback: enValue,
          needs_edit: ''
        };
        changes.added.push(k);
      } else {
        // exists -> check if english changed
        const existing = otherData[k];
        // If existing.fallback differs from enValue, treat that as an edited English source.
        if (existing.fallback !== enValue) {
          // origFallback should be the previous fallback if present, otherwise attempt to use needs_edit.
          const origFallback = existing.fallback || existing.needs_edit || '';

          // Determine new needs_edit according to the rule:
          // set to origFallback ONLY IF needs_edit is empty AND value is non-empty, otherwise leave needs_edit unchanged.
          const shouldSetNeedsEdit = (existing.needs_edit === '' && existing.value !== '');
          const newNeedsEdit = shouldSetNeedsEdit ? origFallback : existing.needs_edit;

          newOther[k] = {
            value: existing.value || '',    // keep translation
            fallback: enValue,              // new English
            needs_edit: newNeedsEdit          // set to origFallback (so translators can see what changed)
          };
          changes.updated.push(k);
        } else {
          // fallback equals enValue -> no english change. Keep existing fields (preserve needs_edit if present? we will clear if it's stale)
          // If fallback matches enValue and needs_edit equals fallback, it's stale — clear it.
          const needsEdit = (existing.needs_edit && existing.needs_edit === existing.fallback) ? '' : existing.needs_edit;
          newOther[k] = {
            value: existing.value,
            fallback: existing.fallback,
            needs_edit: needsEdit || ''
          };
          // no change logged
        }
      }
    }

    // Detect keys that existed in other but were removed from en.json; these should be deleted.
    for (const k of Object.keys(otherData)) {
      if (!Object.prototype.hasOwnProperty.call(enNormalized, k)) {
        changes.removed.push(k);
      }
    }

    // write new file
    try {
      if (!(changes.added.length === 0 && changes.removed.length === 0 && changes.updated.length === 0)) {
        await writeJson(filePath, newOther);
        console.log(`  Updated ${file}: +${changes.added.length} added, -${changes.removed.length} removed, ~${changes.updated.length} updated`);
        if (changes.added.length) console.log(`    added: ${changes.added.join(', ')}`);
        if (changes.removed.length) console.log(`    removed: ${changes.removed.join(', ')}`);
        if (changes.updated.length) console.log(`    updated: ${changes.updated.join(', ')}`);
      } else {
        console.log(`  No changes`);
      }
    } catch (err) {
      console.error(`  Failed to write ${file}: ${err.message}`);
    }
  }

  console.log('\nSync complete.');
}

const dirPath = undefined !== process.argv[2] ?
  path.resolve(process.argv[2]) :
  path.resolve(__dirname);

syncDir(dirPath).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
