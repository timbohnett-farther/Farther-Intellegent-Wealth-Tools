// FP-Sentinel — Security Scan CLI Runner
// Usage: npx tsx src/lib/sentinel/run-security-scan.ts

import * as fs from 'fs';
import * as path from 'path';
import { runSecurityScan } from './security-scanner';

function collectSourceFiles(
  dir: string,
  extensions: string[],
): Array<{ content: string; fileName: string }> {
  const results: Array<{ content: string; fileName: string }> = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (
          ['node_modules', '.next', '.git', 'dist', 'test-results'].includes(
            entry.name,
          )
        )
          continue;
        walk(fullPath);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          results.push({ content, fileName: fullPath });
        } catch {
          /* skip unreadable files */
        }
      }
    }
  }

  walk(dir);
  return results;
}

const srcDir = path.resolve(__dirname, '../../../');
const sources = collectSourceFiles(srcDir, ['.ts', '.tsx']);

console.log(`\nFP-Sentinel Security Scan`);
console.log(`   Scanning ${sources.length} files...\n`);

const result = runSecurityScan(sources);

console.log(`   Security Score: ${result.score}/100`);
console.log(
  `   Critical: ${result.criticalCount} | Warning: ${result.warningCount} | Info: ${result.infoCount}`,
);

if (result.securityFindings.length > 0) {
  console.log(`\n   Findings:`);
  for (const f of result.securityFindings.slice(0, 20)) {
    console.log(
      `   [${f.severity.toUpperCase()}] ${f.ruleId}: ${f.message}${f.file ? ` (${f.file}:${f.line})` : ''}`,
    );
  }
}

if (result.complianceFindings.length > 0) {
  console.log(`\n   Compliance Findings:`);
  for (const f of result.complianceFindings.slice(0, 10)) {
    console.log(
      `   [${f.regulation}] ${f.ruleId}: ${f.message}${f.file ? ` (${f.file}:${f.line})` : ''}`,
    );
  }
}

if (result.criticalCount > 0) {
  console.log(
    `\n   ${result.criticalCount} critical security issues found.`,
  );
  process.exit(1);
}

console.log(`\n   No critical security issues found.\n`);
