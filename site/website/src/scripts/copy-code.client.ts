if (typeof window !== 'undefined') {
  const addButtons = () => {
    document.querySelectorAll('pre > code').forEach((code) => {
      const pre = code.parentElement as HTMLElement
      if (pre?.dataset.copyReady) return
      pre.style.position = 'relative'
      const btn = document.createElement('button')
      btn.textContent = 'Copy'
      btn.setAttribute('aria-label', 'Copy code')
      Object.assign(btn.style, {
        position: 'absolute', top: '8px', right: '8px',
        padding: '4px 8px', fontSize: '12px', borderRadius: '6px',
        border: '1px solid #d1d5db', background: 'white', cursor: 'pointer'
      })
      btn.addEventListener('click', async () => {
        await navigator.clipboard.writeText((code as HTMLElement).innerText)
        const prev = btn.textContent; btn.textContent = 'Copied!'
        setTimeout(() => (btn.textContent = prev), 1200)
      })
      pre.appendChild(btn)
      pre.dataset.copyReady = '1'
    })
  }
  addButtons()
  // Re-run after client-side navigation (if any)
  document.addEventListener('astro:after-swap', addButtons as any)
}