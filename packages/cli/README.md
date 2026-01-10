# @pompelmi/cli

🛡️ **Standalone CLI for CI/CD malware scanning** with `pompelmi`.

## Features

- ✅ **Recursive directory scanning** - Scan entire project directories
- ✅ **Multiple output formats** - Table, JSON, or CI/CD-friendly summary
- ✅ **CI/CD integration** - Exit codes and machine-readable output
- ✅ **File filtering** - Filter by extensions and file size
- ✅ **Stream-based scanning** - Memory-efficient for large files
- ✅ **Watch mode** - Real-time scanning during development
- ✅ **Smart exclusions** - Skips `node_modules`, dotfiles, and common build artifacts

## Installation

```bash
# Global installation
npm install -g @pompelmi/cli

# Or use directly with npx
npx @pompelmi/cli scan ./src
```

## Usage

### Basic Scan

```bash
# Scan a single file
pompelmi scan ./file.txt

# Scan a directory
pompelmi scan ./src

# Scan recursively
pompelmi scan ./src --recursive
```

### Output Formats

```bash
# Human-readable table (default)
pompelmi scan ./src --format table

# JSON output for CI/CD
pompelmi scan ./src --format json

# Shell-friendly key=value format
pompelmi scan ./src --format summary
```

### CI/CD Integration

```bash
# Exit with code 1 if any malicious files found
pompelmi scan ./src --fail-on malicious

# Exit on any suspicious content
pompelmi scan ./src --fail-on suspicious

# Exit on any detection (malicious or suspicious)
pompelmi scan ./src --fail-on any
```

**Example GitHub Actions workflow:**

```yaml
name: Security Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Scan for malware
        run: npx @pompelmi/cli scan . --recursive --format json --fail-on malicious
      
      - name: Upload scan results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: scan-results
          path: scan-results.json
```

### File Filtering

```bash
# Only scan specific extensions
pompelmi scan ./src --ext .js --ext .ts --ext .jsx --ext .tsx

# Limit file size (in MB)
pompelmi scan ./uploads --max-size 10

# Combine filters
pompelmi scan ./src --recursive --ext .js --ext .ts --max-size 5
```

### Watch Mode

```bash
# Watch directory for changes (useful during development)
pompelmi watch ./src

# Watch with custom debounce delay (ms)
pompelmi watch ./src --delay 500

# Watch and only show threats
pompelmi watch ./src --quiet
```

### Stream Scanner

```bash
# Force stream-based scanning for all files
pompelmi scan ./uploads --stream

# Stream scanner is automatically used for files > 1MB
```

## CLI Options

### `scan <directory>` Command

| Option | Description | Default |
|--------|-------------|---------|
| `--recursive, -r` | Scan directories recursively | `false` |
| `--format, -f <type>` | Output format: `table`, `json`, `summary` | `table` |
| `--ext <extension>` | File extensions to scan (can be repeated) | All files |
| `--max-size <mb>` | Maximum file size in MB | `10` |
| `--fail-on <level>` | Exit code policy: `malicious`, `suspicious`, `any`, `never` | `malicious` |
| `--quiet, -q` | Only show files with threats | `false` |
| `--stream` | Force stream-based scanning | Auto for files >1MB |

### `watch <directory>` Command

| Option | Description | Default |
|--------|-------------|---------|
| `--recursive, -r` | Watch directories recursively | `true` |
| `--delay <ms>` | Debounce delay in milliseconds | `300` |
| `--quiet, -q` | Only show files with threats | `false` |
| `--ext <extension>` | File extensions to watch (can be repeated) | All files |

## Output Formats

### Table Format (Default)

```
┌──────────────────────────────────────┬──────────┬─────────┬──────────┬────────────────┐
│ File Path                            │ Status   │ Size    │ Time     │ Reason         │
├──────────────────────────────────────┼──────────┼─────────┼──────────┼────────────────┤
│ /path/to/malware.exe                 │ ✗ Threat │ 2.05 kB │ 15.00 ms │ EICAR detected │
│ /path/to/clean.txt                   │ ✓ Clean  │ 1.00 kB │ 10.00 ms │                │
└──────────────────────────────────────┴──────────┴─────────┴──────────┴────────────────┘

Total Files: 2 | Clean: 1 | Threats: 1
```

### JSON Format

```json
{
  "summary": {
    "totalFiles": 2,
    "cleanFiles": 1,
    "threatsFound": 1,
    "scanTime": 25
  },
  "results": [
    {
      "filePath": "/path/to/malware.exe",
      "clean": false,
      "fileSize": 2048,
      "scanTime": 15,
      "reason": "EICAR test file detected"
    },
    {
      "filePath": "/path/to/clean.txt",
      "clean": true,
      "fileSize": 1024,
      "scanTime": 10
    }
  ]
}
```

### Summary Format (CI/CD)

```bash
TOTAL_FILES=2
CLEAN_FILES=1
THREATS_FOUND=1
HAS_THREATS=true
THREAT_FILES=/path/to/malware.exe
TOTAL_SCAN_TIME_MS=25
```

**Use in shell scripts:**

```bash
#!/bin/bash
eval $(pompelmi scan ./src --format summary)

if [ "$HAS_THREATS" = "true" ]; then
  echo "⚠️  Threats found: $THREATS_FOUND"
  echo "Files: $THREAT_FILES"
  exit 1
fi

echo "✓ All files clean ($CLEAN_FILES files scanned)"
```

## Exit Codes

The CLI uses standard exit codes for CI/CD integration:

- **`0`** - Success (no threats found or ignored based on `--fail-on`)
- **`1`** - Threats detected (based on `--fail-on` policy)
- **`2`** - Error (invalid arguments, file not found, etc.)

### `--fail-on` Policy

| Policy | Exits on Malicious | Exits on Suspicious | Use Case |
|--------|-------------------|---------------------|----------|
| `malicious` (default) | ✓ | ✗ | Production CI/CD |
| `suspicious` | ✓ | ✓ | Strict security policy |
| `any` | ✓ | ✓ | Maximum security |
| `never` | ✗ | ✗ | Reporting only |

## Smart Exclusions

The CLI automatically skips:

- **Dotfiles** - `.env`, `.gitignore`, etc.
- **Build artifacts** - `dist/`, `build/`, `.next/`, etc.
- **Dependencies** - `node_modules/`, `vendor/`, etc.
- **Version control** - `.git/`, `.svn/`, etc.
- **OS files** - `.DS_Store`, `Thumbs.db`, etc.

## Examples

### Example 1: Basic Project Scan

```bash
# Scan entire project
pompelmi scan . --recursive --ext .js --ext .ts

# Output:
# ✓ Clean: 145 files scanned, 0 threats found
```

### Example 2: CI/CD Pipeline

```bash
#!/bin/bash
# scan-before-deploy.sh

echo "🔍 Scanning for malware..."
pompelmi scan ./dist --recursive --format json --fail-on malicious > scan-results.json

if [ $? -ne 0 ]; then
  echo "❌ Malware detected! Deployment blocked."
  cat scan-results.json
  exit 1
fi

echo "✅ Security scan passed. Proceeding with deployment."
```

### Example 3: Upload Directory Monitoring

```bash
# Watch uploads directory in real-time
pompelmi watch ./public/uploads --quiet

# Output (when malware uploaded):
# [2024-01-15 10:30:45] ✗ /public/uploads/malware.exe - EICAR detected
```

### Example 4: Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Scan staged files
git diff --cached --name-only --diff-filter=ACM | \
  grep -E '\.(js|ts|jsx|tsx|php)$' | \
  xargs pompelmi scan --fail-on suspicious --quiet

if [ $? -ne 0 ]; then
  echo "❌ Malware detected in staged files. Commit blocked."
  exit 1
fi
```

## Integration with @pompelmi/core

The CLI uses the stream-based scanner from `@pompelmi/core`:

```typescript
import { createReadStream } from 'node:fs';
import { scanStream } from '@pompelmi/core';

// CLI automatically uses stream scanner for files > 1MB
const stream = createReadStream('./large-file.bin');
const result = await scanStream(stream, {
  maxBufferSize: 10 * 1024 * 1024, // 10MB
});
```

## Performance

- **Small files** (<1MB): Direct buffer scanning (~1-5ms per file)
- **Large files** (>1MB): Stream-based scanning (~10-50ms per file, constant memory)
- **Directory scanning**: Parallel processing with configurable concurrency

**Benchmark example:**

```bash
# Scan 1000 files (500MB total)
pompelmi scan ./large-dataset --recursive

# Results:
# Total Files: 1000
# Clean: 998 | Threats: 2
# Total Time: 12.5s
# Memory Usage: ~25MB (constant)
```

## Troubleshooting

### Issue: CLI not found after global install

```bash
# Ensure npm global bin is in PATH
npm config get prefix
export PATH="$(npm config get prefix)/bin:$PATH"
```

### Issue: Permission denied

```bash
# Make CLI executable
chmod +x /path/to/node_modules/@pompelmi/cli/bin/pompelmi.mjs
```

### Issue: Large files causing timeout

```bash
# Increase max file size or skip large files
pompelmi scan . --max-size 50  # 50MB limit
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup.

## License

MIT - see [LICENSE](../../LICENSE)

---

**Part of the [pompelmi](https://github.com/pompelmi/pompelmi) security toolkit** 🛡️
