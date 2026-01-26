# 🚀 Quick Start Guide: Mentions Tracking System

## Overview

This system automatically discovers, tracks, and displays where pompelmi is mentioned across GitHub and the web, keeping your README up-to-date with minimal manual effort.

## 📋 What Was Implemented

### 1. Three Scripts
- **`find-mentions.mjs`** — Discovers mentions via GitHub Code Search API
- **`render-mentions-readme.mjs`** — Converts JSON to markdown
- **`inject-mentions-readme.mjs`** — Updates README with mentions

### 2. Four npm Scripts
```bash
npm run mentions:find    # Step 1: Discover mentions
npm run mentions:render  # Step 2: Generate markdown
npm run mentions:inject  # Step 3: Update README
npm run mentions:update  # Run all 3 steps in sequence
```

### 3. README Improvements
- Responsive logo with `<picture>` element
- Streamlined badge section
- Demo placeholder section
- Enhanced features list
- Complete Getting Started guide
- Real-world code examples
- Star History chart
- Contributors showcase
- Auto-updating mentions section

---

## ⚡ Usage

### Quick Update (Recommended)
```bash
npm run mentions:update
```
This runs all three scripts in sequence.

### With GitHub Token (Higher Rate Limits)
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxx npm run mentions:update
```

**Rate Limits:**
- Without token: 60 requests/hour
- With token: 5,000 requests/hour

### Get a GitHub Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scope: `public_repo` (read-only access to public repos)
4. Generate and copy the token
5. Set it as an environment variable:
   ```bash
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
   ```

---

## 📁 Generated Files

```
mentions/
├── mentions.json    # Raw data (GitHub API results)
└── MENTIONS.md     # Formatted markdown (ready for README)
```

**mentions.json schema:**
```json
{
  "generatedAt": "ISO_DATE",
  "query": {
    "sources": ["github_code_search"],
    "github_queries": ["..."]
  },
  "items": [
    {
      "title": "awesome-javascript",
      "url": "https://github.com/...",
      "sourceType": "awesome-list",
      "publisher": "username",
      "date": "2024-12-15",
      "snippet": "Found in README.md",
      "evidence": {
        "kind": "github_code_search",
        "repo": "user/repo",
        "path": "README.md",
        "line": null
      }
    }
  ],
  "dedupedCount": 42
}
```

---

## 🔍 How It Works

### Discovery Process
1. **GitHub Code Search** — Searches for exact references:
   - `github.com/pompelmi/pompelmi`
   - `pompelmi/pompelmi`
   - `"npm i pompelmi"`
   - `"npm install pompelmi"`

2. **Smart Filtering** — Focuses on:
   - Markdown files (README.md, awesome lists)
   - Repositories with keywords: "awesome", "list", "curated", "newsletter"

3. **Classification** — Categorizes mentions:
   - Awesome Lists (highest priority)
   - Newsletters
   - Directories
   - Other

4. **Deduplication** — Removes duplicates by:
   - Normalizing URLs (removing utm params, trailing slashes)
   - Keeping the most informative version

5. **Sorting** — Orders by:
   - Type priority (awesome-list > newsletter > directory > other)
   - Date (newest first)
   - Title (alphabetically)

### Rendering Process
Groups mentions by type and formats with:
- Title (linked)
- Publisher
- Date (if available)
- Last updated timestamp
- Total count

### Injection Process
- Finds `<!-- MENTIONS:START -->` and `<!-- MENTIONS:END -->` markers
- Replaces content between markers
- Preserves all other README content

---

## 🛠️ Troubleshooting

### "GitHub API returned 401"
**Problem:** Authentication required for GitHub Code Search API.

**Solution:** Set `GITHUB_TOKEN` environment variable:
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
npm run mentions:find
```

### "GitHub API rate limit hit"
**Problem:** Exceeded 60 requests/hour limit.

**Solution 1:** Wait for rate limit reset (shown in script output).

**Solution 2:** Use GitHub token (increases limit to 5,000/hr):
```bash
GITHUB_TOKEN=ghp_xxx npm run mentions:update
```

### "Markers not found in README.md"
**Problem:** Missing `<!-- MENTIONS:START -->` and `<!-- MENTIONS:END -->` markers.

**Solution:** These were already added in this implementation. If you remove them accidentally, add them back where you want mentions to appear in README.

### No mentions found
**Possible reasons:**
1. Project not yet featured in awesome lists/newsletters
2. GitHub search hasn't indexed mentions yet (can take days)
3. Rate limiting preventing full search

**To verify:**
- Manually search GitHub for your project: https://github.com/search?q=pompelmi%2Fpompelmi&type=code
- Check if awesome lists have merged PRs but GitHub search hasn't indexed them yet

---

## 📊 Maintenance

### Recommended Schedule
- **Weekly:** During active promotion periods
- **Monthly:** For established projects
- **After major releases:** To catch new mentions

### CI/CD Integration (Optional)
Add to GitHub Actions workflow:

```yaml
name: Update Mentions
on:
  schedule:
    - cron: '0 0 1 * *'  # Monthly on 1st at midnight
  workflow_dispatch:  # Manual trigger

jobs:
  update-mentions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Update mentions
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run mentions:update
      
      - name: Commit changes
        run: |
          git config --global user.name 'github-actions[bot]'
          git config --global user.email 'github-actions[bot]@users.noreply.github.com'
          git add mentions/ README.md
          git diff --staged --quiet || git commit -m "chore: update mentions [skip ci]"
          git push
```

---

## 🎯 Expected Results

### First Run (New Project)
```
📊 Total raw results: 0
   After deduplication: 0
```
This is normal for new projects. As you get featured, re-run the script.

### Established Project
```
📊 Total raw results: 15
   After deduplication: 8

📋 Summary by type:
   awesome-list: 2
   newsletter: 3
   other: 3
```

### README Output
When mentions are found, README will show:

```markdown
## 🌟 Featured In

*Last updated: January 24, 2026*

### 📋 Awesome Lists & Curated Collections

- [awesome-javascript](https://github.com/sorrycc/awesome-javascript) — sorrycc
- [awesome-typescript](https://github.com/dzharii/awesome-typescript) — dzharii

### 📰 Newsletters & Roundups

- [Detection Engineering Weekly](https://detectionengineering.net/...) — Detection Engineering (2024-12-15)
- [Node Weekly](https://nodeweekly.com/issues/594) — Cooperpress (2024-12-10)

*Found 4 mentions. To update, run `npm run mentions:update`.*
```

---

## 🚀 Next Steps

1. **Get GitHub Token** (optional but recommended)
   ```bash
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
   ```

2. **Run First Update**
   ```bash
   npm run mentions:update
   ```

3. **Commit Changes**
   ```bash
   git add mentions/ README.md
   git commit -m "feat: add automated mentions tracking"
   git push
   ```

4. **Set Reminder** to run monthly or after major releases

5. **Consider CI/CD** for fully automated updates (see above)

---

## 📚 Additional Resources

- **GitHub Code Search API:** https://docs.github.com/en/rest/search
- **Rate Limiting:** https://docs.github.com/en/rest/overview/rate-limits-for-the-rest-api
- **Creating Tokens:** https://github.com/settings/tokens

---

## ✨ Benefits

- ✅ **Social Proof** — Showcase where you're featured
- ✅ **Automated** — No manual tracking needed
- ✅ **Transparent** — All discovery code in repo
- ✅ **Extensible** — Easy to add more sources
- ✅ **Version Controlled** — Mentions history in git
- ✅ **Onboarding** — New users see credibility signals

---

**Ready to use!** Run `npm run mentions:update` anytime to refresh.
