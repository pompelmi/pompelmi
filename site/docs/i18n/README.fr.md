
---
## 💬 Ce que Disent les Développeurs

> "pompelmi a rendu incroyablement facile l'ajout de l'analyse de malware à notre API Express. Le support TypeScript est fantastique !"
> — Développeur utilisant pompelmi en production

> "Enfin, une solution d'analyse de fichiers qui ne nécessite pas d'envoyer les données de nos utilisateurs à des tiers. Parfait pour la conformité GDPR."
> — Ingénieur sécurité dans une startup de santé

> "L'intégration YARA est transparente. Nous sommes passés du prototype à la production en moins d'une semaine."
> — Ingénieur DevSecOps

_Vous voulez partager votre expérience ? 
---

### 🏠 Option B : Bibliothèque Locale (Nécessite des Dépendances Natives)

**Parfait pour :** Déploiements sur site, VM, serveurs dédiés ou lorsque vous avez besoin d'un contrôle et d'une confidentialité complets.

**Exigences :**
- Node.js 18+
- Optionnel : binaires ClamAV (pour l'analyse basée sur les signatures)
- Optionnel : bibliothèques YARA (pour les règles personnalisées)

<table>
<tr>
<td><b>npm</b></td>
<td><code>npm install pompelmi</code></td>
</tr>
<tr>
<td><b>pnpm</b></td>
<td><code>pnpm add pompelmi</code></td>
</tr>
<tr>
<td><b>yarn</b></td>
<td><code>yarn add pompelmi</code></td>
</tr>
<tr>
<td><b>bun</b></td>
<td><code>bun add pompelmi</code></td>
</tr>
</table>

#### 📦 Adaptateurs de Frameworks Optionnels

```bash
# Express
npm i @pompelmi/express-middleware

# Koa
npm i @pompelmi/koa-middleware

# Next.js
npm i @pompelmi/next-upload

# Fastify (alpha)
npm i @pompelmi/fastify-plugin
```

> **Note :** La bibliothèque principale fonctionne de manière autonome. Installez les adaptateurs uniquement si vous utilisez des frameworks spécifiques.

> Dépendances de développement optionnelles utilisées dans les exemples :
>
> ```bash
> npm i -D tsx express multer @koa/router @koa/multer koa next
> ```

---

## ⚡ Démarrage Rapide

**En un coup d'œil (politique + analyseurs)**

```ts
// Composez des analyseurs intégrés (pas d'EICAR). Ajoutez optionnellement les vôtres/YARA.
import { CommonHeuristicsScanner, createZipBombGuard, composeScanners } from 'pompelmi';

export const policy = {
  includeExtensions: ['zip','png','jpg','jpeg','pdf'],
  allowedMimeTypes: ['application/zip','image/png','image/jpeg','application/pdf','text/plain'],
  maxFileSizeBytes: 20 * 1024 * 1024,
  timeoutMs: 5000,
  concurrency: 4,
  failClosed: true,
  onScanEvent: (ev: unknown) => console.log('[scan]', ev)
};

export const scanner = composeScanners(
  [
    ['zipGuard', createZipBombGuard({ maxEntries: 512, maxTotalUncompressedBytes: 100 * 1024 * 1024, maxCompressionRatio: 12 })],
    ['heuristics', CommonHeuristicsScanner],
    // ['yara', YourYaraScanner],
  ],
  { parallel: false, stopOn: 'suspicious', timeoutMsPerScanner: 1500, tagSourceName: true }
);
```

### Usage minimal avec Node

```ts
import { scanFile } from 'pompelmi';

const res = await scanFile('path/to/file.zip'); // ou tout fichier
console.log(res.verdict); // "clean" | "suspicious" | "malicious"
```

> Voir `examples/scan-one-file.ts` pour un script exécutable :
>
> ```bash
> pnpm tsx examples/scan-one-file.ts ./path/to/file
> ```

### Express

```ts
import express from 'express';
import multer from 'multer';
import { createUploadGuard } from '@pompelmi/express-middleware';
import { policy, scanner } from './security'; // l'extrait ci-dessus

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: policy.maxFileSizeBytes } });

app.post('/upload', upload.any(), createUploadGuard({ ...policy, scanner }), (req, res) => {
  res.json({ ok: true, scan: (req as any).pompelmi ?? null });
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

### Koa

```ts
import Koa from 'koa';
import Router from '@koa/router';
import multer from '@koa/multer';
import { createKoaUploadGuard } from '@pompelmi/koa-middleware';
import { policy, scanner } from './security';

const app = new Koa();
const router = new Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: policy.maxFileSizeBytes } });

router.post('/upload', upload.any(), createKoaUploadGuard({ ...policy, scanner }), (ctx) => {
  ctx.body = { ok: true, scan: (ctx as any).pompelmi ?? null };
});

app.use(router.routes()).use(router.allowedMethods());
app.listen(3003, () => console.log('http://localhost:3003'));
```

### Next.js (App Router)

```ts
// app/api/upload/route.ts
import { createNextUploadHandler } from '@pompelmi/next-upload';
import { policy, scanner } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = createNextUploadHandler({ ...policy, scanner });
```

---

## 🤖 GitHub Action

Exécutez **pompelmi** en CI pour scanner les fichiers du référentiel ou les artifacts construits.

**Usage minimal**
```yaml
name: Security scan (pompelmi)
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scan repository with pompelmi
        uses: pompelmi/pompelmi/.github/actions/pompelmi-scan@v1
        with:
          path: .
          deep_zip: true
          fail_on_detect: true
```

**Scanner un seul artifact**
```yaml
- uses: pompelmi/pompelmi/.github/actions/pompelmi-scan@v1
  with:
    artifact: build.zip
    deep_zip: true
    fail_on_detect: true
```

**Entrées**
| Entrée | Défaut | Description |
| --- | --- | --- |
| `path` | `.` | Répertoire à scanner. |
| `artifact` | `""` | Fichier/archive unique à scanner. |
| `yara_rules` | `""` | Chemin glob vers les règles YARA (ex. `rules/*.yar`). |
| `deep_zip` | `true` | Activer l'inspection profonde des archives imbriquées. |
| `max_depth` | `3` | Profondeur maximale des archives imbriquées. |
| `fail_on_detect` | `true` | Échouer le job si des détections se produisent. |

> L'Action se trouve dans ce référentiel à `.github/actions/pompelmi-scan`. Une fois publiée sur le Marketplace, les consommateurs peuvent copier les extraits ci-dessus tels quels.

---

## 🧩 Adaptateurs

Utilisez l'adaptateur qui correspond à votre framework web. Tous les adaptateurs partagent les mêmes options de politique et le même contrat d'analyse.

<p align="center">
  <img src="https://img.shields.io/badge/Express-✓-000000?style=flat-square&logo=express" alt="Express">
  <img src="https://img.shields.io/badge/Koa-✓-33333D?style=flat-square&logo=koa" alt="Koa">
  <img src="https://img.shields.io/badge/Next.js-✓-000000?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/Fastify-alpha-000000?style=flat-square&logo=fastify" alt="Fastify">
  <img src="https://img.shields.io/badge/NestJS-planned-E0234E?style=flat-square&logo=nestjs" alt="NestJS">
  <img src="https://img.shields.io/badge/Remix-planned-000000?style=flat-square&logo=remix" alt="Remix">
  <img src="https://img.shields.io/badge/hapi-planned-F26D00?style=flat-square" alt="hapi">
  <img src="https://img.shields.io/badge/SvelteKit-planned-FF3E00?style=flat-square&logo=svelte" alt="SvelteKit">
</p>

| Framework | Package | Statut |
| --- | --- | --- |
| Express | `@pompelmi/express-middleware` | ✅ alpha |
| Koa | `@pompelmi/koa-middleware` | ✅ alpha |
| Next.js (App Router) | `@pompelmi/next-upload` | ✅ alpha |
| Fastify | `@pompelmi/fastify-plugin` | 🚧 alpha |
| NestJS | nestjs | 📋 prévu |
| Remix | remix | 📋 prévu |
| hapi | hapi plugin | 📋 prévu |
| SvelteKit | sveltekit | 📋 prévu |

---

## 🗺️ Diagrammes

### Flux d'analyse de téléchargement
```mermaid
flowchart TD
  A["Le client télécharge le(s) fichier(s)"] --> B["Route de l'Application Web"]
  B --> C{"Pré-filtres<br/>(ext, taille, MIME)"}
  C -- échec --> X["HTTP 4xx"]
  C -- réussite --> D{"Est ZIP?"}
  D -- oui --> E["Itérer les entrées<br/>(limites & scan)"]
  E --> F{"Verdict?"}
  D -- non --> F{"Scanner les octets"}
  F -- malveillant/suspect --> Y["HTTP 422 bloqué"]
  F -- propre --> Z["HTTP 200 ok + résultats"]
```
<details>
<summary>Source Mermaid</summary>

```mermaid
flowchart TD
  A["Le client télécharge le(s) fichier(s)"] --> B["Route de l'Application Web"]
  B --> C{"Pré-filtres<br/>(ext, taille, MIME)"}
  C -- échec --> X["HTTP 4xx"]
  C -- réussite --> D{"Est ZIP?"}
  D -- oui --> E["Itérer les entrées<br/>(limites & scan)"]
  E --> F{"Verdict?"}
  D -- non --> F{"Scanner les octets"}
  F -- malveillant/suspect --> Y["HTTP 422 bloqué"]
  F -- propre --> Z["HTTP 200 ok + résultats"]
```
</details>

### Séquence (App ↔ pompelmi ↔ YARA)
```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant A as Route App (/upload)
  participant P as pompelmi (adaptateur)
  participant Y as Moteur YARA

  U->>A: POST multipart/form-data
  A->>P: guard(files, policies)
  P->>P: Détection MIME + vérif. taille + ext
  alt Archive ZIP
    P->>P: dépaqueter les entrées avec limites
  end
  P->>Y: scan(bytes)
  Y-->>P: matches[]
  P-->>A: verdict (clean/suspicious/malicious)
  A-->>U: 200 ou 4xx/422 avec raison
```
<details>
<summary>Source Mermaid</summary>

```mermaid
sequenceDiagram
  participant U as Utilisateur
  participant A as Route App (/upload)
  participant P as pompelmi (adaptateur)
  participant Y as Moteur YARA

  U->>A: POST multipart/form-data
  A->>P: guard(files, policies)
  P->>P: Détection MIME + vérif. taille + ext
  alt Archive ZIP
    P->>P: dépaqueter les entrées avec limites
  end
  P->>Y: scan(bytes)
  Y-->>P: matches[]
  P-->>A: verdict (clean/suspicious/malicious)
  A-->>U: 200 ou 4xx/422 avec raison
```
</details>

### Composants (monorepo)
```mermaid
flowchart LR
  subgraph Repo
    core["pompelmi (core)"]
    express["@pompelmi/express-middleware"]
    koa["@pompelmi/koa-middleware"]
    next["@pompelmi/next-upload"]
    fastify(("fastify-plugin · prévu"))
    nest(("nestjs · prévu"))
    remix(("remix · prévu"))
    hapi(("hapi-plugin · prévu"))
    svelte(("sveltekit · prévu"))
  end
  core --> express
  core --> koa
  core --> next
  core -.-> fastify
  core -.-> nest
  core -.-> remix
  core -.-> hapi
  core -.-> svelte
```
<details>
<summary>Source Mermaid</summary>

```mermaid
flowchart LR
  subgraph Repo
    core["pompelmi (core)"]
    express["@pompelmi/express-middleware"]
    koa["@pompelmi/koa-middleware"]
    next["@pompelmi/next-upload"]
    fastify(("fastify-plugin · prévu"))
    nest(("nestjs · prévu"))
    remix(("remix · prévu"))
    hapi(("hapi-plugin · prévu"))
    svelte(("sveltekit · prévu"))
  end
  core --> express
  core --> koa
  core --> next
  core -.-> fastify
  core -.-> nest
  core -.-> remix
  core -.-> hapi
  core -.-> svelte
```
</details>

---

## ⚙️ Configuration

Tous les adaptateurs acceptent un ensemble commun d'options :

| Option | Type (TS) | Objectif |
| --- | --- | --- |
| `scanner` | `{ scan(bytes: Uint8Array): Promise<Match[]> }` | Votre moteur d'analyse. Retournez `[]` quand propre ; non vide pour signaler. |
| `includeExtensions` | `string[]` | Liste blanche des extensions de fichiers. Évaluée sans tenir compte de la casse. |
| `allowedMimeTypes` | `string[]` | Liste blanche des types MIME après détection par magic bytes. |
| `maxFileSizeBytes` | `number` | Limite de taille par fichier. Les fichiers trop volumineux sont rejetés tôt. |
| `timeoutMs` | `number` | Timeout de scan par fichier ; protège contre les analyseurs bloqués. |
| `concurrency` | `number` | Combien de fichiers scanner en parallèle. |
| `failClosed` | `boolean` | Si `true`, les erreurs/timeouts bloquent le téléchargement. |
| `onScanEvent` | `(event: unknown) => void` | Hook de télémétrie optionnel pour logging/métriques. |

**Recettes communes**

Autoriser uniquement les images jusqu'à 5 Mo :

```ts
includeExtensions: ['png','jpg','jpeg','webp'],
allowedMimeTypes: ['image/png','image/jpeg','image/webp'],
maxFileSizeBytes: 5 * 1024 * 1024,
failClosed: true,
```

---

## ✅ Liste de contrôle de production

- [ ] **Limiter la taille des fichiers** de manière agressive (`maxFileSizeBytes`).
- [ ] **Restreindre les extensions et MIME** à ce dont votre application a vraiment besoin.
- [ ] **Définir `failClosed: true` en production** pour bloquer sur les timeouts/erreurs.
- [ ] **Gérer les ZIP avec précaution** (activer ZIP profond, garder l'imbrication faible, plafonner les tailles d'entrée).
- [ ] **Composer les analyseurs** avec `composeScanners()` et activer `stopOn` pour échouer rapidement sur les détections précoces.
- [ ] **Logger les événements de scan** (`onScanEvent`) et surveiller les pics.
- [ ] **Exécuter les scans dans un processus/conteneur séparé** pour la défense en profondeur lorsque c'est possible.
- [ ] **Assainir les noms et chemins de fichiers** si vous persistez les téléchargements.
- [ ] **Préférer le stockage en mémoire + post-traitement** ; évitez d'écrire des octets non fiables avant la validation de la politique.
- [ ] **Ajouter le scan CI** avec la GitHub Action pour détecter les mauvais fichiers dans les référentiels/artifacts.

---

## 🧬 Démarrage avec YARA

YARA vous permet de détecter du contenu suspect ou malveillant en utilisant des règles de correspondance de motifs.  
**pompelmi** traite les correspondances YARA comme des signaux que vous pouvez mapper à vos propres verdicts  
(par exemple, marquer les règles de haute confiance comme `malicious`, les heuristiques comme `suspicious`).

> **Statut :** Optionnel. Vous pouvez exécuter sans YARA. Si vous l'adoptez, gardez vos règles petites, limitées dans le temps et adaptées à votre modèle de menace.

### Règles de démarrage

Voici trois exemples de règles que vous pouvez adapter :

`rules/starter/eicar.yar`
```yar
rule EICAR_Test_File
{
    meta:
        description = "Chaîne de test antivirus EICAR (sûre)"
        reference   = "https://www.eicar.org"
        confidence  = "high"
        verdict     = "malicious"
    strings:
        $eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    condition:
        $eicar
}
```

`rules/starter/pdf_js.yar`
```yar
rule PDF_JavaScript_Embedded
{
    meta:
        description = "Le PDF contient du JavaScript embarqué (heuristique)"
        confidence  = "medium"
        verdict     = "suspicious"
    strings:
        $magic = { 25 50 44 46 } // "%PDF"
        $js1 = "/JavaScript" ascii
        $js2 = "/JS" ascii
        $open = "/OpenAction" ascii
        $aa = "/AA" ascii
    condition:
        uint32(0) == 0x25504446 and ( $js1 or $js2 ) and ( $open or $aa )
}
```

`rules/starter/office_macros.yar`
```yar
rule Office_Macro_Suspicious_Words
{
    meta:
        description = "Heuristique : mots-clés de macro VBA suspects"
        confidence  = "medium"
        verdict     = "suspicious"
    strings:
        $s1 = /Auto(Open|Close)/ nocase
        $s2 = "Document_Open" nocase ascii
        $s3 = "CreateObject(" nocase ascii
        $s4 = "WScript.Shell" nocase ascii
        $s5 = "Shell(" nocase ascii
        $s6 = "Sub Workbook_Open()" nocase ascii
    condition:
        2 of ($s*)
}
```

> Ce sont des **exemples**. Attendez-vous à quelques faux positifs ; ajustez à votre application.

### Intégration minimale (contrat d'adaptateur)

Si vous utilisez une liaison YARA (par ex., `@automattic/yara`), enveloppez-la derrière le contrat `scanner` :

```ts
// Exemple d'adaptateur de scanner YARA (pseudo-code)
import * as Y from '@automattic/yara';

// Compilez vos règles depuis le disque au démarrage (recommandé)
// const sources = await fs.readFile('rules/starter/*.yar', 'utf8');
// const compiled = await Y.compile(sources);

export const YourYaraScanner = {
  async scan(bytes: Uint8Array) {
    // const matches = await compiled.scan(bytes, { timeout: 1500 });
    const matches = []; // branchez votre moteur ici
    // Mapper à la structure attendue par votre application ; retournez [] quand propre.
    return matches.map((m: any) => ({
      rule: m.rule,
      meta: m.meta ?? {},
      tags: m.tags ?? [],
    }));
  }
};
```

Ensuite, incluez-le dans votre scanner composé :

```ts
import { composeScanners, CommonHeuristicsScanner } from 'pompelmi';
// import { YourYaraScanner } from './yara-scanner';

export const scanner = composeScanners(
  [
    ['heuristics', CommonHeuristicsScanner],
    // ['yara', YourYaraScanner],
  ],
  { parallel: false, stopOn: 'suspicious', timeoutMsPerScanner: 1500, tagSourceName: true }
);
```

### Suggestion de politique (mapper les correspondances → verdict)

- **malicious** : règles de haute confiance (par ex., `EICAR_Test_File`)
- **suspicious** : règles heuristiques (par ex., JavaScript PDF, mots-clés de macro)
- **clean** : aucune correspondance

Combinez YARA avec la détection MIME, les limites de sécurité ZIP et des limites strictes de taille/temps.

## 🧪 Test rapide (sans EICAR)

Utilisez les exemples ci-dessus, puis envoyez un **PDF minimal** qui contient des tokens risqués (cela déclenche les heuristiques intégrées).

**1) Créer un petit PDF avec des actions risquées**

Linux :
```bash
printf '%%PDF-1.7\n1 0 obj\n<< /OpenAction 1 0 R /AA << /JavaScript (alert(1)) >> >>\nendobj\n%%EOF\n' > risky.pdf
```

macOS :
```bash
printf '%%PDF-1.7\n1 0 obj\n<< /OpenAction 1 0 R /AA << /JavaScript (alert(1)) >> >>\nendobj\n%%EOF\n' > risky.pdf
```

**2) Envoyez-le à votre endpoint**

Express (par défaut du Démarrage Rapide) :
```bash
curl -F "file=@risky.pdf;type=application/pdf" http://localhost:3000/upload -i
```

Vous devriez voir un HTTP **422 Unprocessable Entity** (bloqué par la politique). Les fichiers propres renvoient **200 OK**. Les échecs de pré-filtre (taille/ext/MIME) devraient renvoyer un **4xx**. Adaptez ces conventions à votre application selon les besoins.

---

## 🔒 Notes de Sécurité

- La bibliothèque **lit** les octets ; elle n'exécute jamais les fichiers.
- Les détections YARA dépendent des **règles que vous fournissez** ; attendez-vous à quelques faux positifs/négatifs.
- L'analyse ZIP applique des limites (entrées, taille par entrée, total décompressé, imbrication) pour réduire le risque de bombe d'archive.
- Préférez exécuter les scans dans un **processus/conteneur dédié** pour la défense en profondeur.

---

## Versions & sécurité

- **Changelog / versions :** voir [GitHub Releases](https://github.com/pompelmi/pompelmi/releases).
- **Divulgations de sécurité :** veuillez utiliser [GitHub Security Advisories](https://github.com/pompelmi/pompelmi/security/advisories). Nous coordonnerons un correctif avant la divulgation publique.
- **Utilisateurs en production :** ouvrez une [Discussion](https://github.com/pompelmi/pompelmi/discussions) pour partager des exigences ou demander des adaptateurs.

## ⭐ Historique des étoiles

[![Star History Chart](https://api.star-history.com/svg?repos=pompelmi/pompelmi&type=Date)](https://star-history.com/#pompelmi/pompelmi&Date)

---

## 🏆 Communauté & Reconnaissance

pompelmi a été présenté dans des publications majeures pour développeurs et est approuvé par des équipes du monde entier pour la gestion sécurisée des téléchargements de fichiers.

<p align="center">
  <img src="https://img.shields.io/badge/Featured%20in-Detection%20Engineering%20Weekly-0A84FF?style=for-the-badge&logo=substack" alt="Detection Engineering">
  <img src="https://img.shields.io/badge/Featured%20in-Node%20Weekly-FF6600?style=for-the-badge&logo=node.js" alt="Node Weekly">
  <img src="https://img.shields.io/badge/Featured%20in-Bytes-111111?style=for-the-badge" alt="Bytes">
</p>

### 🤝 Rejoignez la Communauté

- 💬 [GitHub Discussions](https://github.com/pompelmi/pompelmi/discussions) — Posez des questions, partagez des idées
- 🐛 [Issue Tracker](https://github.com/pompelmi/pompelmi/issues) — Rapportez des bugs, demandez des fonctionnalités
- 📖 [Documentation](https://pompelmi.github.io/pompelmi/) — Guides complets et référence API
- 🔒 [Sécurité](https://github.com/pompelmi/pompelmi/security) — Rapportez les vulnérabilités de sécurité en privé

---

## 💬 FAQ

**Ai-je besoin de YARA ?**  
Non. `scanner` est modulaire. Les exemples utilisent un analyseur minimal pour plus de clarté ; vous pouvez appeler un moteur YARA ou tout autre détecteur que vous préférez.

**Où résident les résultats ?**  
Dans les exemples, le garde attache les données de scan au contexte de la requête (par ex. `req.pompelmi` dans Express, `ctx.pompelmi` dans Koa). Dans Next.js, incluez les résultats dans votre réponse JSON comme vous le souhaitez.

**Pourquoi 422 pour les fichiers bloqués ?**  
Utiliser **422** pour signaler une violation de politique le distingue des erreurs de transport ; c'est un modèle commun. Utilisez les codes qui correspondent le mieux à vos directives API.

**Les bombes ZIP sont-elles gérées ?**  
Les archives sont traversées avec des limites pour réduire le risque de bombe d'archive. Gardez vos limites de taille conservatrices et préférez `failClosed: true` en production.

---

## 🧪 Tests et Développement

Exécutez les tests localement avec la couverture :

```bash
pnpm vitest run --coverage --passWithNoTests
```

Le badge suit la **bibliothèque principale** (`src/**`). Les adaptateurs et moteurs sont rapportés séparément pour l'instant et seront intégrés dans la couverture globale au fur et à mesure que leurs suites se développent.

Si vous intégrez Codecov en CI, téléchargez `coverage/lcov.info` et vous pouvez utiliser ce badge Codecov :

```md
[![codecov](https://codecov.io/gh/pompelmi/pompelmi/branch/main/graph/badge.svg?flag=core)](https://codecov.io/gh/pompelmi/pompelmi)
```

## 🤝 Contribution

Les PR et issues sont les bienvenues ! Commencez par :

```bash
pnpm -r build
pnpm -r lint
```

Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour des directives détaillées.

### 🎖️ Contributeurs

Merci à tous les contributeurs incroyables qui ont aidé à améliorer pompelmi !

<!-- Ajouter les images des contributeurs ici à l'avenir -->

---

## 🎓 Ressources d'Apprentissage

### 📚 Documentation

- [Documentation Officielle](https://pompelmi.github.io/pompelmi/) — Référence API complète et guides
- [Exemples](./examples/) — Exemples d'intégration réels
- [Guide de Sécurité](./SECURITY.md) — Meilleures pratiques de sécurité et politique de divulgation

### 🎥 Tutoriels & Articles

- **Sécurité des Téléchargements de Fichiers dans Node.js** — Guide des meilleures pratiques (à venir)
- **Intégration de YARA avec pompelmi** — Configuration de détection avancée (à venir)
- **Téléchargements de Fichiers Zero-Trust** — Modèles d'architecture (à venir)

### 🛠️ Outils & Intégrations

- [GitHub Action](https://github.com/pompelmi/pompelmi/tree/main/.github/actions/pompelmi-scan) — Analyse CI/CD
- [Images Docker](https://hub.docker.com/r/pompelmi/pompelmi) — Analyse conteneurisée (à venir)
- [Cloud Functions](https://github.com/pompelmi/cloud-functions) — Exemples serverless (à venir)

---

## 📊 Statistiques du Projet

<p align="center">
  <img src="https://repobeats.axiom.co/api/embed/YOUR_EMBED_ID.svg" alt="Repobeats analytics" />
</p>

---

## 🙏 Remerciements

pompelmi repose sur les épaules de géants. Remerciements particuliers à :

- Le projet YARA pour la correspondance de motifs puissante
- La communauté Node.js pour d'excellents outils
- Tous nos contributeurs et utilisateurs

---

## 📞 Support

Besoin d'aide ? Nous sommes là pour vous !

- 📖 [Documentation](https://pompelmi.github.io/pompelmi/)
- 💬 [GitHub Discussions](https://github.com/pompelmi/pompelmi/discussions)
- 🐛 [Issue Tracker](https://github.com/pompelmi/pompelmi/issues)
- 🔒 [Sécurité](https://github.com/pompelmi/pompelmi/security) (pour les vulnérabilités)

Pour le support commercial et le conseil, contactez les mainteneurs.

---

<p align="right"><a href="#pompelmi">↑ Retour en haut</a></p>

## 📜 Licence

[MIT](./LICENSE) © 2025‑présent contributeurs pompelmi
