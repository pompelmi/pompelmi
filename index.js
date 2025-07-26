// index.js (in the root of pompelmi, next to package.json)
"use strict";
// When someone does `import { useFileScanner } from 'pompelmi'` or
// `require('pompelmi')`, Node/Webpack will load this file first,
// and then hand off to your dist bundles:
module.exports = require("./dist/index.cjs.js");
exports.default = module.exports;