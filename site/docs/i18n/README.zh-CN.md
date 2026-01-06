<!-- Language Selector -->
<div align="center">

**Translations:** [English](../../README.md) | [Italiano](README.it.md) | [Français](README.fr.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [日本語](README.ja.md) | **简体中文** | [한국어](README.ko.md) | [Português (BR)](README.pt-BR.md) | [Русский](README.ru.md) | [Türkçe](README.tr.md)

</div>

---

> 💡 **翻译说明：** 本文档是 pompelmi README 的简体中文翻译版本。代码示例、技术术语和命令保持原文不变以确保准确性。

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

<strong>快速文件上传恶意软件扫描，专为 Node.js 设计</strong> — 可选 <strong>YARA</strong> 集成、ZIP 深度检查，以及适用于 <em>Express</em>、<em>Koa</em> 和 <em>Next.js</em> 的即插即用适配器。隐私优先设计。类型完备。体积精简。
</p>

**关键词：** 文件上传安全 · 恶意软件检测 · YARA · Node.js 中间件 · Express · Koa · Next.js · ZIP 炸弹防护

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
    <a href="https://pompelmi.github.io/pompelmi/">📚 文档</a> •
    <a href="#安装">💾 安装</a> •
    <a href="#快速开始">⚡ 快速开始</a> •
    <a href="#适配器">🧩 适配器</a> •
    <a href="#yara-入门">🧬 YARA</a> •
    <a href="#github-action">🤖 CI/CD</a> •
    <a href="#常见问题">❓ 常见问题</a>
  </strong>
</p>

<p align="center"><em>覆盖率徽章反映核心库（<code>src/**</code>）；适配器单独测量。</em></p>

<!-- HERO END -->

---

<div align="center">

### 🎯 为什么选择 pompelmi？

</div>

| 🔒 隐私优先 | ⚡ 极速快捷 | 🎨 开发者友好 |
| --- | --- | --- |
| 所有扫描都在进程内进行。无云端调用，无数据泄露。您的文件永远不会离开您的基础设施。 | 进程内扫描，零网络延迟。可配置并发性，适用于高吞吐量场景。 | TypeScript 优先，零配置默认值，即插即用中间件。5 分钟内即可上手。 |

---

## 目录

- [概述](#概述)
- [亮点](#亮点)
- [为什么选择 pompelmi](#为什么选择-pompelmi-1)
- [对比分析](#对比分析)
- [开发者评价](#开发者评价)
- [pompelmi 的特别之处](#pompelmi-的特别之处)
- [使用场景](#使用场景)
- [安装](#安装)
- [快速开始](#快速开始)
  - [最简 Node 用法](#最简-node-用法)
  - [Express](#express)
  - [Koa](#koa)
  - [Next.js (App Router)](#nextjs-app-router)
- [适配器](#适配器)
- [GitHub Action](#github-action)
- [配置](#配置)
- [YARA 入门](#yara-入门)
- [安全说明](#安全说明)
- [测试与开发](#测试与开发)
- [常见问题](#常见问题)
- [贡献](#贡献)
- [许可证](#许可证)

---

## 🚀 概述

**pompelmi** 在不受信任的文件上传**触碰磁盘之前**进行扫描。这是一个体积精简、TypeScript 优先的 Node.js 工具包，具有可组合的扫描器、深度 ZIP 检查和可选的签名引擎。

### 🎯 核心特性

**🔒 隐私优先设计** — 无对外调用；字节永不离开您的进程

**🧩 可组合扫描器** — 混合启发式 + 签名；设置 `stopOn` 和超时

**📦 ZIP 加固** — 遍历/炸弹防护，多形态 & 宏提示

**🔌 即插即用适配器** — Express、Koa、Fastify、Next.js

**📘 类型完备 & 精简** — 现代 TS，最小接口，可 tree-shake

**⚡ 零依赖** — 核心库依赖最少，安装快速

## ✨ 亮点

**🛡️ 及早阻止危险上传** — 将上传分类为_干净_、_可疑_或_恶意_，并在边缘阻止它们。

**✅ 真正的防护** — 扩展名白名单、服务器端 MIME 嗅探（魔术字节）、单文件大小限制，以及带反炸弹限制的**深度 ZIP** 遍历。

**🔍 内置扫描器** — 即插即用的 **CommonHeuristicsScanner**（PDF 危险操作、Office 宏、PE 头）和 **Zip-bomb Guard**；通过简洁的 `{ scan(bytes) }` 契约添加您自己的扫描器或 YARA。

**⚙️ 组合扫描** — 通过 `composeScanners()` 并行或顺序运行多个扫描器，支持超时和短路。

**☁️ 零云端** — 扫描在进程内运行。保持字节私密。完美符合 GDPR/HIPAA 合规性。

**👨‍💻 开发者体验优先** — TypeScript 类型、ESM/CJS 构建、精简 API、流行 Web 框架适配器。

> **SEO 关键词：** 文件上传安全、恶意软件检测、病毒扫描器、Node.js 安全、Express 中间件、YARA 集成、ZIP 炸弹防护、文件验证、上传清理、威胁检测、安全扫描器、Node.js 杀毒软件、文件扫描库、TypeScript 安全、Next.js 安全、Koa 中间件、服务器端验证、文件完整性检查、恶意软件预防、安全文件上传

## 🧠 为什么选择 pompelmi？

- **设备端、私密扫描** – 无对外调用，无数据共享。
- **及早阻止** – 在您写入磁盘或持久化任何内容_之前_运行。
- **适配您的技术栈** – Express、Koa、Next.js 的即插即用适配器（Fastify 插件处于 alpha 阶段）。
- **深度防御** – ZIP 遍历限制、比率上限、服务器端 MIME 嗅探、大小限制。
- **可插拔检测** – 通过简洁的 `{ scan(bytes) }` 契约引入您自己的引擎（例如 YARA）。

### 适合谁？

- 无法将上传发送到第三方 AV API 的团队。
- 需要内联可预测、低延迟决策的应用。
- 希望使用简单、类型完备的构建块而非守护进程的开发者。

## 🔍 对比分析

| 能力 | pompelmi | ClamAV / node‑clam | 云端 AV API |
| --- | --- | --- | --- |
| 完全在进程内运行 | ✅ | ❌ (单独守护进程) | ❌ (网络调用) |
| 字节保持私密 | ✅ | ✅ | ❌ |
| 深度 ZIP 限制 & MIME 嗅探 | ✅ | ✅ (归档扫描) | ❓ 因服务而异 |
