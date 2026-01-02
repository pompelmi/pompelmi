#!/bin/bash
set -e

cd /Users/tommy/pompelmi/pompelmi

echo "=== Git Status ==="
git status

echo ""
echo "=== Current Branch ==="
git branch --show-current

echo ""
echo "=== Staging README ==="
git add examples/nuxt-nitro/README.md

echo ""
echo "=== Committing ==="
git commit -m "✨ Enhance Nuxt/Nitro README with modern styling

- Add modern badges and visual styling
- Include feature comparison tables  
- Add step-by-step guides with emojis
- Add collapsible troubleshooting sections
- Include architecture diagram with Mermaid
- Add production deployment checklist
- Improve code examples and documentation
- Add professional footer with CTAs" || echo "Nothing to commit or already committed"

echo ""
echo "=== Pushing to origin main ==="
git push origin HEAD:main --verbose

echo ""
echo "=== DONE ==="
