// index.js (in the root of local-file-scanner, next to package.json)
"use strict";
// When someone does `import { useFileScanner } from 'local-file-scanner'` or
// `require('local-file-scanner')`, Node/Webpack will load this file first,
// and then hand off to your dist bundles:
module.exports = require("./dist/index.cjs.js");
exports.default = module.exports;