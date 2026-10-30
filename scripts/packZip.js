import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const zipPath = path.join(rootDir, 'learning-web-updated.zip');
const zip = new AdmZip();

const excludeList = [
  'node_modules',
  '.git',
  'dist',
  'learning-web-updated.zip',
  'package-lock.json.bak'
];

function shouldExclude(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  for (const exc of excludeList) {
    if (normalized === exc || normalized.startsWith(exc + '/')) {
      return true;
    }
  }
  // Exclude database binary files and backups
  if (normalized.startsWith('server/data/') && (normalized.endsWith('.db') || normalized.endsWith('.db-wal') || normalized.endsWith('.db-shm'))) {
    return true;
  }
  if (normalized.startsWith('server/data/backups/')) {
    return true;
  }
  if (normalized.startsWith('server/uploads/') && !normalized.endsWith('.gitkeep')) {
    return true;
  }
  return false;
}

function addDirectory(currentDir, relativeBase = '') {
  const items = fs.readdirSync(currentDir);
  for (const item of items) {
    const fullPath = path.join(currentDir, item);
    const relPath = relativeBase ? `${relativeBase}/${item}` : item;

    if (shouldExclude(relPath)) {
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addDirectory(fullPath, relPath);
    } else {
      const content = fs.readFileSync(fullPath);
      zip.addFile(relPath, content);
    }
  }
}

console.log('Packaging learning-web-updated.zip...');
addDirectory(rootDir);
zip.writeZip(zipPath);
console.log(`Successfully generated ${zipPath} (${(fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2)} MB)`);
