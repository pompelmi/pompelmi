<!-- Language Selector -->
<div align="center">

**Translations:** [English](../../README.md) | [Italiano](README.it.md) | [Français](README.fr.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | **한국어** | [Português (BR)](README.pt-BR.md) | [Русский](README.ru.md) | [Türkçe](README.tr.md)

</div>

---

> 💡 **번역 안내:** 이 문서는 영문 원본에서 번역되었습니다. 일부 내용이 최신 버전과 다를 수 있습니다.

---

<!-- HERO START -->

<p align="center">

<br/>
<a href="https://www.producthunt.com/products/pompelmi?embed=true&utm_source=badge-pompelmi&utm_medium=badge" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1010722&theme=light&t=1756653468504" alt="pompelmi - free&#0044;&#0032;open&#0045;source&#0032;file&#0032;scanner | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
<br/>
  <a href="https://github.com/pompelmi/pompelmi" target="_blank" rel="noopener noreferrer">
    <img src="https://raw.githubusercontent.com/pompelmi/pompelmi/refs/heads/main/assets/logo.svg" alt="pompelmi logo" width="360" />
  </a>
  <br/>
  <a href="https://www.detectionengineering.net/p/det-eng-weekly-issue-124-the-defcon"><img alt="Featured in Detection Engineering Weekly #124" src="https://img.shields.io/badge/featured-Detection%20Engineering%20Weekly-0A84FF?logo=substack"></a>
  <a href="https://nodeweekly.com/issues/594"><img alt="Featured in Node Weekly #594" src="https://img.shields.io/badge/featured-Node%20Weekly%20%23594-FF6600?logo=node.js"></a>
  <a href="https://bytes.dev/archives/429"><img alt="Featured in Bytes #429" src="https://img.shields.io/badge/featured-Bytes%20%23429-111111"></a>
  <a href="https://dev.to/sonotommy/secure-nodejs-file-uploads-in-minutes-with-pompelmi-3jfe"><img alt="Featured on DEV.to" src="https://img.shields.io/badge/featured-DEV.to-0A0A0A?logo=devdotto"></a>
  <br/>
  <a href="https://github.com/sorrycc/awesome-javascript"><img alt="Mentioned in Awesome JavaScript" src="https://awesome.re/mentioned-badge.svg"></a>
  <a href="https://github.com/dzharii/awesome-typescript"><img alt="Mentioned in Awesome TypeScript" src="https://awesome.re/mentioned-badge-flat.svg"></a>
  <br/>
  
</p>

<h1 align="center">pompelmi</h1>

<p align="center">

<strong>Node.js를 위한 빠른 파일 업로드 악성코드 스캐닝</strong> — 선택적 <strong>YARA</strong> 통합, ZIP 심층 검사, 그리고 <em>Express</em>, <em>Koa</em>, <em>Next.js</em>를 위한 드롭인 어댑터. 프라이버시 우선 설계. 타입 지원. 작은 용량.
</p>

**키워드:** 파일 업로드 보안 · 악성코드 탐지 · YARA · Node.js 미들웨어 · Express · Koa · Next.js · ZIP 폭탄 방어

---

<p align="center">
  <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm version" src="https://img.shields.io/npm/v/pompelmi?label=version&color=0a7ea4&logo=npm"></a>
  <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm downloads" src="https://img.shields.io/npm/dm/pompelmi?label=downloads&color=6E9F18&logo=npm"></a>
  <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm weekly downloads" src="https://img.shields.io/npm/dw/pompelmi?label=weekly&color=blue&logo=npm"></a>
  <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm total downloads" src="https://img.shields.io/npm/dt/pompelmi?label=total%20downloads&color=success&logo=npm"></a>
  <img alt="npm bundle size" src="https://img.shields.io/bundlephobia/minzip/pompelmi?label=size&color=success">
  <a href="https://snyk.io/test/github/pompelmi/pompelmi"><img alt="Known Vulnerabilities" src="https://snyk.io/test/github/pompelmi/pompelmi/badge.svg"></a>
</p>

<p align="center">
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white">
  <img alt="types" src="https://img.shields.io/badge/types-TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="ESM" src="https://img.shields.io/badge/ESM%2FCJS-compatible-yellow">
  <a href="https://github.com/pompelmi/pompelmi/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/npm/l/pompelmi?color=blue"></a>
</p>

<p align="center">
  <a href="https://github.com/pompelmi/pompelmi/actions/workflows/ci-release-publish.yml"><img alt="CI Status" src="https://img.shields.io/github/actions/workflow/status/pompelmi/pompelmi/ci-release-publish.yml?branch=main&label=CI&logo=github"></a>
  <a href="https://codecov.io/gh/pompelmi/pompelmi"><img alt="codecov" src="https://codecov.io/gh/pompelmi/pompelmi/branch/main/graph/badge.svg?flag=core"/></a>
  <a href="https://securityscorecards.dev/viewer/?uri=github.com/pompelmi/pompelmi"><img alt="OpenSSF Scorecard" src="https://api.securityscorecards.dev/projects/github.com/pompelmi/pompelmi/badge"/></a>
  <a href="https://bestpractices.coreinfrastructure.org/projects/9999"><img alt="OpenSSF Best Practices" src="https://img.shields.io/badge/OpenSSF-Best%20Practices-green?logo=openbadges"></a>
</p>

<p align="center">
  <a href="https://github.com/pompelmi/pompelmi/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/pompelmi/pompelmi?style=social"></a>
  <a href="https://github.com/pompelmi/pompelmi/network/members"><img alt="GitHub forks" src="https://img.shields.io/github/forks/pompelmi/pompelmi?style=social"></a>
  <a href="https://github.com/pompelmi/pompelmi/watchers"><img alt="GitHub watchers" src="https://img.shields.io/github/watchers/pompelmi/pompelmi?style=social"></a>
  <a href="https://github.com/pompelmi/pompelmi/issues"><img alt="open issues" src="https://img.shields.io/github/issues/pompelmi/pompelmi?color=orange"></a>
  <img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg">
  <a href="https://github.com/pompelmi/pompelmi/commits/main"><img alt="last commit" src="https://img.shields.io/github/last-commit/pompelmi/pompelmi?color=blue"></a>
  <a href="https://github.com/pompelmi/pompelmi/graphs/contributors"><img alt="contributors" src="https://img.shields.io/github/contributors/pompelmi/pompelmi?color=purple"></a>
</p>

<p align="center">
  <strong>
    <a href="https://pompelmi.github.io/pompelmi/">📚 문서</a> •
    <a href="#installation">💾 설치</a> •
    <a href="#quick-start">⚡ 빠른 시작</a> •
    <a href="#adapters">🧩 어댑터</a> •
    <a href="#yara-getting-started">🧬 YARA</a> •
    <a href="#github-action">🤖 CI/CD</a> •
    <a href="#faq">❓ FAQ</a>
  </strong>
</p>

<p align="center"><em>커버리지 배지는 핵심 라이브러리(<code>src/**</code>)를 반영합니다; 어댑터는 별도로 측정됩니다.</em></p>

<!-- HERO END -->

---

<div align="center">

### 🎯 왜 pompelmi를 선택해야 하나요?

</div>

| 🔒 프라이버시 우선 | ⚡ 초고속 | 🎨 개발자 친화적 |
| --- | --- | --- |
| 모든 스캔은 인프로세스로 실행됩니다. 클라우드 호출 없음, 데이터 유출 없음. 파일이 인프라를 벗어나지 않습니다. | 네트워크 지연 시간이 없는 인프로세스 스캔. 높은 처리량 시나리오를 위한 구성 가능한 동시성. | TypeScript 우선, 제로 구성 기본값, 드롭인 미들웨어. 5분 안에 시작하세요. |

---

## 목차

- [개요](#overview)
- [주요 기능](#highlights)
- [왜 pompelmi인가](#why-pompelmi)
- [비교](#how-it-compares)
- [개발자들의 평가](#what-developers-say)
- [pompelmi를 특별하게 만드는 것](#what-makes-pompelmi-special)
- [사용 사례](#use-cases)
- [설치](#installation)
- [빠른 시작](#quick-start)
  - [최소 Node 사용법](#minimal-node-usage)
  - [Express](#express)
  - [Koa](#koa)
  - [Next.js (App Router)](#nextjs-app-router)
- [어댑터](#adapters)
- [GitHub Action](#github-action)
- [구성](#configuration)
- [YARA 시작하기](#yara-getting-started)
- [보안 참고사항](#security-notes)
- [테스트 및 개발](#testing--development)
- [FAQ](#faq)
- [기여하기](#contributing)
- [라이선스](#license)

---

## 🚀 개요

**pompelmi**는 신뢰할 수 없는 파일 업로드를 디스크에 저장하기 **전에** 스캔합니다. 조합 가능한 스캐너, 심층 ZIP 검사 및 선택적 시그니처 엔진을 갖춘 Node.js용 작은 TypeScript 우선 툴킷입니다.

### 🎯 주요 특징

**🔒 프라이버시 우선 설계** — 아웃바운드 호출 없음; 바이트가 프로세스를 벗어나지 않음

**🧩 조합 가능한 스캐너** — 휴리스틱 + 시그니처 혼합; `stopOn` 및 타임아웃 설정

**📦 ZIP 강화** — 경로 조작/폭탄 방어, 폴리글롯 & 매크로 힌트

**🔌 드롭인 어댑터** — Express, Koa, Fastify, Next.js

**📘 타입 지원 & 작은 용량** — 모던 TS, 최소한의 인터페이스, 트리 셰이킹 가능

**⚡ 제로 의존성** — 핵심 라이브러리는 최소 의존성, 빠른 설치

## ✨ 주요 기능

**🛡️ 위험한 업로드를 조기에 차단** — 업로드를 _안전함_, _의심스러움_, _악성_으로 분류하고 엣지에서 차단합니다.

**✅ 실제 가드** — 확장자 허용 목록, 서버 측 MIME 스니핑(매직 바이트), 파일별 크기 제한, 폭탄 방지 제한이 있는 **심층 ZIP** 경로 조작.

**🔍 내장 스캐너** — 드롭인 **CommonHeuristicsScanner**(PDF 위험 작업, Office 매크로, PE 헤더) 및 **Zip 폭탄 가드**; 작은 `{ scan(bytes) }` 계약을 통해 자신만의 스캐너나 YARA를 추가하세요.

**⚙️ 스캐닝 조합** — `composeScanners()`를 통해 타임아웃 및 단락 회로와 함께 여러 스캐너를 병렬 또는 순차적으로 실행합니다.

**☁️ 제로 클라우드** — 스캔이 인프로세스로 실행됩니다. 바이트를 비공개로 유지하세요. GDPR/HIPAA 준수에 완벽합니다.

**👨‍💻 DX 우선** — TypeScript 타입, ESM/CJS 빌드, 작은 API, 인기 있는 웹 프레임워크용 어댑터.

> **SEO 키워드:** 파일 업로드 보안, 악성코드 탐지, 바이러스 스캐너, Node.js 보안, Express 미들웨어, YARA 통합, ZIP 폭탄 방어, 파일 검증, 업로드 살균, 위협 탐지, 보안 스캐너, 안티바이러스 Node.js, 파일 스캐닝 라이브러리, TypeScript 보안, Next.js 보안, Koa 미들웨어, 서버 측 검증, 파일 무결성 검사, 악성코드 방지, 안전한 파일 업로드

## 🧠 왜 pompelmi인가?

- **온디바이스, 비공개 스캐닝** – 아웃바운드 호출 없음, 데이터 공유 없음.
- **조기 차단** – 디스크에 쓰거나 무언가를 저장하기 _전에_ 실행됩니다.
- **당신의 스택에 적합** – Express, Koa, Next.js용 드롭인 어댑터(Fastify 플러그인은 알파 버전).
- **심층 방어** – ZIP 경로 조작 제한, 비율 제한, 서버 측 MIME 스니핑, 크기 제한.
- **플러그 가능한 탐지** – 작은 `{ scan(bytes) }` 계약을 통해 자신만의 엔진(예: YARA)을 가져오세요.

### 누구를 위한 것인가요?

- 타사 AV API로 업로드를 보낼 수 없는 팀.
- 인라인으로 예측 가능하고 낮은 지연 시간의 결정이 필요한 앱.
- 데몬 대신 간단하고 타입이 지정된 빌딩 블록을 원하는 개발자.

## 🔍 비교

| 기능 | pompelmi | ClamAV / node‑clam | Cloud AV APIs |
| --- | --- | --- | --- |
| 완전히 인프로세스 실행 | ✅ | ❌ (별도 데몬) | ❌ (네트워크 호출) |
| 바이트 비공개 유지 | ✅ | ✅ | ❌ |
| 심층 ZIP 제한 & MIME 스니핑 | ✅ | ✅ (아카이브 스캔) | ❓ 다양함 |
