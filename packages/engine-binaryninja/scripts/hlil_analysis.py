#!/usr/bin/env python3
"""
Binary Ninja HLIL Analysis Script
Used by @pompelmi/engine-binaryninja to analyze binary files
"""

import sys
import json
import time
import os
from pathlib import Path

try:
    import binaryninja as binja
except ImportError:
    print(json.dumps({"error": "Binary Ninja not available", "success": False}))
    sys.exit(1)

def analyze_hlil_function(func):
    """Analyze a single function's HLIL representation"""
    try:
        hlil = func.hlil
        if not hlil:
            return None
            
        instructions = []
        suspicious_calls = []
        
        for block in hlil.basic_blocks:
            for instr in block:
                # Convert instruction to serializable format
                instr_data = {
                    "operation": str(instr.operation),
                    "address": hex(instr.address),
                    "vars": [str(var) for var in instr.vars] if hasattr(instr, 'vars') else []
                }
                
                # Check for suspicious API calls
                if hasattr(instr, 'constant') and instr.constant:
                    # Look for function calls
                    if 'call' in str(instr.operation).lower():
                        call_target = str(instr)
                        if any(suspicious in call_target.lower() for suspicious in 
                              ['createremotethread', 'writeprocessmemory', 'virtualallocex', 
                               'isdebuggerpresent', 'outputdebugstring']):
                            suspicious_calls.append(call_target)
                
                instructions.append(instr_data)
        
        # Calculate complexity metrics
        complexity = len(hlil.basic_blocks) * len(instructions) if instructions else 0
        
        return {
            "name": func.name,
            "address": hex(func.start),
            "size": len(func),
            "complexity": min(complexity, 1000),  # Cap at reasonable value
            "callCount": len([i for i in instructions if 'call' in i.get('operation', '').lower()]),
            "suspiciousCalls": suspicious_calls,
            "instructions": instructions[:50]  # Limit to first 50 instructions
        }
        
    except Exception as e:
        return {
            "name": func.name,
            "address": hex(func.start),
            "error": str(e)
        }

def detect_suspicious_patterns(functions):
    """Detect suspicious patterns across all functions"""
    matches = []
    
    for func in functions:
        if 'error' in func:
            continue
            
        # Pattern detection
        suspicious_calls = func.get('suspiciousCalls', [])
        if suspicious_calls:
            for call in suspicious_calls:
                severity = 'high' if any(x in call.lower() for x in 
                                       ['createremotethread', 'writeprocessmemory']) else 'medium'
                matches.append({
                    "rule": f"suspicious_api_{call.lower().split('(')[0]}",
                    "severity": severity,
                    "engine": "binaryninja-hlil",
                    "confidence": 0.8,
                    "meta": {
                        "function": func['name'],
                        "address": func['address'],
                        "api_call": call
                    }
                })
        
        # High complexity detection
        if func.get('complexity', 0) > 500:
            matches.append({
                "rule": "high_complexity_function",
                "severity": "medium",
                "engine": "binaryninja-hlil",
                "confidence": 0.6,
                "meta": {
                    "function": func['name'],
                    "address": func['address'],
                    "complexity": func['complexity']
                }
            })
            
        # Anti-debugging detection
        if any('debug' in call.lower() for call in func.get('suspiciousCalls', [])):
            matches.append({
                "rule": "anti_debug_technique",
                "severity": "medium",
                "engine": "binaryninja-hlil",
                "confidence": 0.7,
                "meta": {
                    "function": func['name'],
                    "address": func['address']
                }
            })
    
    return matches

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: hlil_analysis.py <binary_path> <timeout_seconds>", "success": False}))
        sys.exit(1)
    
    binary_path = sys.argv[1]
    timeout = int(sys.argv[2])
    
    start_time = time.time()
    
    try:
        # Open binary with Binary Ninja
        bv = binja.open_view(binary_path)
        if not bv:
            print(json.dumps({"error": "Failed to open binary", "success": False}))
            sys.exit(1)
        
        # Wait for analysis to complete (with timeout)
        analysis_start = time.time()
        while not bv.analysis_progress.state == binja.AnalysisState.IdleState:
            if time.time() - analysis_start > timeout:
                print(json.dumps({"error": "Analysis timeout", "success": False}))
                sys.exit(1)
            time.sleep(0.1)
        
        # Analyze functions
        functions = []
        for func in bv.functions[:20]:  # Limit to first 20 functions
            if time.time() - start_time > timeout:
                break
                
            func_analysis = analyze_hlil_function(func)
            if func_analysis:
                functions.append(func_analysis)
        
        # Detect suspicious patterns
        matches = detect_suspicious_patterns(functions)
        
        result = {
            "success": True,
            "engine": "binaryninja-hlil",
            "functions": functions,
            "matches": matches,
            "meta": {
                "analysisTime": time.time() - start_time,
                "binaryFormat": bv.platform.name if bv.platform else "unknown",
                "architecture": bv.arch.name if bv.arch else "unknown",
                "functionCount": len(bv.functions)
            }
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)

if __name__ == "__main__":
    main()