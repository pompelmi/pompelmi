#!/usr/bin/env node
(() => {
  const known = new Set(['scan','watch','scan:dir','-h','--help','-v','--version']);
  const argv = process.argv.slice(2).map(a => a==='--quietClean' ? '--quiet-clean' : a);
  const first = argv[0];
  if (first && !first.startsWith('-') && !known.has(first)) {
    process.argv = [process.argv[0], process.argv[1], 'scan', ...argv];
  } else {
    process.argv = [process.argv[0], process.argv[1], ...argv];
  }
})();
import('../dist/index.mjs');
