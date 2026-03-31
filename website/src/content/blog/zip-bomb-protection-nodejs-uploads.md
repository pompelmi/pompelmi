---
title: "ZIP Bomb Protection for Node.js Upload Endpoints"
description: "Protect Node.js upload endpoints from ZIP bombs with entry limits, uncompressed-size controls, compression-ratio checks, traversal detection, and quarantine-first handling."
pubDate: 2026-03-31
updatedDate: 2026-03-31
author: "Pompelmi Team"
category: "Deep dive"
tags: ["archives", "zip", "security", "nodejs", "uploads"]
---

# ZIP Bomb Protection for Node.js Upload Endpoints

ZIP bomb protection in Node.js is not a nice-to-have if your upload route accepts archives. It is a separate security problem from plain file validation.

A ZIP can look small and still create a resource problem later. It can also contain traversal paths, huge declared expansion, or nested content that does not belong anywhere near your normal request path.

## What a ZIP upload can do to your route

Archive-heavy routes face a few distinct risks:

- too many entries for the route to handle safely
- extreme expansion compared to the compressed size
- total uncompressed size that is far larger than expected
- traversal-style paths such as `../../etc/passwd`
- nested archives that turn extraction into a recursive resource problem

That is why image upload rules do not transfer cleanly to archive upload rules.

## Add archive-specific controls before extraction

If a Node.js route accepts ZIP files, make the archive policy explicit before anything unpacks or stores the contents.

```ts
import { CommonHeuristicsScanner, composeScanners, createZipBombGuard } from 'pompelmi';

const scanner = composeScanners(
  [
    [
      'zipGuard',
      createZipBombGuard({
        maxEntries: 512,
        maxTotalUncompressedBytes: 100 * 1024 * 1024,
        maxCompressionRatio: 12,
      }),
    ],
    ['heuristics', CommonHeuristicsScanner],
  ],
  { stopOn: 'suspicious', tagSourceName: true }
);
```

That covers the archive controls most upload endpoints need first:

- entry count
- total uncompressed bytes
- suspicious compression ratio
- traversal-style entry names

## Handle nested archives as a workflow decision

Nested archives are often where a simple upload route becomes a bad place to keep processing.

If your product truly needs nested archive inspection, treat it as an explicit workflow with tight recursion limits and quarantine-first handling. For App Router flows, `@pompelmi/next-upload` also supports archive depth limits on the upload path. For many public uploads, the safer answer is simpler: do not recursively unpack nested archives in the request path at all.

## ZIP bomb protection is not only about DoS

Teams often think about ZIP bombs only as decompression attacks. In practice, archive routes also need to account for:

- path traversal during extraction
- unexpected executable or script content inside the archive
- import jobs that trust the archive too early

So the secure sequence is:

1. inspect the archive
2. decide whether it is acceptable
3. only then extract or promote it

## Good defaults for archive upload endpoints

- keep archive routes separate from normal image or document routes
- quarantine suspicious archives instead of unpacking them automatically
- keep expansion limits conservative unless the business case is clear
- log blocked archive verdicts with enough detail to tune policy later

## Conclusion

ZIP bomb protection for Node.js uploads needs explicit archive controls before extraction, not just a `.zip` extension check. Entry counts, expansion size, compression ratio, traversal, and nested-archive behavior all belong in the route policy.

If your application accepts archives today, start with the archive use-case docs and make the archive decision happen before any extraction or promotion step.

## Related reading

- [Archive / ZIP upload security](/pompelmi/use-cases/archive-zip-upload-security/)
- [Secure file uploads in Node.js: Beyond extension and MIME checks](/pompelmi/blog/secure-file-uploads-nodejs/)
- [Secure file uploads in Next.js](/pompelmi/how-to/nextjs/)
- [Preventing ZIP bombs](/pompelmi/blog/preventing-zip-bombs/)
- [Common file upload mistakes in Node.js](/pompelmi/blog/common-file-upload-mistakes-nodejs/)
