#!/bin/bash
cd /Users/tommy/pompelmi/pompelmi
git add .github/workflows/ci.yml .github/workflows/build.yml .github/workflows/publish.yml .github/workflows/deploy-pages.yml pnpm-workspace.yaml
git commit -m "Fix all workflows: use --no-frozen-lockfile to resolve pnpm lockfile conflicts"
git push origin main
