# @pompelmi/engine-binaryninja

Binary Ninja HLIL (High-Level Intermediate Language) decompilation engine for Pompelmi file scanner.

This package integrates Binary Ninja's powerful static analysis capabilities with Pompelmi's modular scanning architecture to detect malicious patterns in compiled binaries through decompilation analysis.

## Features

- **HLIL Decompilation**: Extracts high-level intermediate representations from binaries
- **Pattern Detection**: Identifies suspicious API calls, obfuscation techniques, and anti-analysis measures  
- **Configurable Analysis**: Multiple analysis depths from minimal to deep inspection
- **Timeout Protection**: Prevents analysis from hanging on complex binaries
- **Rich Metadata**: Detailed function analysis including complexity metrics

## Prerequisites

- **Binary Ninja License**: Requires Binary Ninja Commercial or Personal license
- **Python Environment**: Binary Ninja Python API must be accessible
- **Node.js**: Version 18 or higher

## Installation

```bash
pnpm add @pompelmi/engine-binaryninja
```

## Quick Start

```typescript
import { createBinaryNinjaScanner } from '@pompelmi/engine-binaryninja';

const scanner = createBinaryNinjaScanner({
  timeout: 30000,        // 30 second timeout
  depth: 'basic',        // Analysis depth
  pythonPath: 'python3', // Path to Python with Binary Ninja
});

// Scan a binary file
const bytes = await fs.readFile('suspicious.exe');
const matches = await scanner.scan(bytes);

// Or get detailed analysis
const result = await scanner.analyze(bytes);
console.log(`Found ${result.functions.length} functions`);
console.log(`Detected ${result.matches.length} suspicious patterns`);
```

## Configuration

### BinaryNinjaOptions

- `timeout` (number): Analysis timeout in milliseconds (default: 30000)
- `depth` ('minimal' | 'basic' | 'deep'): Analysis depth (default: 'basic')  
- `enableHeuristics` (boolean): Enable pattern detection (default: true)
- `pythonPath` (string): Path to Python executable (default: 'python3')
- `binaryNinjaPath` (string): Path to Binary Ninja installation

### Environment Variables

- `BINJA_PATH`: Path to Binary Ninja installation directory
- `PYTHONPATH`: Should include Binary Ninja's Python API path

## Analysis Results

### DecompilationMatch

```typescript
interface DecompilationMatch {
  rule: string;                    // Pattern rule name
  severity: 'low' | 'medium' | 'high' | 'critical';
  engine: 'binaryninja-hlil';     // Engine identifier
  confidence: number;              // 0.0 to 1.0
  meta?: {
    function?: string;             // Function name where pattern found
    address?: string;              // Memory address  
    api_call?: string;            // Suspicious API call
    [key: string]: unknown;
  };
}
```

### FunctionAnalysis

```typescript
interface FunctionAnalysis {
  name: string;                    // Function name
  address: string;                 // Start address
  size: number;                    // Function size in bytes
  complexity?: number;             // Cyclomatic complexity
  callCount?: number;              // Number of function calls
  isObfuscated?: boolean;          // High complexity indicator
  hasAntiAnalysis?: boolean;       // Anti-analysis techniques
  suspiciousCalls?: string[];      // List of suspicious API calls
}
```

## Detected Patterns

The scanner automatically detects:

- **Suspicious API Calls**: Process injection, debugging, anti-analysis functions
- **High Complexity**: Functions with unusual complexity indicating obfuscation
- **Anti-Debugging**: Debug detection and evasion techniques
- **Crypto Constants**: Common cryptographic algorithm signatures

## Integration with Pompelmi

Use with the main Pompelmi scanner:

```typescript
import { composeScanners } from 'pompelmi';
import { createBinaryNinjaScanner } from '@pompelmi/engine-binaryninja';
import { createYaraScanner } from '@pompelmi/engine-yara';

const scanner = composeScanners([
  ['yara', createYaraScanner()],
  ['binja', createBinaryNinjaScanner({ depth: 'basic' })],
]);

const results = await scanner.scan(binaryData);
```

## Performance Considerations

- **CPU Intensive**: Decompilation requires significant computational resources
- **Memory Usage**: Large binaries may consume substantial memory during analysis
- **Timeout Settings**: Adjust timeout based on binary size and system performance
- **Analysis Depth**: Use 'minimal' for fast scanning, 'deep' for thorough analysis

## Troubleshooting

### Binary Ninja Not Found
```
Error: "Binary Ninja Python executable not found"
```
- Ensure Binary Ninja is installed and licensed
- Set `BINJA_PATH` environment variable
- Verify Python can import `binaryninja` module

### Analysis Timeout
```
Error: "Analysis timeout"
```
- Increase timeout value
- Use 'minimal' analysis depth for large binaries
- Consider pre-filtering files by size/type

## License

MIT - See LICENSE file for details.

## Contributing

Contributions welcome! Please see the main Pompelmi repository for guidelines.