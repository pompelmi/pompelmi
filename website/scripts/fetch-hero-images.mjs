#!/usr/bin/env node
/**
 * Fetch royalty-free hero images from Pexels for blog posts.
 *
 * Usage:
 *   PEXELS_API_KEY=your_key_here node scripts/fetch-hero-images.mjs
 *
 * Downloads one image per blog post to public/blog/<slug>.jpg (landscape, ~1200px wide).
 * Images are skipped if the file already exists, so the script is idempotent.
 * Safe to run in CI — exits cleanly if PEXELS_API_KEY is not set.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'blog');
const API_KEY = process.env.PEXELS_API_KEY;

if (!API_KEY) {
  console.log('PEXELS_API_KEY not set — skipping image fetch. Set it in .env or the environment.');
  process.exit(0);
}

// Map slug → Pexels search query
const BLOG_IMAGES = [
  { slug: 'introducing-pompelmi',                       query: 'file upload security server' },
  { slug: 'express-file-upload-security',               query: 'nodejs express server code' },
  { slug: 'nextjs-file-upload-security',                query: 'nextjs react web application' },
  { slug: 'file-upload-security-checklist',             query: 'security checklist clipboard' },
  { slug: 'performance-optimization',                   query: 'performance speed server rack' },
  { slug: 'preventing-zip-bombs',                       query: 'archive compression data center' },
  { slug: 'real-world-malware-samples',                 query: 'cybersecurity threat detection' },
  { slug: 'supply-chain-security',                      query: 'supply chain logistics security' },
  { slug: 'yara-integration-guide',                     query: 'malware analysis binary code' },
  { slug: 'koa-file-upload-security',                   query: 'nodejs server backend code' },
  { slug: 'fastify-upload-hardening',                   query: 'fast server infrastructure' },
  { slug: 'nestjs-secure-file-uploads',                 query: 'typescript code architecture' },
  { slug: 'nuxt-nitro-file-upload-security',            query: 'vuejs frontend web development' },
  { slug: 'mime-sniffing-magic-bytes',                  query: 'binary file hex code' },
  { slug: 'polyglot-files-disguised-payloads',          query: 'disguise mask security threat' },
  { slug: 'eicar-testing-upload-scanners',              query: 'software testing automated tests' },
  { slug: 'reason-codes-security-observability',        query: 'monitoring dashboard analytics' },
  { slug: 'cicd-scan-build-artifacts',                  query: 'ci cd pipeline devops automated' },
  { slug: 'privacy-first-vs-cloud-scanning',            query: 'privacy cloud data privacy lock' },
  { slug: 'pompelmi-vs-clamav-comparison',              query: 'comparison analysis chart data' },
  { slug: 'secure-upload-architecture-regulated-industries', query: 'enterprise secure architecture' },
  { slug: 'common-file-upload-mistakes-nodejs',         query: 'error bug code debugging' },
  { slug: 'upload-quarantine-review-flows',             query: 'quarantine isolation container secure' },
];

async function fetchPexelsImage(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: API_KEY } });
  if (!res.ok) throw new Error(`Pexels API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const photo = data.photos?.[0];
  if (!photo) throw new Error(`No results for query: ${query}`);
  return photo.src.large2x ?? photo.src.large ?? photo.src.original;
}

async function downloadImage(imageUrl, outputPath) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(outputPath, buffer);
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  let fetched = 0;
  let skipped = 0;
  let failed = 0;

  for (const { slug, query } of BLOG_IMAGES) {
    const outputPath = join(OUTPUT_DIR, `${slug}.jpg`);

    if (existsSync(outputPath)) {
      console.log(`  skip  ${slug}.jpg (already exists)`);
      skipped++;
      continue;
    }

    try {
      const imageUrl = await fetchPexelsImage(query);
      await downloadImage(imageUrl, outputPath);
      console.log(`  fetch ${slug}.jpg`);
      fetched++;

      // Pexels rate limit: 200 req/hour on free tier — add a small delay
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`  error ${slug}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Fetched: ${fetched}, Skipped: ${skipped}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main();
