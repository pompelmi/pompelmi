<!-- Language Selector -->
<div align="center">

**Translations:** [English](../../README.md) | [Italiano](README.it.md) | [Français](README.fr.md) | [Español](README.es.md) | [Deutsch](README.de.md) | **日本語** | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [Português (BR)](README.pt-BR.md) | [Русский](README.ru.md) | [Türkçe](README.tr.md)

</div>

---

> 💡 **翻訳について:** この文書は英語版READMEから翻訳されたものです。最新の情報については、[英語版README](../../README.md)をご覧ください。

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

<strong>Node.js用の高速ファイルアップロードマルウェアスキャン</strong> — オプションの<strong>YARA</strong>統合、ZIP詳細検査、<em>Express</em>、<em>Koa</em>、<em>Next.js</em>用のドロップインアダプター。プライバシー重視の設計。型安全。軽量。
</p>

**キーワード:** ファイルアップロードセキュリティ · マルウェア検出 · YARA · Node.jsミドルウェア · Express · Koa · Next.js · ZIPボム保護

---

<div align="center">

## ⚡ **クイックスタート（クラウド）**

**サーバーレスで実行中、またはClamAVをインストールできませんか？**  
**[RapidAPI公式ホストAPI](https://rapidapi.com/SonoTommy/api/pompelmi-malware-scanner)** を使用 →

✅ **セットアップ不要** • バイナリのインストール不要  
✅ **サーバーレス対応** • AWS Lambda、Vercel、Netlifyで動作  
✅ **自動スケール** • RAM/CPUオーバーヘッドなし  
✅ **組み込み保護** • 自動ZIPボム検出

[**→ RapidAPIで始める**](https://rapidapi.com/SonoTommy/api/pompelmi-malware-scanner)

</div>

---

<p align="center">
  <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm version" src="https://img.shields.io/npm/v/pompelmi?label=version&color=0a7ea4&logo=npm"></a>
  <a href="https://rapidapi.com/SonoTommy/api/pompelmi-malware-scanner"><img alt="Cloud API" src="https://img.shields.io/badge/☁️_Cloud_API-Available_on_RapidAPI-0055FF?style=flat&logo=icloud&logoColor=white"></a>
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
    <a href="https://pompelmi.github.io/pompelmi/">📚 ドキュメント</a> •
    <a href="#インストール">💾 インストール</a> •
    <a href="#クイックスタート">⚡ クイックスタート</a> •
    <a href="#アダプター">🧩 アダプター</a> •
    <a href="#yaraの開始">🧬 YARA</a> •
    <a href="#github-action">🤖 CI/CD</a> •
    <a href="#faq">❓ FAQ</a>
  </strong>
</p>

<p align="center"><em>カバレッジバッジはコアライブラリ（<code>src/**</code>）を反映しています。アダプターは個別に測定されます。</em></p>

<!-- HERO END -->

---

<div align="center">

### 🎯 pompelmiを選ぶ理由

</div>

| 🔒 プライバシー第一 | ⚡ 超高速 | 🎨 開発者フレンドリー |
| --- | --- | --- |
| すべてのスキャンはプロセス内で実行されます。クラウド呼び出しなし、データ漏洩なし。ファイルはインフラストラクチャから出ません。 | ネットワークレイテンシーゼロのプロセス内スキャン。高スループットシナリオ用の構成可能な同時実行。 | TypeScript優先、ゼロ設定のデフォルト、ドロップインミドルウェア。5分以内で開始できます。 |

---

## 目次

- [概要](#概要)
- [ハイライト](#ハイライト)
- [なぜpompelmiなのか](#なぜpompelmiなのか)
- [他との比較](#他との比較)
- [開発者の声](#開発者の声)
- [pompelmiの特別な点](#pompelmiの特別な点)
- [ユースケース](#ユースケース)
- [インストール](#インストール)
- [クイックスタート](#クイックスタート)
  - [最小限のNode使用](#最小限のnode使用)
  - [Express](#express)
  - [Koa](#koa)
  - [Next.js（App Router）](#nextjs-app-router)
- [アダプター](#アダプター)
- [GitHub Action](#github-action)
- [設定](#設定)
- [YARAの開始](#yaraの開始)
- [セキュリティ注意事項](#セキュリティ注意事項)
- [テストと開発](#テストと開発)
- [FAQ](#faq)
- [コントリビューション](#コントリビューション)
- [ライセンス](#ライセンス)

---

## 🚀 概要

**pompelmi**は、信頼されていないファイルアップロードがディスクに書き込まれる**前に**スキャンします。Node.js用の小さなTypeScript優先のツールキットで、構成可能なスキャナー、詳細なZIP検査、オプションのシグネチャエンジンを備えています。

### 🎯 主な機能

**🔒 プライバシー設計** — 外部への呼び出しなし。バイトはプロセスから出ません

**🧩 構成可能なスキャナー** — ヒューリスティック＋シグネチャを組み合わせ。`stopOn`とタイムアウトを設定

**📦 ZIP強化** — トラバーサル/ボムガード、ポリグロット＆マクロヒント

**🔌 ドロップインアダプター** — Express、Koa、Fastify、Next.js

**📘 型安全＆軽量** — モダンTS、最小限のサーフェス、ツリーシェイク可能

**⚡ 依存関係ゼロ** — コアライブラリは最小限の依存関係、高速インストール

## ✨ ハイライト

**🛡️ リスクのあるアップロードを早期にブロック** — アップロードを_クリーン_、_疑わしい_、または_悪意のある_ものとして分類し、エッジで停止します。

**✅ 実際のガード** — 拡張子許可リスト、サーバー側MIMEスニッフィング（マジックバイト）、ファイルごとのサイズ制限、アンチボム制限を備えた**詳細なZIP**トラバーサル。

**🔍 組み込みスキャナー** — ドロップイン**CommonHeuristicsScanner**（PDFリスキーアクション、Officeマクロ、PEヘッダー）と**ZIPボムガード**。独自のスキャナーまたは小さな`{ scan(bytes) }`コントラクト経由でYARAを追加できます。

**⚙️ スキャンの組み合わせ** — `composeScanners()`を使用して、タイムアウトと短絡評価で複数のスキャナーを並列または順次実行します。

**☁️ クラウドゼロ** — スキャンはプロセス内で実行されます。バイトをプライベートに保ちます。GDPR/HIPAA準拠に最適。

**👨‍💻 DX優先** — TypeScript型、ESM/CJSビルド、小さなAPI、人気のWebフレームワーク用アダプター。

> **SEOキーワード:** ファイルアップロードセキュリティ、マルウェア検出、ウイルススキャナー、Node.jsセキュリティ、Expressミドルウェア、YARA統合、ZIPボム保護、ファイル検証、アップロードサニタイゼーション、脅威検出、セキュリティスキャナー、Node.jsアンチウイルス、ファイルスキャンライブラリ、TypeScriptセキュリティ、Next.jsセキュリティ、Koaミドルウェア、サーバー側検証、ファイル整合性チェック、マルウェア防止、安全なファイルアップロード

## 🧠 なぜpompelmiなのか

- **オンデバイス、プライベートスキャン** — 外部への呼び出しなし、データ共有なし。
- **早期ブロック** — ディスクへの書き込みや永続化の_前に_実行されます。
- **スタックに適合** — Express、Koa、Next.js用のドロップインアダプター（Fastifyプラグインはアルファ版）。
- **多層防御** — ZIPトラバーサル制限、比率制限、サーバー側MIMEスニッフィング、サイズ制限。
- **プラガブル検出** — 小さな`{ scan(bytes) }`コントラクトを介して独自のエンジン（例：YARA）を導入できます。

### 対象者は？

- サードパーティのAV APIにアップロードを送信できないチーム。
- インラインで予測可能な低レイテンシーの決定が必要なアプリ。
- デーモンではなく、シンプルで型安全なビルディングブロックを求める開発者。

## 🔍 他との比較

| 機能 | pompelmi | ClamAV / node‑clam | Cloud AV APIs |
| --- | --- | --- | --- |
| 完全にプロセス内で実行 | ✅ | ❌（別のデーモン） | ❌（ネットワーク呼び出し） |
| バイトがプライベートに保たれる | ✅ | ✅ | ❌ |
| 詳細なZIP制限＆MIMEスニッフ | ✅ | ✅（アーカイブスキャン） | ❓ 様々 |
