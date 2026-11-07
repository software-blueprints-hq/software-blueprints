#!/usr/bin/env node

/**
 * Automated CLI Scaffolding Verification Test
 * Verifies that the Software Blueprints CLI can correctly inspect, scaffold,
 * and generate production code files without throwing errors.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧪 Starting Software Blueprints Automated CLI Verification Test...\n');

// 1. Verify `bin/cli.js list`
try {
  console.log('▶ Step 1: Testing "cli list" command...');
  const listOutput = execSync('node ./bin/cli.js list', { encoding: 'utf-8' });
  if (!listOutput.includes('AVAILABLE PRODUCTION BLUEPRINTS') || !listOutput.includes('sys-rate-limiter')) {
    throw new Error('CLI list output missing expected blueprints');
  }
  console.log('  ✔ "cli list" passed successfully.\n');
} catch (err) {
  console.error('  ❌ "cli list" failed:', err.message);
  process.exit(1);
}

// 2. Test scaffolding into an isolated temporary directory
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-cli-test-'));
console.log(`▶ Step 2: Testing scaffolding in sandbox: ${tmpDir}`);

const TEST_BLUEPRINTS = [
  'ui-buttons',
  'sys-rate-limiter',
  'fullstack-multi-tenant',
  'backend-java-kafka-dlq',
  'agent-rag-harness'
];

try {
  for (const bpId of TEST_BLUEPRINTS) {
    console.log(`  Scaffolding blueprint "${bpId}"...`);
    // Pass -y or simulate default prompt in target dir
    execSync(`node "${path.resolve('./bin/cli.js')}" add ${bpId} -y`, {
      cwd: tmpDir,
      encoding: 'utf-8',
      env: { ...process.env, CI: 'true' }
    });
  }

  // Verify that files were created recursively
  function getFilesRecursively(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }

  const generatedFiles = getFilesRecursively(tmpDir);
  console.log(`\n  Generated files in sandbox (${generatedFiles.length}):`);
  for (const gf of generatedFiles) {
    const rel = path.relative(tmpDir, gf);
    const size = fs.statSync(gf).size;
    console.log(`   • ${rel} (${size} bytes)`);
  }

  if (generatedFiles.length < TEST_BLUEPRINTS.length) {
    throw new Error(`Expected at least ${TEST_BLUEPRINTS.length} files, but got ${generatedFiles.length}!`);
  }

  // Verify non-zero file sizes
  for (const gf of generatedFiles) {
    const stat = fs.statSync(gf);
    if (stat.size === 0) {
      throw new Error(`Generated file ${path.basename(gf)} is empty!`);
    }
  }

  console.log('\n  ✔ All test blueprints scaffolded with non-zero byte payloads.\n');
} catch (err) {
  console.error('  ❌ Scaffolding verification failed:', err.message);
  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
  process.exit(1);
} finally {
  // Cleanup sandbox
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('🧹 Cleaned up temporary test directory.');
  } catch (e) {
    // ignore
  }
}

console.log('\n✅ Automated Blueprint CLI Verification PASSED 100%!\n');
process.exit(0);
