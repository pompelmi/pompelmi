<!-- Language Selector -->
<div align="center">

**Translations:** 
</div>

---

<p align="center">
  <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm version" src="https://img.shields.io/npm/v/pompelmi?label=version&color=0a7ea4&logo=npm"></a>  <a href="https://www.npmjs.com/package/pompelmi"><img alt="npm downloads" src="https://img.shields.io/npm/dm/pompelmi?label=downloads&color=6E9F18&logo=npm"></a>
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
    <a href="https://pompelmi.github.io/pompelmi/">📚 Dokümantasyon</a> •
    <a href="#kurulum">💾 Kurulum</a> •
    <a href="#hızlı-başlangıç">⚡ Hızlı Başlangıç</a> •
    <a href="#adaptörler">🧩 Adaptörler</a> •
    <a href="#yara-başlangıç">🧬 YARA</a> •
    <a href="#github-action">🤖 CI/CD</a> •
    <a href="#sss">❓ SSS</a>
  </strong>
</p>

<p align="center"><em>Coverage badge'i çekirdek kütüphaneyi (<code>src/**</code>) yansıtır; adaptörler ayrıca ölçülür.</em></p>

<!-- HERO END -->

---

<div align="center">

### 🎯 Neden pompelmi'yi Seçmelisiniz?

</div>

| 🔒 Önce Gizlilik | ⚡ Yıldırım Hızında | 🎨 Geliştirici Dostu |
| --- | --- | --- |
| Tüm tarama işlemi süreç içinde gerçekleşir. Bulut çağrısı yok, veri sızıntısı yok. Dosyalarınız asla altyapınızdan ayrılmaz. | Sıfır ağ gecikmesi ile süreç içi tarama. Yüksek verimlilik senaryoları için yapılandırılabilir eşzamanlılık. | TypeScript öncelikli, sıfır yapılandırma varsayılanları, hazır middleware. 5 dakika altında başlayın. |

---

## İçindekiler

- [Genel Bakış](#genel-bakış)
- [Öne Çıkanlar](#öne-çıkanlar)
- [Neden pompelmi](#neden-pompelmi)
- [Karşılaştırma](#karşılaştırma)
- [Geliştiriciler Ne Diyor](#geliştiriciler-ne-diyor)
- [pompelmi'yi Özel Kılan Nedir](#pompelmiyi-özel-kılan-nedir)
- [Kullanım Senaryoları](#kullanım-senaryoları)
- [Kurulum](#kurulum)
- [Hızlı Başlangıç](#hızlı-başlangıç)
  - [Minimal Node kullanımı](#minimal-node-kullanımı)
  - [Express](#express)
  - [Koa](#koa)
  - [Next.js (App Router)](#nextjs-app-router)
- [Adaptörler](#adaptörler)
- [GitHub Action](#github-action)
- [Yapılandırma](#yapılandırma)
- [YARA Başlangıç](#yara-başlangıç)
- [Güvenlik Notları](#güvenlik-notları)
- [Test ve Geliştirme](#test-ve-geliştirme)
- [SSS](#sss)
- [Katkıda Bulunma](#katkıda-bulunma)
- [Lisans](#lisans)

---

## 🚀 Genel Bakış

**pompelmi** güvenilmeyen dosya yüklemelerini diske yazmadan **önce** tarar. Node.js için birleştirilebilir tarayıcılar, derin ZIP incelemesi ve isteğe bağlı imza motorları ile küçük, TypeScript öncelikli bir araç seti.

### 🎯 Ana Özellikler

**🔒 Tasarımdan gelen gizlilik** — dışa bağlantı yok; baytlar sürecinizden asla ayrılmaz

**🧩 Birleştirilebilir tarayıcılar** — buluşsal yöntemler + imzaları karıştırın; `stopOn` ve zaman aşımlarını ayarlayın

**📦 ZIP sertleştirme** — traversal/bomba korumaları, polyglot ve makro ipuçları

**🔌 Hazır adaptörler** — Express, Koa, Fastify, Next.js

**📘 Tip güvenli ve küçük** — modern TS, minimal yüzey, tree-shakeable

**⚡ Sıfır bağımlılık** — çekirdek kütüphanenin minimum bağımlılığı var, hızlı kurulum

## ✨ Öne Çıkanlar

**🛡️ Riskli yüklemeleri erken engelleyin** — yüklemeleri _temiz_, _şüpheli_ veya _zararlı_ olarak sınıflandırın ve kenarda durdurun.

**✅ Gerçek korumalar** — uzantı izin listesi, sunucu taraflı MIME algılama (magic bytes), dosya başına boyut sınırları ve anti-bomba limitleri ile **derin ZIP** traversal.

**🔍 Yerleşik tarayıcılar** — hazır **CommonHeuristicsScanner** (PDF riskli eylemler, Office makroları, PE header) ve **Zip-bomb Guard**; kendi tarayıcınızı veya YARA'yı küçük bir `{ scan(bytes) }` sözleşmesi ile ekleyin.

**⚙️ Taramayı birleştirin** — zaman aşımları ve `composeScanners()` ile kısa devre yaparak paralel veya sıralı olarak birden fazla tarayıcı çalıştırın.

**☁️ Sıfır bulut** — taramalar süreç içinde çalışır. Baytları gizli tutun. GDPR/HIPAA uyumluluğu için mükemmel.

**👨‍💻 DX öncelikli** — TypeScript tipleri, ESM/CJS derlemeleri, küçük API, popüler web frameworkleri için adaptörler.

> **SEO Anahtar Kelimeleri:** dosya yükleme güvenliği, zararlı yazılım tespiti, virüs tarayıcı, Node.js güvenlik, Express middleware, YARA entegrasyonu, ZIP bomba koruması, dosya doğrulama, yükleme temizleme, tehdit tespiti, güvenlik tarayıcı, antivirus Node.js, dosya tarama kütüphanesi, TypeScript güvenlik, Next.js güvenlik, Koa middleware, sunucu tarafı doğrulama, dosya bütünlük kontrolü, zararlı yazılım önleme, güvenli dosya yükleme

## 🧠 Neden pompelmi?

- **Cihaz üzerinde, özel tarama** – dışa bağlantı yok, veri paylaşımı yok.
- **Erken engelleme** – diske yazmadan veya herhangi bir şeyi kalıcı hale getirmeden _önce_ çalışır.
- **Stack'inize uyar** – Express, Koa, Next.js için hazır adaptörler (Fastify eklentisi alpha'da).
- **Derinlemesine savunma** – ZIP traversal limitleri, oran sınırları, sunucu taraflı MIME algılama, boyut sınırları.
- **Takılabilir tespit** – küçük bir `{ scan(bytes) }` sözleşmesi ile kendi motorunuzu (örn. YARA) getirin.

### Kimin İçin?

- Yüklemeleri üçüncü taraf AV API'lerine gönderemeyen ekipler.
- Satır içinde öngörülebilir, düşük gecikmeli kararlar gerektiren uygulamalar.
- Daemon yerine basit, tip güvenli yapı taşları isteyen geliştiriciler.

## 🔍 Karşılaştırma

| Yetenek | pompelmi | ClamAV / node‑clam | Cloud AV APIs |
| --- | --- | --- | --- |
| Tamamen süreç içinde çalışır | ✅ | ❌ (ayrı daemon) | ❌ (ağ çağrıları) |
| Baytlar gizli kalır | ✅ | ✅ | ❌ |
| Derin ZIP limitleri ve MIME algılama | ✅ | ✅ (arşiv tarama) | ❓ değişir |
