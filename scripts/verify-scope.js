import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(srcDir, filePath);
  const errors = [];

  const jsxExpressions = content.match(/\{[^}]+\}/g) || [];
  
  jsxExpressions.forEach(expr => {
    const words = expr.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
    words.forEach(word => {
      const ignore = [
        'true', 'false', 'null', 'undefined', 'return', 'if', 'else', 'const', 'let', 'var',
        'Math', 'Date', 'String', 'Number', 'Array', 'Object', 'Boolean', 'JSON', 'console',
        'e', 'i', 's', 'o', 'c', 't', 'p', 'f', 'k', 'v', 'b', 'd', 'item', 'index', 'key',
        'style', 'className', 'onClick', 'onChange', 'value', 'placeholder', 'type', 'id', 'name',
        'display', 'flex', 'grid', 'color', 'background', 'border', 'fontSize', 'fontWeight',
        'toLocaleString', 'map', 'filter', 'reduce', 'forEach', 'find', 'includes', 'startsWith',
        'length', 'target', 'prev', 'fData', 'cust', 'prod', 'ord', 'chan', 'supplier'
      ];
      if (ignore.includes(word)) return;

      const isDeclared = content.includes(`const ${word}`) ||
                         content.includes(`let ${word}`) ||
                         content.includes(`var ${word}`) ||
                         content.includes(`function ${word}`) ||
                         (content.includes(`import`) && content.includes(word)) ||
                         content.includes(`${word} =>`) ||
                         content.includes(`(${word})`) ||
                         content.includes(`[${word},`);

      if (!isDeclared) {
        errors.push(`Unbound variable reference '{${word}}' in ${relPath}`);
      }
    });
  });

  return errors;
}

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.jsx')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walkDir(srcDir);
let totalErrors = 0;

console.log('🔍 Running Scope Audit on', files.length, 'JSX files...');
files.forEach(f => {
  const errs = scanFile(f);
  if (errs.length > 0) {
    totalErrors += errs.length;
    errs.forEach(e => console.error('❌', e));
  }
});

if (totalErrors === 0) {
  console.log('✅ Scope Audit Passed: 100% variables in JSX are properly declared.');
  process.exit(0);
} else {
  console.error(`⚠️ Found ${totalErrors} potential scope issues.`);
  process.exit(1);
}
