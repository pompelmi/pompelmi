import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL || '/'
  const origin = site ? new URL(base, site).toString() : ''
  const body = [
    'User-agent: *',
    'Allow: /',
    origin && `Sitemap: ${origin}sitemap.xml`,
    origin && `Sitemap: ${origin}sitemap-index.xml`,
  ].filter(Boolean).join('\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}