# Roadmap

This document describes current direction, not a release contract.

## What the project is optimizing for

- Clear, trustworthy upload security for Node.js.
- Local-first scanning with minimal operational overhead.
- Small, composable APIs that fit real application routes.
- Public docs and examples that make evaluation fast.

## Near-term priorities

### 1. First-use clarity

- Keep the README, docs landing pages, and examples aligned around one core message.
- Make framework guides easier to compare at a glance.
- Add more copy-paste examples that show verdict handling and safer defaults.

### 2. Safer default integrations

- Tighten example defaults for public upload endpoints.
- Improve adapter parity across the main Node.js frameworks in this repo.
- Make fail-closed behavior and error mapping easier to understand.

### 3. Operational trust

- Expand production-readiness guidance.
- Improve quarantine and review-flow documentation.
- Make the project boundary explicit: what Pompelmi does, and what it does not claim to do.

### 4. Detection and policy depth

- Improve heuristics around tricky document and archive cases.
- Keep YARA easy to add without making it mandatory.
- Expand policy guidance for common upload profiles.

### 5. Community and ecosystem

- Keep a small queue of good-first issues available.
- Publish more framework demos and integration notes.
- Turn real-world rollout questions into public docs and examples.

## Good contribution areas

- Docs and examples.
- Tests around edge-case files and archive handling.
- Framework adapter ergonomics.
- Copy and metadata improvements that reduce adoption friction.
- Website polish that improves clarity without adding hype.

## Not current goals

- Becoming a full endpoint-protection suite.
- Requiring a cloud scanning service.
- Hiding the open-source path behind enterprise-only positioning.

## Signals that help maintainers prioritize

- Which upload flows you need to protect.
- Which framework path feels under-documented.
- What false positives or blind spots you hit.
- What operational visibility you need during rollout.
