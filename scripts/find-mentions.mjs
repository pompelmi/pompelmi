#!/usr/bin/env node

/**
 * Find mentions of pompelmi across GitHub and web
 * 
 * Usage:
 *   node scripts/find-mentions.mjs
 *   GITHUB_TOKEN=ghp_xxx node scripts/find-mentions.mjs
 * 
 * Outputs to: mentions/mentions.json
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'mentions');
const OUTPUT_FILE = join(OUTPUT_DIR, 'mentions.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USER_AGENT = 'pompelmi-mentions-finder/1.0';

// Search queries to find mentions
const GITHUB_QUERIES = [
  'github.com/pompelmi/pompelmi',
  'pompelmi/pompelmi',
  '"npm i pompelmi"',
  '"npm install pompelmi"',
];

/**
 * Fetch from GitHub Search API
 */
async function searchGitHub(query) {
  const url = new URL('https://api.github.com/search/code');
  url.searchParams.set('q', `${query} filename:README.md OR filename:awesome OR filename:list`);
  url.searchParams.set('per_page', '30');
  
  const headers = {
    'User-Agent': USER_AGENT,
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
  }
  
  try {
    const response = await fetch(url, { headers });
    
    if (response.status === 403) {
      const rateLimitReset = response.headers.get('x-ratelimit-reset');
      const resetDate = rateLimitReset ? new Date(rateLimitReset * 1000).toLocaleTimeString() : 'unknown';
      console.warn(`⚠️  GitHub API rate limit hit. Reset at ${resetDate}.`);
      if (!GITHUB_TOKEN) {
        console.warn('💡 Set GITHUB_TOKEN environment variable to increase rate limits (5000/hr vs 60/hr)');
      }
      return [];
    }
    
    if (!response.ok) {
      console.warn(`⚠️  GitHub API returned ${response.status} for query: ${query}`);
      return [];
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error(`❌ Error searching GitHub for "${query}":`, error.message);
    return [];
  }
}

/**
 * Determine source type from repository info
 */
function inferSourceType(repo) {
  const name = repo.toLowerCase();
  const description = (repo.description || '').toLowerCase();
  
  if (name.includes('awesome') || name.includes('list') || name.includes('curated')) {
    return 'awesome-list';
  }
  if (name.includes('newsletter') || name.includes('weekly') || name.includes('digest')) {
    return 'newsletter';
  }
  if (name.includes('directory') || name.includes('catalog')) {
    return 'directory';
  }
  if (description.includes('awesome') || description.includes('curated list')) {
    return 'awesome-list';
  }
  
  return 'other';
}

/**
 * Normalize URL (remove utm params, trailing slashes)
 */
function normalizeURL(url) {
  try {
    const u = new URL(url);
    // Remove common tracking params
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'];
    paramsToRemove.forEach(param => u.searchParams.delete(param));
    
    // Remove trailing slash from pathname
    u.pathname = u.pathname.replace(/\/$/, '');
    
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Convert GitHub search result to mention item
 */
function gitHubItemToMention(item) {
  const repoFullName = item.repository.full_name;
  const repoUrl = item.repository.html_url;
  const fileUrl = item.html_url;
  const publisher = repoFullName.split('/')[0];
  
  return {
    title: item.repository.name,
    url: normalizeURL(repoUrl),
    sourceType: inferSourceType(item.repository.full_name + ' ' + (item.repository.description || '')),
    publisher,
    date: null, // GitHub doesn't provide commit date in code search
    snippet: `Found in ${item.path}`,
    evidence: {
      kind: 'github_code_search',
      repo: repoFullName,
      path: item.path,
      line: null,
    }
  };
}

/**
 * Deduplicate items by canonical URL
 */
function deduplicateItems(items) {
  const seen = new Map();
  
  for (const item of items) {
    const canonical = normalizeURL(item.url);
    
    if (!seen.has(canonical)) {
      seen.set(canonical, item);
    } else {
      // Keep the one with more info (prefer awesome-list > newsletter > other)
      const existing = seen.get(canonical);
      const typeScore = (type) => {
        if (type === 'awesome-list') return 3;
        if (type === 'newsletter') return 2;
        if (type === 'directory') return 1;
        return 0;
      };
      
      if (typeScore(item.sourceType) > typeScore(existing.sourceType)) {
        seen.set(canonical, item);
      }
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Sort items by priority: awesome-list > newsletter > directory > other, then by date desc
 */
function sortItems(items) {
  const typeOrder = {
    'awesome-list': 0,
    'newsletter': 1,
    'directory': 2,
    'other': 3,
  };
  
  return items.sort((a, b) => {
    // First by type
    const typeA = typeOrder[a.sourceType] ?? 99;
    const typeB = typeOrder[b.sourceType] ?? 99;
    if (typeA !== typeB) return typeA - typeB;
    
    // Then by date (newer first)
    if (a.date && b.date) {
      return new Date(b.date) - new Date(a.date);
    }
    if (a.date) return -1;
    if (b.date) return 1;
    
    // Finally alphabetically by title
    return a.title.localeCompare(b.title);
  });
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Finding mentions of pompelmi...\n');
  
  if (!GITHUB_TOKEN) {
    console.log('💡 Tip: Set GITHUB_TOKEN to increase GitHub API rate limits (60/hr → 5000/hr)\n');
  }
  
  const allItems = [];
  
  // Search GitHub
  console.log('📦 Searching GitHub...');
  for (const query of GITHUB_QUERIES) {
    console.log(`   Querying: "${query}"`);
    const results = await searchGitHub(query);
    console.log(`   Found: ${results.length} results`);
    
    const mentions = results.map(gitHubItemToMention);
    allItems.push(...mentions);
    
    // Rate limiting: small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Total raw results: ${allItems.length}`);
  
  // Deduplicate
  const dedupedItems = deduplicateItems(allItems);
  console.log(`   After deduplication: ${dedupedItems.length}`);
  
  // Sort
  const sortedItems = sortItems(dedupedItems);
  
  // Build output
  const output = {
    generatedAt: new Date().toISOString(),
    query: {
      sources: ['github_code_search'],
      github_queries: GITHUB_QUERIES,
    },
    items: sortedItems,
    dedupedCount: dedupedItems.length,
  };
  
  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });
  
  // Write output
  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`\n✅ Saved ${dedupedItems.length} mentions to ${OUTPUT_FILE}`);
  console.log('\n📋 Summary by type:');
  
  const byType = sortedItems.reduce((acc, item) => {
    acc[item.sourceType] = (acc[item.sourceType] || 0) + 1;
    return acc;
  }, {});
  
  for (const [type, count] of Object.entries(byType)) {
    console.log(`   ${type}: ${count}`);
  }
  
  console.log('\n💡 Next step: npm run mentions:render');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
