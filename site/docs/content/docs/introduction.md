---
title: "Introduction"
date: 2025-08-01
menu:
  docs:
    weight: 1
---

Welcome to the **Pompelmi** documentation site!  
Pompelmi is an open-source npm package designed to transform your data pipelines into simpler, more maintainable functions.

## Installation

Install globally via npm:

```bash
npm install -g pompelmi
```

Or locally in your project:

```bash
npm install pompelmi --save
```

## Quick Start

Import and initialize Pompelmi in your code:

```js
import Pompelmi from 'pompelmi';

const pm = new Pompelmi({
  // your configuration options
});

// Example method call
pm.doSomething();
```

For the full API reference, see the [API section](/docs/api/).