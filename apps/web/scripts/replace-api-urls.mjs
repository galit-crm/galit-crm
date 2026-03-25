import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function patchFile(relPath) {
  const filePath = path.join(root, relPath);
  let s = fs.readFileSync(filePath, 'utf8');
  const before = (s.match(/localhost:3001/g) || []).length;
  // Template literals
  s = s.replace(/`http:\/\/localhost:3001/g, '`${getApiBaseUrl()}');
  // Single-quoted URL strings
  s = s.replace(/'http:\/\/localhost:3001([^']*)'/g, (_, p) => `apiUrl('${p}')`);
  const after = (s.match(/localhost:3001/g) || []).length;
  console.log(relPath, 'localhost:3001:', before, '->', after);
  fs.writeFileSync(filePath, s);
}

patchFile('app/page.tsx');
patchFile('app/customer-import-section.tsx');
patchFile('app/lead-import-section.tsx');
patchFile('app/business-entity-import.tsx');
