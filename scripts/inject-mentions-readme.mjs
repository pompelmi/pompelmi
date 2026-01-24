#!/usr/bin/env node

/**
 * Inject MENTIONS.md into README.md between markers
 * 
 * Usage:
 *   node scripts/inject-mentions-readme.mjs
 * 
 * Reads: mentions/MENTIONS.md
 * Updates: README.md (between <!-- MENTIONS:START --> and <!-- MENTIONS:END -->)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const MENTIONS_FILE = join(ROOT, 'mentions', 'MENTIONS.md');
const README_FILE = join(ROOT, 'README.md');

const START_MARKER = '<!-- MENTIONS:START -->';
const END_MARKER = '<!-- MENTIONS:END -->';

/**
 * Main function
 */
async function main() {
  console.log('💉 Injecting mentions into README.md...\n');
  
  try {
    // Read mentions markdown
    const mentionsContent = await readFile(MENTIONS_FILE, 'utf-8');
    console.log(`📄 Loaded mentions from ${MENTIONS_FILE}`);
    
    // Read README
    let readmeContent = await readFile(README_FILE, 'utf-8');
    console.log(`📄 Loaded README from ${README_FILE}`);
    
    // Check if markers exist
    const hasStartMarker = readmeContent.includes(START_MARKER);
    const hasEndMarker = readmeContent.includes(END_MARKER);
    
    if (!hasStartMarker || !hasEndMarker) {
      console.error(`❌ Markers not found in README.md`);
      console.error(`   Expected: ${START_MARKER} and ${END_MARKER}`);
      console.error('💡 Add these markers to README.md where you want mentions to appear');
      process.exit(1);
    }
    
    // Find marker positions
    const startIdx = readmeContent.indexOf(START_MARKER);
    const endIdx = readmeContent.indexOf(END_MARKER);
    
    if (startIdx >= endIdx) {
      console.error('❌ Invalid marker order: START must come before END');
      process.exit(1);
    }
    
    // Build new content
    const before = readmeContent.substring(0, startIdx + START_MARKER.length);
    const after = readmeContent.substring(endIdx);
    
    const newReadme = `${before}\n\n${mentionsContent}\n${after}`;
    
    // Write updated README
    await writeFile(README_FILE, newReadme, 'utf-8');
    
    console.log('✅ Successfully injected mentions into README.md');
    console.log('🎉 Done! Check your README.md to see the updated mentions section.');
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (error.path?.includes('MENTIONS.md')) {
        console.error(`❌ File not found: ${MENTIONS_FILE}`);
        console.error('💡 Run "npm run mentions:render" first to generate MENTIONS.md');
      } else {
        console.error(`❌ File not found: ${error.path}`);
      }
      process.exit(1);
    }
    throw error;
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
