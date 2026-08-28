#!/usr/bin/env node
import * as path from 'node:path';
import * as url from 'node:url';
import * as fs from 'node:fs';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Dynamically check if compiled dist is available, or load pure implementation
async function run() {
  console.log('Running WAFLOW Architecture Boundary Verification...\n');

  let analyzeArchitecture;
  let formatArchitectureReport;

  const distPath = path.join(rootDir, 'packages', 'testing', 'dist', 'architecture', 'index.js');
  if (fs.existsSync(distPath)) {
    const mod = await import(url.pathToFileURL(distPath).href);
    analyzeArchitecture = mod.analyzeArchitecture;
    formatArchitectureReport = mod.formatArchitectureReport;
  } else {
    // If running before build, build testing package or use fallback logic
    const { execSync } = await import('node:child_process');
    try {
      execSync('pnpm --filter @waflow/testing build', { cwd: rootDir, stdio: 'inherit' });
      const mod = await import(url.pathToFileURL(distPath).href);
      analyzeArchitecture = mod.analyzeArchitecture;
      formatArchitectureReport = mod.formatArchitectureReport;
    } catch {
      console.error('Failed to compile @waflow/testing before running architecture check.');
      process.exit(1);
    }
  }

  const result = analyzeArchitecture({ monorepoRoot: rootDir });
  console.log(formatArchitectureReport(result));

  if (!result.success) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during architecture validation:', err);
  process.exit(1);
});
