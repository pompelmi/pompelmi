<!-- Language Selector -->
<div align="center">

**Translations:** [English](../../README.md) | [Italiano](README.it.md) | [Français](README.fr.md) | [Español](README.es.md) | **Deutsch** | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [Português (BR)](README.pt-BR.md) | [Русский](README.ru.md) | [Türkçe](README.tr.md)

</div>

---

> 💡 **Hinweis zur Übersetzung:** Diese Dokumentation wurde ins Deutsche übersetzt, um die Zugänglichkeit zu verbessern. Technische Begriffe und Code-Beispiele wurden unverändert gelassen. Bei Unstimmigkeiten ist die [englische Version](../../README.md) maßgeblich.

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

---

<p align="center">

<strong>Schnelles Malware-Scannen für Datei-Uploads in Node.js</strong> — optionale <strong>YARA</strong>-Integration, ZIP-Tiefeninspektion und Plug-and-Play-Adapter für <em>Express</em>, <em>Koa</em> und <em>Next.js</em>. Privatsphäre von Grund auf. Typisiert. Klein.
</p>

**Schlüsselwörter:** Datei-Upload-Sicherheit · Malware-Erkennung · YARA · Node.js Middleware · Express · Koa · Next.js · ZIP-Bomben-Schutz

---

<div align="center">

## ⚡ **Schnellstart (Cloud)**

**Verwenden Sie Serverless oder können Sie ClamAV nicht installieren?**  
Nutzen Sie die **[Offizielle gehostete API auf RapidAPI](https://rapidapi.com/SonoTommy/api/pompelmi-malware-scanner)** →

✅ **Null Setup** • Keine Binärdateien zur Installation nötig  
✅ **Serverless-Ready** • Funktioniert auf AWS Lambda, Vercel, Netlify  
✅ **Auto-Skaliert** • Kein RAM/CPU-Overhead  
✅ **Eingebauter Schutz** • Automatische ZIP-Bomben-Erkennung

[**→ Jetzt auf RapidAPI starten**](https://rapidapi.com/SonoTommy/api/pompelmi-malware-scanner)

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
    <a href="https://pompelmi.github.io/pompelmi/">📚 Dokumentation</a> •
    <a href="#installation">💾 Installation</a> •
    <a href="#schnellstart">⚡ Schnellstart</a> •
    <a href="#adapter">🧩 Adapter</a> •
    <a href="#yara-erste-schritte">🧬 YARA</a> •
    <a href="#github-action">🤖 CI/CD</a> •
    <a href="#faq">❓ FAQ</a>
  </strong>
</p>

<p align="center"><em>Das Coverage-Badge spiegelt die Kernbibliothek (<code>src/**</code>) wider; Adapter werden separat gemessen.</em></p>

<!-- HERO END -->

---

<div align="center">

### 🎯 Warum pompelmi wählen?

</div>

| 🔒 Privatsphäre zuerst | ⚡ Blitzschnell | 🎨 Entwicklerfreundlich |
| --- | --- | --- |
| Alle Scans erfolgen im Prozess. Keine Cloud-Aufrufe, keine Datenlecks. Ihre Dateien verlassen nie Ihre Infrastruktur. | In-Process-Scanning mit null Netzwerklatenz. Konfigurierbare Parallelität für Hochdurchsatzszenarien. | TypeScript-first, Zero-Config-Standardwerte, Plug-and-Play-Middleware. Starten Sie in unter 5 Minuten. |

---

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Highlights](#highlights)
- [Warum pompelmi](#warum-pompelmi)
- [Wie es sich vergleicht](#wie-es-sich-vergleicht)
- [Was Entwickler sagen](#was-entwickler-sagen)
- [Was pompelmi besonders macht](#was-pompelmi-besonders-macht)
- [Anwendungsfälle](#anwendungsfälle)
- [Installation](#installation)
- [Schnellstart](#schnellstart)
  - [Minimale Node-Verwendung](#minimale-node-verwendung)
  - [Express](#express)
  - [Koa](#koa)
  - [Next.js (App Router)](#nextjs-app-router)
- [Adapter](#adapter)
- [GitHub Action](#github-action)
- [Konfiguration](#konfiguration)
- [YARA Erste Schritte](#yara-erste-schritte)
- [Sicherheitshinweise](#sicherheitshinweise)

- [Tests & Entwicklung](#tests--entwicklung)
- [FAQ](#faq)
- [Mitwirken](#mitwirken)
- [Lizenz](#lizenz)

---

## 🚀 Übersicht

**pompelmi** scannt nicht vertrauenswürdige Datei-Uploads **bevor** sie auf die Festplatte gelangen. Ein kleines, TypeScript-first-Toolkit für Node.js mit zusammensetzbaren Scannern, tiefer ZIP-Inspektion und optionalen Signatur-Engines.

### 🎯 Hauptmerkmale

**🔒 Privatsphäre von Grund auf** — keine ausgehenden Aufrufe; Bytes verlassen niemals Ihren Prozess

**🧩 Zusammensetzbare Scanner** — mischen Sie Heuristiken + Signaturen; setzen Sie `stopOn` und Timeouts

**📦 ZIP-Härtung** — Traversal-/Bomben-Schutz, Polyglott- und Makro-Hinweise

**🔌 Plug-and-Play-Adapter** — Express, Koa, Fastify, Next.js

**📘 Typisiert & klein** — modernes TS, minimale Oberfläche, tree-shakeable

**⚡ Null Abhängigkeiten** — Kernbibliothek hat minimale Abhängigkeiten, schnelle Installation

## ✨ Highlights

**🛡️ Blockieren Sie riskante Uploads frühzeitig** — klassifizieren Sie Uploads als _sauber_, _verdächtig_ oder _bösartig_ und stoppen Sie sie am Edge.

**✅ Echte Schutzmaßnahmen** — Erweiterungs-Whitelist, serverseitiges MIME-Sniffing (Magic Bytes), Dateigrößenbeschränkungen pro Datei und **tiefe ZIP**-Traversierung mit Anti-Bomben-Limits.

**🔍 Eingebaute Scanner** — Plug-and-Play **CommonHeuristicsScanner** (PDF-riskante Aktionen, Office-Makros, PE-Header) und **Zip-Bomben-Schutz**; fügen Sie Ihre eigenen hinzu oder YARA über einen kleinen `{ scan(bytes) }`-Vertrag.

**⚙️ Scanning zusammensetzen** — führen Sie mehrere Scanner parallel oder sequenziell mit Timeouts und Kurzschluss über `composeScanners()` aus.

**☁️ Null Cloud** — Scans laufen im Prozess. Halten Sie Bytes privat. Perfekt für GDPR/HIPAA-Compliance.

**👨‍💻 DX first** — TypeScript-Typen, ESM/CJS-Builds, kleine API, Adapter für beliebte Web-Frameworks.

> **SEO-Schlüsselwörter:** Datei-Upload-Sicherheit, Malware-Erkennung, Virenscanner, Node.js-Sicherheit, Express-Middleware, YARA-Integration, ZIP-Bomben-Schutz, Dateivalidierung, Upload-Bereinigung, Bedrohungserkennung, Sicherheitsscanner, Antivirus Node.js, Datei-Scan-Bibliothek, TypeScript-Sicherheit, Next.js-Sicherheit, Koa-Middleware, serverseitige Validierung, Dateiintegritätsprüfung, Malware-Prävention, sicherer Datei-Upload

## 🧠 Warum pompelmi?

- **On-Device, privates Scannen** – keine ausgehenden Aufrufe, kein Datenaustausch.
- **Blockiert frühzeitig** – läuft _bevor_ Sie auf die Festplatte schreiben oder etwas persistieren.
- **Passt zu Ihrem Stack** – Plug-and-Play-Adapter für Express, Koa, Next.js (Fastify-Plugin in Alpha).
- **Defense-in-Depth** – ZIP-Traversal-Limits, Verhältnis-Caps, serverseitiges MIME-Sniffing, Größenbeschränkungen.
- **Pluggable Detection** – bringen Sie Ihre eigene Engine mit (z.B. YARA) über einen kleinen `{ scan(bytes) }`-Vertrag.

### Für wen ist es gedacht?

- Teams, die Uploads nicht an Drittanbieter-AV-APIs senden können.
- Apps, die vorhersagbare, latenzarme Entscheidungen inline benötigen.
- Entwickler, die einfache, typisierte Bausteine statt eines Daemons wollen.

## 🔍 Wie es sich vergleicht

| Fähigkeit | pompelmi | ClamAV / node‑clam | Cloud AV APIs |
| --- | --- | --- | --- |
| Läuft vollständig im Prozess | ✅ | ❌ (separater Daemon) | ❌ (Netzwerkaufrufe) |
| Bytes bleiben privat | ✅ | ✅ | ❌ |
| Tiefe ZIP-Limits & MIME-Sniff | ✅ | ✅ (Archiv-Scan) | ❓ variiert |
