# Pompelmi Website

> Modern, beautiful documentation and marketing site for Pompelmi built with Astro and Starlight.

 Features## 

- **Astro + Starlight** - Fast, accessible documentation
- **Tailwind CSS** - Modern, responsive design with glass morphism effects
- **React Components** - Interactive demos and UI elements
- **Gradient Animations** - Eye-catching animated backgrounds
- **SEO Optimized** - Comprehensive meta tags and structured data
- **GitHub Pages Ready** - Automated deployment workflow

## 
```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## 
```
website/
 public/           # Static assets (favicon, OG images)
 src/
 assets/       # Images and media   
 components/   # React/Astro components   
 DemoUpload.tsx      
 CodeTabs.astro      
 HowItWorks.astro      
 content/      # Markdown content   
 blog/     # Blog posts      
 docs/     # Documentation      
 pages/        # Page routes   
 index.astro    # Landing page      
 blog/      
 styles/       # Global styles   
 global.css       
 astro.config.mjs  # Astro configuration
 tailwind.config.cjs
```

## 
The website uses a modern design system with:
- **Glass morphism** effects for cards and navigation
- **Gradient animations** for hero sections and CTAs
- **Floating animations** for background elements
- **Smooth transitions** and hover effects
- **Responsive typography** with fluid scaling
- **Custom scrollbar** styling

## 
- [Astro](https://astro.build) v5.x - Static site generator
- [Starlight](https://starlight.astro.build) - Documentation theme
- [React](https://react.dev) v19 - UI components
- [Tailwind CSS](https://tailwindcss.com) v3 - Styling
- [TypeScript](https://typescriptlang.org) - Type safety

## 
- **Documentation** - Comprehensive guides in `src/content/docs/`
- **Blog** - Articles and tutorials in `src/content/blog/`
- **Components** - Reusable UI components in `src/components/`

## 
The website is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `main` branch. See `.github/workflows/deploy-pages.yml` for the deployment configuration.

Build triggers:
- Changes to `website/**`
- Changes to `packages/ui-react/**`
- Manual workflow dispatch

## 
Analytics are tracked via Plausible (privacy-friendly, GDPR compliant).

## 
- [Live Site](https://pompelmi.github.io/pompelmi/)
- [Main Repository](https://github.com/pompelmi/pompelmi)
- [Documentation](https://pompelmi.github.io/pompelmi/getting-started/)

## 
MIT - See LICENSE in the repository root.
