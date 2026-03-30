# Repo Growth Audit

## Audit summary

### Strong signals worth preserving

- The core problem is real and specific: file uploads are part of the attack surface.
- The project already had a strong local-first story: no required cloud API and no daemon by default.
- The repo already included meaningful trust signals: public docs, tests, examples, changelog, and a security policy.
- Framework coverage is a real adoption lever and should stay easy to discover.

### Main friction points found

- The public message was spread across multiple overlapping surfaces, some sharper than others.
- Community and contribution entry points felt generic and noisier than the actual project needed.
- Support and enterprise copy was more productized than the public repo could prove.
- There was no visible roadmap or lightweight contribution inventory for new contributors.
- The repo did not include reusable positioning and launch material for future promotion.

## What changed

- Rewrote the root `README.md` around one sharper message: secure file uploads for Node.js before storage.
- Tightened the package description and keywords in `package.json`.
- Rewrote `.github/DESCRIPTION.md` to remove weak or risky metadata suggestions.
- Replaced the legacy `site/README.md` with a minimal pointer to the current source of truth.
- Rewrote `CONTRIBUTING.md` to be practical, OSS-first, and specific to this repo.
- Added `ROADMAP.md`, `docs/good-first-issues.md`, and `docs/community-prompts.md`.
- Simplified and improved the issue template surface, added a docs-improvement template, and updated the PR template.
- Repositioned the website landing page in `website/src/pages/index.astro`.
- Rewrote the docs landing page, getting-started page, support page, and enterprise page to align with the new positioning.
- Added `docs/positioning.md`, `docs/content-angles.md`, and `docs/launch-posts.md` as reusable promotion assets.

## Why these changes matter

- The README now answers the 10-second question faster: what Pompelmi is, why it matters, and why it is different.
- Competitive clarity is higher because the repo now explains how Pompelmi compares to MIME checks, DIY validation, cloud APIs, and daemon-based scanners.
- Trust is higher because the copy is more explicit about scope and avoids implying compliance or product claims the repo cannot prove.
- Community traction should improve because the repo now has a visible roadmap, starter tasks, cleaner issue forms, and prompts for public discussion.
- Future promotion work is easier because positioning, hooks, and draft launch copy now live in the repo instead of only in maintainer memory.

## Remaining weaknesses

- Legacy Hugo docs under `docs/` still contain stale positioning, compliance-heavy language, and older examples. I did not auto-rewrite them because that tree appears to be a separate older docs surface.
- Translated READMEs under `docs/i18n/` still contain outdated messaging and, in some cases, fake testimonial-style content. I did not auto-edit them because translation rewrites should be reviewed by fluent speakers.
- Some subpackage READMEs and subpackage `package.json` descriptions still use older tone or framing.
- The repo still lacks strong visual trust assets such as a current social preview image, architecture graphic, or product GIF.
- There is still structural repo noise from historical nested directories, which can dilute first impressions for deeper visitors.

## Suggested next 10 actions outside the codebase

1. Update the GitHub repository description, topics, and social preview image in repo settings.
2. Pin one Discussion that welcomes users and asks for real-world upload use cases.
3. Open 5 to 8 curated issues from `docs/good-first-issues.md`.
4. Create a short demo GIF of one clean upload, one blocked upload, and one suspicious upload.
5. Publish one launch post using the new README framing and `docs/launch-posts.md`.
6. Publish one technical article on why MIME checks and extensions are not enough.
7. Seed framework-specific posts for Express and Next.js with code from the quick-start docs.
8. Collect one or two real public user quotes only after actual users volunteer them.
9. Decide whether the legacy `docs/` and `site/` trees should be archived, removed, or clearly labeled everywhere.
10. Create a lightweight process for converting recurring support questions into docs updates within 48 hours.

## Suggested 30-day content and distribution plan

### Week 1

- Update GitHub metadata and social preview.
- Ship the new README and docs.
- Post a repo update in GitHub Discussions.
- Publish one short launch post on X, LinkedIn, or Mastodon.

### Week 2

- Publish a technical writeup: "Why secure file uploads need more than MIME checks."
- Share the Express quick-start snippet with a short diagram of the safer upload flow.
- Open and label the first good-first issues.

### Week 3

- Publish a framework-specific post for Next.js or NestJS.
- Share a quarantine or review-flow example.
- Ask for feedback from developers in Node.js security and backend communities.

### Week 4

- Publish a production-readiness or architecture post.
- Share a short demo GIF.
- Review which messages drove stars, clicks, or discussions, then tighten the homepage and README again based on that feedback.

## Suggested issues to open manually

- Archive or remove the legacy Hugo docs tree, or mark it clearly as historical.
- Audit translated READMEs for outdated claims and assign native-speaker review.
- Align subpackage READMEs and npm descriptions with the new root positioning.
- Add a generated social preview image that matches the new headline.
- Add snippet validation or link checking for README and docs examples.
- Add a small architecture diagram to the website and README.
- Seed GitHub Discussions categories for integrations, policies, and showcase posts.
- Add one Fastify example that mirrors the Express quick start.

## Suggested screenshots, GIFs, and demo assets to create manually

- A side-by-side diagram: "without Pompelmi" versus "with Pompelmi".
- A 30 to 60 second GIF of the Express example returning `clean`, `suspicious`, and blocked responses.
- A screenshot of structured verdict output with reasons and rule matches.
- A simple quarantine-flow diagram showing allow, review, and reject paths.
- A landing-page social card with the new core message: secure file uploads for Node.js.
- A small framework matrix graphic for README, docs, and social posts.

## Notes on what was not auto-changed

- I did not auto-rewrite the legacy `docs/` tree beyond adding new material in the current repo surface.
- I did not auto-rewrite translated content in `docs/i18n/`.
- I did not auto-edit every subpackage README because the highest-impact growth work was on the root repo surface first.
