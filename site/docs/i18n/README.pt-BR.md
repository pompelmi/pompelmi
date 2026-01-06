<!-- Language Selector -->
<div align="center">

**Translations:** [English](../../README.md) | [Italiano](README.it.md) | [Français](README.fr.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | **Português (BR)** | [Русский](README.ru.md) | [Türkçe](README.tr.md)

</div>

---

> 💡 **Nota de tradução:** Esta é uma tradução para o português brasileiro do README original. O código e termos técnicos foram mantidos em inglês para consistência.

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

<strong>Verificação rápida de malware em uploads de arquivo para Node.js</strong> — integração opcional com <strong>YARA</strong>, inspeção profunda de ZIP e adaptadores prontos para <em>Express</em>, <em>Koa</em> e <em>Next.js</em>. Privado por design. Tipado. Compacto.
</p>

**Palavras-chave:** segurança de upload de arquivo · detecção de malware · YARA · middleware Node.js · Express · Koa · Next.js · proteção contra ZIP bomb

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
    <a href="https://pompelmi.github.io/pompelmi/">📚 Documentação</a> •
    <a href="#instalação">💾 Instalar</a> •
    <a href="#início-rápido">⚡ Início Rápido</a> •
    <a href="#adaptadores">🧩 Adaptadores</a> •
    <a href="#yara-primeiros-passos">🧬 YARA</a> •
    <a href="#github-action">🤖 CI/CD</a> •
    <a href="#faq">❓ FAQ</a>
  </strong>
</p>

<p align="center"><em>O badge de cobertura reflete a biblioteca principal (<code>src/**</code>); adaptadores são medidos separadamente.</em></p>

<!-- HERO END -->

---

<div align="center">

### 🎯 Por Que Escolher pompelmi?

</div>

| 🔒 Privacidade em Primeiro Lugar | ⚡ Extremamente Rápido | 🎨 Amigável ao Desenvolvedor |
| --- | --- | --- |
| Toda a verificação acontece no processo. Sem chamadas à nuvem, sem vazamento de dados. Seus arquivos nunca saem de sua infraestrutura. | Verificação no processo com latência de rede zero. Concorrência configurável para cenários de alta taxa de transferência. | TypeScript em primeiro lugar, padrões zero-config, middleware plug-and-play. Comece em menos de 5 minutos. |

---

## Índice

- [Visão Geral](#visão-geral)
- [Destaques](#destaques)
- [Por Que pompelmi](#por-que-pompelmi)
- [Como Se Compara](#como-se-compara)
- [O Que os Desenvolvedores Dizem](#o-que-os-desenvolvedores-dizem)
- [O Que Torna pompelmi Especial](#o-que-torna-pompelmi-especial)
- [Casos de Uso](#casos-de-uso)
- [Instalação](#instalação)
- [Início Rápido](#início-rápido)
  - [Uso Mínimo em Node](#uso-mínimo-em-node)
  - [Express](#express)
  - [Koa](#koa)
  - [Next.js (App Router)](#nextjs-app-router)
- [Adaptadores](#adaptadores)
- [GitHub Action](#github-action)
- [Configuração](#configuração)
- [YARA Primeiros Passos](#yara-primeiros-passos)
- [Notas de Segurança](#notas-de-segurança)
- [Testes e Desenvolvimento](#testes-e-desenvolvimento)
- [FAQ](#faq)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## 🚀 Visão Geral

**pompelmi** verifica uploads de arquivos não confiáveis **antes** que eles cheguem ao disco. Um kit de ferramentas compacto, focado em TypeScript para Node.js com scanners componíveis, inspeção profunda de ZIP e motores de assinatura opcionais.

### 🎯 Recursos Principais

**🔒 Privado por design** — sem chamadas externas; bytes nunca saem do seu processo

**🧩 Scanners componíveis** — misture heurísticas + assinaturas; defina `stopOn` e timeouts

**📦 Endurecimento de ZIP** — proteções contra traversal/bomb, dicas de polyglot e macro

**🔌 Adaptadores plug-and-play** — Express, Koa, Fastify, Next.js

**📘 Tipado e compacto** — TS moderno, superfície mínima, tree-shakeable

**⚡ Zero dependências** — biblioteca principal tem dependências mínimas, instalação rápida

## ✨ Destaques

**🛡️ Bloqueie uploads arriscados cedo** — classifique uploads como _limpo_, _suspeito_ ou _malicioso_ e pare-os na borda.

**✅ Proteções reais** — lista de permissões de extensões, detecção MIME no servidor (magic bytes), limites de tamanho por arquivo e **inspeção profunda de ZIP** com limites anti-bomb.

**🔍 Scanners integrados** — **CommonHeuristicsScanner** plug-and-play (ações arriscadas em PDF, macros do Office, cabeçalho PE) e **Proteção contra Zip-bomb**; adicione o seu próprio ou YARA através de um contrato simples `{ scan(bytes) }`.

**⚙️ Componha a verificação** — execute múltiplos scanners em paralelo ou sequencialmente com timeouts e interrupção rápida via `composeScanners()`.

**☁️ Zero nuvem** — verificações executam no processo. Mantenha bytes privados. Perfeito para conformidade GDPR/HIPAA.

**👨‍💻 DX em primeiro lugar** — tipos TypeScript, builds ESM/CJS, API compacta, adaptadores para frameworks web populares.

> **Palavras-chave SEO:** segurança de upload de arquivo, detecção de malware, scanner de vírus, segurança Node.js, middleware Express, integração YARA, proteção ZIP bomb, validação de arquivo, sanitização de upload, detecção de ameaças, scanner de segurança, antivírus Node.js, biblioteca de verificação de arquivos, segurança TypeScript, segurança Next.js, middleware Koa, validação do lado do servidor, verificação de integridade de arquivo, prevenção de malware, upload seguro de arquivo

## 🧠 Por Que pompelmi?

- **Verificação privada no dispositivo** – sem chamadas externas, sem compartilhamento de dados.
- **Bloqueia cedo** – executa _antes_ de você gravar no disco ou persistir qualquer coisa.
- **Se encaixa no seu stack** – adaptadores plug-and-play para Express, Koa, Next.js (plugin Fastify em alpha).
- **Defesa em profundidade** – limites de traversal ZIP, limites de razão, detecção MIME no servidor, limites de tamanho.
- **Detecção plugável** – traga seu próprio motor (ex: YARA) através de um contrato simples `{ scan(bytes) }`.

### Para quem é?

- Equipes que não podem enviar uploads para APIs AV de terceiros.
- Apps que precisam de decisões previsíveis de baixa latência inline.
- Desenvolvedores que querem blocos de construção simples e tipados ao invés de um daemon.

## 🔍 Como Se Compara

| Capacidade | pompelmi | ClamAV / node‑clam | APIs AV em Nuvem |
| --- | --- | --- | --- |
| Executa completamente no processo | ✅ | ❌ (daemon separado) | ❌ (chamadas de rede) |
| Bytes permanecem privados | ✅ | ✅ | ❌ |
| Limites profundos de ZIP e detecção MIME | ✅ | ✅ (verificação de arquivo) | ❓ varia |
