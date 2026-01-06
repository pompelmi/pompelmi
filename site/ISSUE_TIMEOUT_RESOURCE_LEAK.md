# Critical Resource Leak in Timeout Handling for Next.js Upload Handler

## Executive Summary

A critical resource leak vulnerability exists in the `@pompelmi/next-upload` package's timeout handling mechanism. When file scanning operations exceed their configured timeout, the underlying scanner promises continue executing in the background indefinitely, leading to progressive resource exhaustion, memory leaks, and potential denial-of-service conditions under sustained load.

## Severity

**Severity:** High  
**Impact:** Resource Exhaustion, Memory Leaks, Potential DoS  
**Affected Component:** `packages/next-upload/src/index.ts`  
**Affected Functions:** `scanZipBuffer()` (lines 163-171) and `scanWithTimeout()` (lines 221-226)

## Technical Description

### Root Cause

The timeout implementation in the Next.js upload handler utilizes `Promise.race()` to enforce time limits on scanner operations. When the timeout promise resolves first (indicating a timeout condition), the code throws an error and returns control to the caller. However, the losing promise—the actual scanner operation—continues executing in the background without any mechanism for cancellation or cleanup.

### Affected Code Paths

#### 1. ZIP Archive Entry Scanning (`scanZipBuffer`)

**Location:** `packages/next-upload/src/index.ts:165-168`

```typescript
const matches = await Promise.race([
  opts.scanner.scan(new Uint8Array(entryBytes)),
  (async () => { await delay(timeoutMs); throw new Error('scan_timeout'); })()
]) as YaraMatch[];
```

**Problem:** When scanning entries within ZIP archives, if a timeout occurs, the `scanner.scan()` promise continues running even after the timeout error is thrown. For archives with many entries, this can result in dozens or hundreds of orphaned scanner promises.

#### 2. Flat File Scanning (`scanWithTimeout`)

**Location:** `packages/next-upload/src/index.ts:221-226`

```typescript
async function scanWithTimeout(scanFn: () => Promise<YaraMatch[]>, ms: number) {
  return Promise.race([
    scanFn(),
    (async () => { await delay(ms); throw new Error('scan_timeout'); })()
  ]) as Promise<YaraMatch[]>;
}
```

**Problem:** Similar to the ZIP scanning path, when timeouts occur during flat file scanning, the scanner promise continues executing in the background.

### Resource Leak Characteristics

1. **Memory Leaks:**
   - Scanner promises hold references to file buffers (`Uint8Array` instances)
   - Large files (e.g., 20MB+ entries) remain in memory until the promise resolves
   - Under timeout conditions, these buffers are never released promptly

2. **CPU Resource Consumption:**
   - Background scanner operations continue consuming CPU cycles
   - YARA rule matching, heuristic analysis, and other CPU-intensive operations proceed unabated
   - No mechanism exists to interrupt or cancel these operations

3. **Semaphore Slot Management:**
   - While the semaphore is correctly released in the `finally` block, the underlying scanner operation continues
   - This creates a discrepancy between actual resource usage and semaphore accounting
   - Under high concurrency, this can lead to resource contention issues

4. **Unhandled Promise Rejections:**
   - If a scanner promise eventually rejects after a timeout has already been thrown, it may result in unhandled promise rejections
   - This can cause application crashes in Node.js environments with strict unhandled rejection handling

## Impact Analysis

### Production Scenarios

#### Scenario 1: Sustained High Load with Timeouts

**Conditions:**
- Multiple concurrent file uploads
- Scanner operations frequently exceeding timeout thresholds (e.g., due to large files or complex YARA rules)
- Timeout configured at 5 seconds (default)

**Impact:**
- Each timeout creates an orphaned scanner promise
- Memory usage grows linearly with the number of timed-out operations
- CPU utilization remains elevated due to background scanner execution
- Application performance degrades over time

#### Scenario 2: ZIP Bomb with Timeout Protection

**Conditions:**
- Malicious ZIP archive containing thousands of entries
- Each entry triggers a scanner operation
- Timeout protection activates for slow entries

**Impact:**
- Hundreds of scanner promises continue executing after timeouts
- Memory consumption spikes dramatically
- System may become unresponsive or crash
- The timeout protection mechanism, intended to prevent resource exhaustion, paradoxically contributes to it

#### Scenario 3: Memory Exhaustion

**Conditions:**
- Application running in memory-constrained environments (containers, serverless functions)
- Multiple upload requests with timeout conditions

**Impact:**
- Progressive memory exhaustion
- Potential out-of-memory (OOM) kills
- Service unavailability
- Cascading failures in distributed systems

### Business Impact

1. **Service Availability:**
   - Degraded performance under load
   - Potential service outages
   - Increased error rates

2. **Cost Implications:**
   - Higher infrastructure costs due to increased resource consumption
   - Potential need for over-provisioning to compensate for leaks

3. **Security Posture:**
   - Resource exhaustion can be exploited for denial-of-service attacks
   - Attackers can craft payloads designed to trigger timeouts repeatedly

4. **Compliance and Reliability:**
   - Violations of service level agreements (SLAs)
   - Potential issues with uptime guarantees
   - Audit findings related to resource management

## Reproduction Steps

### Prerequisites

- Node.js 18+ environment
- `@pompelmi/next-upload` package installed
- Access to monitoring tools (memory, CPU)

### Test Case 1: Memory Leak Demonstration

```typescript
// test-timeout-leak.ts
import { createNextUploadHandler } from '@pompelmi/next-upload';

// Create handler with aggressive timeout
const handler = createNextUploadHandler({
  scanner: {
    async scan(bytes: Uint8Array) {
      // Simulate slow scanner that always times out
      await new Promise(resolve => setTimeout(resolve, 10000));
      return [];
    }
  },
  timeoutMs: 1000, // 1 second timeout
  concurrency: 10
});

// Simulate 100 upload requests
for (let i = 0; i < 100; i++) {
  const formData = new FormData();
  const file = new File([new Uint8Array(10 * 1024 * 1024)], 'test.bin');
  formData.append('file', file);
  
  const request = new Request('http://localhost', {
    method: 'POST',
    body: formData
  });
  
  handler(request).catch(() => {
    // Timeout errors expected
  });
}

// Monitor memory usage - should see progressive increase
```

**Expected Behavior:** Memory usage should stabilize after timeouts  
**Actual Behavior:** Memory usage continues to grow as scanner promises accumulate

### Test Case 2: ZIP Archive with Multiple Entries

```typescript
// Create ZIP with 50 entries, each triggering timeout
const zipBuffer = createTestZip(50, { size: 5 * 1024 * 1024 });

const formData = new FormData();
const file = new File([zipBuffer], 'test.zip');
formData.append('file', file);

const request = new Request('http://localhost', {
  method: 'POST',
  body: formData
});

await handler(request);
```

**Expected Behavior:** All scanner operations should be cancelled after timeout  
**Actual Behavior:** 50 scanner promises continue executing in background

### Test Case 3: Monitoring Resource Usage

```bash
# Monitor Node.js process
node --expose-gc test-timeout-leak.js

# In another terminal, monitor memory
watch -n 1 'ps aux | grep node | awk "{print \$6/1024 \" MB\"}"'

# Observe memory growth even after timeouts
```

## Affected Versions

- All versions of `@pompelmi/next-upload` that implement timeout handling via `Promise.race()`
- This issue may also affect other adapters (`@pompelmi/express-middleware`, `@pompelmi/koa-middleware`) if they use similar timeout patterns

## Detection and Monitoring

### Indicators of the Issue

1. **Memory Metrics:**
   - Progressive increase in heap memory usage
   - Memory not being released after timeout events
   - GC (garbage collection) frequency increases but memory doesn't decrease

2. **CPU Metrics:**
   - Sustained CPU usage even during "idle" periods
   - CPU spikes corresponding to timeout events

3. **Application Metrics:**
   - Increasing response times over time
   - Timeout error rates increasing
   - Application restarts due to OOM kills

4. **Log Analysis:**
   - Multiple `scan_timeout` errors in logs
   - Correlation between timeout events and resource usage spikes

### Monitoring Recommendations

1. **Memory Monitoring:**
   ```typescript
   setInterval(() => {
     const usage = process.memoryUsage();
     console.log({
       heapUsed: usage.heapUsed / 1024 / 1024,
       heapTotal: usage.heapTotal / 1024 / 1024,
       rss: usage.rss / 1024 / 1024
     });
   }, 5000);
   ```

2. **Promise Tracking:**
   - Monitor unhandled promise rejections
   - Track active promise counts
   - Alert on promise rejection rates

3. **Timeout Rate Monitoring:**
   - Track timeout frequency
   - Correlate timeouts with resource usage
   - Set alerts for timeout rate thresholds

## Workarounds

### Temporary Mitigations

1. **Increase Timeout Values:**
   - Reduce timeout frequency by increasing `timeoutMs`
   - Trade-off: Slower failure detection, but fewer leaks
   - **Not Recommended:** This masks the issue rather than fixing it

2. **Reduce Concurrency:**
   - Lower `concurrency` setting to limit parallel operations
   - Trade-off: Reduced throughput
   - **Not Recommended:** Impacts legitimate use cases

3. **Process Restarts:**
   - Implement periodic process restarts to clear accumulated resources
   - Trade-off: Service interruptions
   - **Not Recommended:** Poor user experience

4. **Memory Limits:**
   - Set strict memory limits and restart on OOM
   - Trade-off: Unpredictable service availability
   - **Not Recommended:** Unreliable service

### Recommended Approach

**None of the above workarounds address the root cause.** The issue requires a proper fix at the code level to ensure scanner promises are properly handled when timeouts occur.

## Additional Considerations

### Related Issues

1. **Error Handling:**
   - Unhandled promise rejections from orphaned scanner promises
   - Potential application crashes in strict error handling modes

2. **Observability:**
   - Difficult to track orphaned promises
   - Metrics may not accurately reflect actual resource usage

3. **Testing:**
   - Timeout scenarios may not be adequately tested
   - Resource leak detection in test suites

### Security Implications

1. **Denial of Service:**
   - Attackers can craft payloads to trigger repeated timeouts
   - Resource exhaustion attacks become more effective

2. **Resource Exhaustion:**
   - Memory exhaustion can lead to service unavailability
   - CPU exhaustion can degrade service performance

## Recommendations

1. **Immediate Action:**
   - Review timeout handling implementation across all adapters
   - Implement proper promise cancellation or cleanup mechanisms
   - Add comprehensive timeout scenario testing

2. **Long-term Improvements:**
   - Consider implementing `AbortController` support for cancellable operations
   - Add resource usage monitoring and alerting
   - Implement circuit breakers for timeout scenarios

3. **Testing:**
   - Add integration tests for timeout scenarios
   - Implement memory leak detection in CI/CD pipelines
   - Load testing with timeout conditions

## References

- Node.js Promise Best Practices: https://nodejs.org/api/process.html#process_event_unhandledrejection
- Memory Leak Detection: https://nodejs.org/api/cli.html#--max-old-space-sizesize-in-megabytes
- Promise.race() Behavior: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race

## Environment Information

- **Package:** `@pompelmi/next-upload`
- **Node.js Version:** 18+
- **Platform:** All platforms (Linux, macOS, Windows)
- **Deployment:** All deployment types (containers, serverless, traditional)

---

**Note:** This issue has been identified through code review and static analysis. A fix should be implemented to properly handle scanner promise cleanup when timeouts occur.

