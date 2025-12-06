const fs = require('fs');
const path = require('path');

function removeComments(code) {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = '';
  let inRegex = false;
  let inTemplate = false;
  
  while (i < code.length) {
    const char = code[i];
    const next = code[i + 1];
    const prev = code[i - 1];
    
    // Handle template literals
    if (char === '`' && prev !== '\\') {
      inTemplate = !inTemplate;
      result += char;
      i++;
      continue;
    }
    
    // Handle strings
    if ((char === '"' || char === "'") && prev !== '\\' && !inTemplate) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
      result += char;
      i++;
      continue;
    }
    
    // If we're in a string or template literal, just copy the character
    if (inString || inTemplate) {
      result += char;
      i++;
      continue;
    }
    
    // Handle single-line comments
    if (char === '/' && next === '/' && !inString && !inTemplate) {
      // Skip until end of line
      while (i < code.length && code[i] !== '\n') {
        i++;
      }
      // Keep the newline
      if (i < code.length && code[i] === '\n') {
        result += '\n';
        i++;
      }
      continue;
    }
    
    // Handle multi-line comments
    if (char === '/' && next === '*' && !inString && !inTemplate) {
      i += 2;
      // Skip until end of comment
      while (i < code.length - 1) {
        if (code[i] === '*' && code[i + 1] === '/') {
          i += 2;
          break;
        }
        // Preserve newlines in multi-line comments to maintain line numbers
        if (code[i] === '\n') {
          result += '\n';
        }
        i++;
      }
      continue;
    }
    
    // Copy regular characters
    result += char;
    i++;
  }
  
  return result;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const cleaned = removeComments(content);
    
    // Remove multiple consecutive blank lines (more than 2)
    const normalized = cleaned.replace(/\n{4,}/g, '\n\n\n');
    
    fs.writeFileSync(filePath, normalized, 'utf8');
    console.log(`✓ Processado: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`✗ Erro em ${filePath}:`, error.message);
    return false;
  }
}

function walkDir(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, dist, build
        if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
          walk(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

// Main execution
const srcDir = path.join(__dirname, 'src');
console.log('🔍 Buscando arquivos...\n');

const files = walkDir(srcDir);
console.log(`📁 Encontrados ${files.length} arquivos\n`);

let processed = 0;
let failed = 0;

for (const file of files) {
  if (processFile(file)) {
    processed++;
  } else {
    failed++;
  }
}

console.log(`\n✅ Concluído!`);
console.log(`   Processados: ${processed}`);
console.log(`   Falhas: ${failed}`);
console.log(`   Total: ${files.length}`);
