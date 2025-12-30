<!-- Language Selector -->
<div align="center">

**Translations:** [English](../../README.md) | [Italiano](README.it.md) | [Français](README.fr.md) | [Español](README.es.md) | [Deutsch](README.de.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md) | [Português (BR)](README.pt-BR.md) | **Русский** | [Türkçe](README.tr.md)

</div>

---

> 💡 **Примечание о переводе:** Этот документ является переводом основного README на русский язык. Код, технические термины и названия команд оставлены без изменений для точности.

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

<strong>Быстрое сканирование загружаемых файлов на вредоносное ПО для Node.js</strong> — опциональная интеграция с <strong>YARA</strong>, глубокая проверка ZIP, и готовые адаптеры для <em>Express</em>, <em>Koa</em> и <em>Next.js</em>. Приватность по умолчанию. Типизированный. Компактный.
</p>

**Ключевые слова:** безопасность загрузки файлов · обнаружение вредоносного ПО · YARA · Node.js middleware · Express · Koa · Next.js · защита от ZIP-бомб

---

<div align="center">

## ⚡ **Быстрый Старт (Облако)**

**Используете Serverless или не можете установить ClamAV?**  
Используйте **[Официальный Хостинг API на RapidAPI](https://rapidapi.com/SonoTommy/api/pompelmi-malware-scanner)** →

✅ **Нулевая Настройка** • Не требуется установка бинарных файлов  
✅ **Готов для Serverless** • Работает на AWS Lambda, Vercel, Netlify  
✅ **Авто-Масштабирование** • Без накладных расходов RAM/CPU  
✅ **Встроенная Защита** • Автоматическое обнаружение ZIP-бомб

[**→ Начать на RapidAPI**](https://rapidapi.com/SonoTommy/api/pompelmi-malware-scanner)

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
    <a href="https://pompelmi.github.io/pompelmi/">📚 Документация</a> •
    <a href="#установка">💾 Установка</a> •
    <a href="#быстрый-старт">⚡ Быстрый Старт</a> •
    <a href="#адаптеры">🧩 Адаптеры</a> •
    <a href="#yara-начало-работы">🧬 YARA</a> •
    <a href="#github-action">🤖 CI/CD</a> •
    <a href="#faq">❓ FAQ</a>
  </strong>
</p>

<p align="center"><em>Значок покрытия отражает основную библиотеку (<code>src/**</code>); адаптеры измеряются отдельно.</em></p>

<!-- HERO END -->

---

<div align="center">

### 🎯 Почему выбрать pompelmi?

</div>

| 🔒 Приватность Прежде Всего | ⚡ Молниеносная Скорость | 🎨 Удобство для Разработчиков |
| --- | --- | --- |
| Все сканирование происходит внутри процесса. Никаких облачных вызовов, никаких утечек данных. Ваши файлы никогда не покидают вашу инфраструктуру. | Внутрипроцессное сканирование с нулевой задержкой сети. Настраиваемая параллельность для сценариев с высокой пропускной способностью. | TypeScript в первую очередь, конфигурация по умолчанию, встраиваемый middleware. Начните работу менее чем за 5 минут. |

---

## Содержание

- [Обзор](#обзор)
- [Особенности](#особенности)
- [Почему pompelmi](#почему-pompelmi)
- [Как это сравнивается](#как-это-сравнивается)
- [Что говорят разработчики](#что-говорят-разработчики)
- [Что делает pompelmi особенным](#что-делает-pompelmi-особенным)
- [Варианты использования](#варианты-использования)
- [Установка](#установка)
- [Быстрый Старт](#быстрый-старт)
  - [Минимальное использование Node](#минимальное-использование-node)
  - [Express](#express)
  - [Koa](#koa)
  - [Next.js (App Router)](#nextjs-app-router)
- [Адаптеры](#адаптеры)
- [GitHub Action](#github-action)
- [Конфигурация](#конфигурация)
- [YARA Начало Работы](#yara-начало-работы)
- [Заметки о безопасности](#заметки-о-безопасности)

- [Тестирование и Разработка](#тестирование-и-разработка)
- [FAQ](#faq)
- [Вклад](#вклад)
- [Лицензия](#лицензия)

---

## 🚀 Обзор

**pompelmi** сканирует ненадежные загрузки файлов **до того**, как они попадут на диск. Компактный инструментарий для Node.js с приоритетом TypeScript, с компонуемыми сканерами, глубокой проверкой ZIP и опциональными движками сигнатур.

### 🎯 Ключевые Возможности

**🔒 Приватность по дизайну** — никаких исходящих вызовов; байты никогда не покидают ваш процесс

**🧩 Компонуемые сканеры** — смешивайте эвристику + сигнатуры; устанавливайте `stopOn` и тайм-ауты

**📦 Усиление ZIP** — защита от обхода путей/бомб, подсказки о полиглотах и макросах

**🔌 Готовые адаптеры** — Express, Koa, Fastify, Next.js

**📘 Типизированный и компактный** — современный TS, минимальная поверхность, поддержка tree-shaking

**⚡ Нулевые зависимости** — основная библиотека имеет минимум зависимостей, быстрая установка

## ✨ Особенности

**🛡️ Блокируйте рискованные загрузки рано** — классифицируйте загрузки как _чистые_, _подозрительные_ или _вредоносные_ и останавливайте их на краю.

**✅ Реальные защиты** — белый список расширений, серверное определение MIME (магические байты), ограничения размера для каждого файла и **глубокий обход ZIP** с ограничениями против бомб.

**🔍 Встроенные сканеры** — готовый к использованию **CommonHeuristicsScanner** (рискованные действия PDF, макросы Office, заголовок PE) и **Защита от Zip-бомб**; добавьте свой собственный или YARA через крошечный контракт `{ scan(bytes) }`.

**⚙️ Компоновка сканирования** — запускайте несколько сканеров параллельно или последовательно с тайм-аутами и прерыванием через `composeScanners()`.

**☁️ Нулевое облако** — сканирование выполняется внутри процесса. Храните байты в секрете. Идеально для соответствия GDPR/HIPAA.

**👨‍💻 DX в первую очередь** — типы TypeScript, сборки ESM/CJS, крошечный API, адаптеры для популярных веб-фреймворков.

> **SEO Ключевые слова:** безопасность загрузки файлов, обнаружение вредоносного ПО, антивирусный сканер, безопасность Node.js, Express middleware, интеграция YARA, защита от ZIP-бомб, проверка файлов, санитизация загрузок, обнаружение угроз, сканер безопасности, антивирус Node.js, библиотека сканирования файлов, безопасность TypeScript, безопасность Next.js, Koa middleware, серверная валидация, проверка целостности файлов, предотвращение вредоносного ПО, безопасная загрузка файлов

## 🧠 Почему pompelmi?

- **Сканирование на устройстве, приватное** – никаких исходящих вызовов, никакого обмена данными.
- **Блокирует рано** – работает _до того_, как вы запишете на диск или сохраните что-либо.
- **Подходит для вашего стека** – готовые адаптеры для Express, Koa, Next.js (плагин Fastify в альфа-версии).
- **Защита в глубину** – ограничения обхода ZIP, ограничения соотношений, серверное определение MIME, ограничения размера.
- **Подключаемое обнаружение** – используйте свой собственный движок (например, YARA) через крошечный контракт `{ scan(bytes) }`.

### Для кого это?

- Команды, которые не могут отправлять загрузки в сторонние AV API.
- Приложения, которым нужны предсказуемые решения с низкой задержкой в режиме реального времени.
- Разработчики, которым нужны простые, типизированные строительные блоки вместо демона.

## 🔍 Как это сравнивается

| Возможность | pompelmi | ClamAV / node‑clam | Облачные AV API |
| --- | --- | --- | --- |
| Работает полностью внутри процесса | ✅ | ❌ (отдельный демон) | ❌ (сетевые вызовы) |
| Байты остаются приватными | ✅ | ✅ | ❌ |
| Глубокие ограничения ZIP и определение MIME | ✅ | ✅ (сканирование архивов) | ❓ варьируется |
