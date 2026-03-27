# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased (main)

### Highlights

- Fixed `@pompelmi/fastify-plugin` multipart dependency wiring and removed an unnecessary promise hop.
- Refined the root README layout for faster first-run onboarding and clearer repo entry points.
- Refreshed README badges and demo media so the public repo surface is easier to scan quickly.
- Added verified mention badges to strengthen the top-level trust signals around adoption.
- Tightened onboarding copy across the repo surfaces to make the docs-and-examples path easier to follow.

### Notes

This section summarizes changes since the last tag: `v0.34.8`.
Post-tag activity is currently limited, so the highlights above also surface the most recent user-visible commits from the current `v0.34.x` line for context.
For full details, see GitHub Releases / tag diffs.

## [0.27.1] - 2026-01-26

### Security
- 🔐 **Critical Security Fixes**: Fixed 89 vulnerabilities (6 critical, 36 high, 35 moderate, 12 low)
- 🔐 **Dependency Updates**: Updated 26 package overrides including esbuild, vite, astro, next, body-parser, qs, lodash
- 🔐 **CVE Fixes**: Patched multiple CVEs in dependencies

### Fixed
- 🐛 Fixed GitHub Actions workflow with correct pnpm/action-setup SHA
- 🐛 Resolved CI/CD pipeline execution errors

## [0.27.0] - 2026-01-26

### Added
- 🚀 **Enhanced Performance Monitoring**: Added detailed performance metrics tracking for scan operations
- 🔒 **Advanced Threat Detection**: Improved heuristics engine with better polyglot file detection
- 📊 **Scan Statistics API**: New utility functions to aggregate and analyze scan results
- 🛡️ **Enhanced ZIP Bomb Protection**: Improved nested archive detection with configurable depth limits
- 🔍 **Content Analysis**: Advanced content inspection for embedded scripts and obfuscated code
- 📝 **Better TypeScript Types**: Enhanced type definitions for improved developer experience
- ⚡ **Async Performance**: Optimized async operations for better throughput
- 🎯 **Scan Context Enrichment**: Enhanced metadata collection during file scanning

### Improved
- 🔧 **Error Handling**: More descriptive error messages with actionable suggestions
- 📈 **Memory Efficiency**: Reduced memory footprint for large file operations
- 🚦 **CI/CD Pipeline**: Enhanced GitHub Actions workflows with better caching
- 📚 **Documentation**: Updated examples and API documentation
- 🧪 **Test Coverage**: Added comprehensive test cases for new features

### Fixed
- 🐛 Fixed edge cases in MIME type detection
- 🐛 Resolved memory leaks in stream processing
- 🐛 Corrected verdict mapping for multi-threaded scenarios

### Security
- 🔐 Updated dependencies to patch known vulnerabilities
- 🔐 Enhanced input validation for all public APIs
- 🔐 Improved sanitization for file metadata

## [0.26.0] - 2025-12-15

### Added
- Initial stable release with core scanning functionality
- YARA integration support
- ZIP bomb protection
- Framework adapters (Express, Koa, Fastify, Next.js)
- Browser and Node.js support
