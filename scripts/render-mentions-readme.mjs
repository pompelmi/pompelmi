#!/usr/bin/env node

/**
 * Render mentions.json to MENTIONS.md for README embedding
 *
 * Usage:
 *   node scripts/render-mentions-readme.mjs
 *
 * Reads: mentions/mentions.json
 * Outputs: mentions/MENTIONS.md
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const INPUT_FILE = join(ROOT, "mentions", "mentions.json");
const OUTPUT_FILE = join(ROOT, "mentions", "MENTIONS.md");

/**
 * Group items by source type
 */
function groupByType(items) {
  const groups = {
    "awesome-list": [],
    newsletter: [],
    directory: [],
    other: [],
  };

  for (const item of items) {
    const type = item.sourceType || "other";
    if (groups[type]) {
      groups[type].push(item);
    } else {
      groups["other"].push(item);
    }
  }

  return groups;
}

/**
 * Format a single mention item
 */
function formatItem(item) {
  let line = `- [${item.title}](${item.url})`;

  if (item.publisher) {
    line += ` — ${item.publisher}`;
  }

  if (item.date) {
    line += ` (${item.date})`;
  }

  return line;
}

/**
 * Render mentions to markdown
 */
function renderMarkdown(data) {
  const lines = [];

  lines.push("## 🌟 Featured In\n");
  lines.push(
    `*Last updated: ${new Date(data.generatedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}*\n`,
  );

  if (data.items.length === 0) {
    lines.push("*No mentions found yet. Run `npm run mentions:find` to discover mentions.*\n");
    return lines.join("\n");
  }

  const groups = groupByType(data.items);

  // Awesome Lists
  if (groups["awesome-list"].length > 0) {
    lines.push("### 📋 Awesome Lists & Curated Collections\n");
    for (const item of groups["awesome-list"]) {
      lines.push(formatItem(item));
    }
    lines.push("");
  }

  // Newsletters
  if (groups["newsletter"].length > 0) {
    lines.push("### 📰 Newsletters & Roundups\n");
    for (const item of groups["newsletter"]) {
      lines.push(formatItem(item));
    }
    lines.push("");
  }

  // Directories
  if (groups["directory"].length > 0) {
    lines.push("### 📚 Developer Directories\n");
    for (const item of groups["directory"]) {
      lines.push(formatItem(item));
    }
    lines.push("");
  }

  // Other
  if (groups["other"].length > 0) {
    lines.push("### 🔗 Other Mentions\n");
    for (const item of groups["other"]) {
      lines.push(formatItem(item));
    }
    lines.push("");
  }

  lines.push(
    `\n*Found ${data.items.length} mention${data.items.length === 1 ? "" : "s"}. To update, run \`npm run mentions:update\`.*\n`,
  );

  return lines.join("\n");
}

/**
 * Main function
 */
async function main() {
  console.log("📝 Rendering mentions to markdown...\n");

  try {
    // Read mentions.json
    const jsonContent = await readFile(INPUT_FILE, "utf-8");
    const data = JSON.parse(jsonContent);

    console.log(`📊 Loaded ${data.items.length} mentions from ${INPUT_FILE}`);

    // Render markdown
    const markdown = renderMarkdown(data);

    // Write output
    await writeFile(OUTPUT_FILE, markdown, "utf-8");

    console.log(`✅ Saved markdown to ${OUTPUT_FILE}`);
    console.log("\n💡 Next step: npm run mentions:inject");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`❌ File not found: ${INPUT_FILE}`);
      console.error('💡 Run "npm run mentions:find" first to generate mentions.json');
      process.exit(1);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
