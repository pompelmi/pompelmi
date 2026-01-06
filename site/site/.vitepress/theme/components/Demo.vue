<script setup lang="ts">
import { ref, computed } from 'vue'

type Check = { label: string; ok: boolean; note?: string }

const file = ref<File | null>(null)
const dragging = ref(false)
const scanning = ref(false)
const result = ref<Check[] | null>(null)

// Client-side simulation only:
const allowedExt = ['.zip', '.tar', '.gz', '.7z', '.png', '.jpg', '.jpeg', '.pdf']
const maxSizeMB = 25

function prettyMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(2) + 'MB'
}
function extOf(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function onPick(e: Event) {
  const t = e.target as HTMLInputElement
  file.value = t.files?.[0] ?? null
  result.value = null
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) {
    file.value = f
    result.value = null
  }
}
function onDragOver(e: DragEvent) { e.preventDefault(); dragging.value = true }
function onDragLeave() { dragging.value = false }

async function scan() {
  if (!file.value) return
  scanning.value = true
  await new Promise(r => setTimeout(r, 350)) // fake latency

  const f = file.value
  const ext = extOf(f.name)
  const sizeOK = f.size <= maxSizeMB * 1024 * 1024
  const extOK  = allowedExt.includes(ext)
  const mimeOK = !!f.type && f.type !== 'application/octet-stream'

  const checks: Check[] = []
  checks.push({ label: `Extension allowed (${ext || '—'})`, ok: extOK, note: extOK ? '' : `Allowed: ${allowedExt.join(', ')}` })
  checks.push({ label: `Size limit (≤ ${maxSizeMB}MB)`, ok: sizeOK, note: prettyMB(f.size) })
  checks.push({ label: `MIME present`, ok: mimeOK, note: f.type || 'n/a' })

  if (ext === '.zip') {
    checks.push({ label: 'ZIP inner scan (server-side only)', ok: true, note: 'Simulated ✓' })
  }

  result.value = checks
  scanning.value = false
}

const allOk = computed(() => (result.value?.every(c => c.ok)) ?? false)
</script>

<template>
  <div class="demo-card">
    <div class="demo-header">
      <h2>Pompelmi — Demo</h2>
      <p class="sub">Client-side policy simulation (server-side scanning is stronger).</p>
    </div>

    <div
      class="dropzone"
      :class="{ dragging }"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    >
      <div class="dz-inner">
        <p><strong>Drop a file here</strong> or choose one</p>
        <input type="file" @change="onPick" />
      </div>
    </div>

    <div v-if="file" class="file-info">
      <span class="badge">Selected</span>
      <span class="mono">{{ file!.name }}</span>
      <span class="dim">• {{ prettyMB(file!.size) }} • {{ file!.type || 'MIME n/a' }}</span>
    </div>

    <div class="actions">
      <button class="btn" :disabled="!file || scanning" @click="scan">
        {{ scanning ? 'Scanning…' : 'Scan' }}
      </button>
      <a class="btn ghost" href="/pompelmi/docs/policy/">See policy</a>
      <a class="btn ghost" href="https://github.com/pompelmi/pompelmi" target="_blank" rel="noreferrer">GitHub</a>
    </div>

    <div v-if="result" class="result">
      <div class="status" :class="allOk ? 'ok' : 'bad'">
        <span v-if="allOk">PASS</span>
        <span v-else>BLOCKED</span>
      </div>

      <table class="checks">
        <thead><tr><th>Check</th><th>Result</th><th>Note</th></tr></thead>
        <tbody>
          <tr v-for="(c, i) in result" :key="i">
            <td>{{ c.label }}</td>
            <td>
              <span :class="['pill', c.ok ? 'ok' : 'bad']">
                {{ c.ok ? '✓' : '✗' }}
              </span>
            </td>
            <td class="dim">{{ c.note }}</td>
          </tr>
        </tbody>
      </table>
      <p class="footnote">Tip: server-side can inspect ZIP contents, enforce depth/ratio, and apply YARA (if enabled).</p>
    </div>
  </div>
</template>

<style scoped>
/* Modern, polished demo card with dark mode support */
.demo-card {
  --primary: #3b82f6;
  --primary-dark: #2563eb;
  --primary-light: #60a5fa;
  --success: #10b981;
  --success-dark: #059669;
  --danger: #ef4444;
  --danger-dark: #dc2626;
  
  display: grid;
  gap: 28px;
  padding: 40px;
  border-radius: 24px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 960px;
  margin: 0 auto 32px;
}

@media (max-width: 768px) {
  .demo-card {
    padding: 24px;
    gap: 20px;
  }
}

.demo-header {
  text-align: center;
  padding-bottom: 24px;
  border-bottom: 2px solid var(--vp-c-divider);
}

.demo-header h2 {
  margin: 0 0 12px;
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-light) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
}

.demo-header .sub {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 1rem;
  line-height: 1.6;
}

.dropzone {
  position: relative;
  border: 3px dashed var(--vp-c-border);
  border-radius: 20px;
  padding: 48px 32px;
  text-align: center;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 197, 253, 0.1) 100%);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.dropzone:hover {
  border-color: var(--primary-light);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 197, 253, 0.15) 100%);
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.dropzone.dragging {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 197, 253, 0.2) 100%);
  border-color: var(--primary);
  border-style: solid;
  box-shadow: inset 0 0 0 3px rgba(59, 130, 246, 0.15);
  transform: scale(1.02);
}

.dz-inner p {
  margin: 0 0 16px;
  font-size: 1.125rem;
  color: var(--vp-c-text-1);
}

.dz-inner p strong {
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.dropzone input[type="file"] {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 12px;
  border: 2px solid var(--vp-c-border);
  background: var(--vp-c-bg);
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropzone input[type="file"]:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 20px 24px;
  background: var(--vp-c-bg-alt);
  border-radius: 16px;
  border: 1px solid var(--vp-c-border);
  color: var(--vp-c-text-1);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.badge {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  color: white;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.mono {
  font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, monospace;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-mute);
  padding: 4px 8px;
  border-radius: 6px;
}

.dim {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  appearance: none;
  border: none;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  padding: 14px 28px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 4px 0 rgba(37, 99, 235, 0.2);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 6px 0 rgba(37, 99, 235, 0.2);
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%);
}

.btn:active {
  transform: translateY(1px);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 2px 0 rgba(37, 99, 235, 0.2);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

.btn.ghost {
  background: var(--vp-c-bg);
  color: var(--primary-dark);
  border: 2px solid var(--primary);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.btn.ghost:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--primary-dark);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.result {
  display: grid;
  gap: 24px;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.status {
  justify-self: center;
  border-radius: 999px;
  padding: 12px 32px;
  font-weight: 800;
  font-size: 1.125rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.status.ok {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: var(--success-dark);
  border: 2px solid var(--success);
}

.status.bad {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
  color: var(--danger-dark);
  border: 2px solid var(--danger);
}

.checks {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--vp-c-border);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  background: var(--vp-c-bg);
}

.checks thead th {
  background: var(--vp-c-bg-soft);
  font-weight: 700;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 16px;
  border-bottom: 2px solid var(--vp-c-border);
  color: var(--vp-c-text-1);
  text-align: left;
}

.checks tbody tr {
  transition: background-color 0.15s ease;
}

.checks tbody tr:hover {
  background: var(--vp-c-bg-soft);
}

.checks td {
  padding: 16px;
  border-top: 1px solid var(--vp-c-divider-light);
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
}

.checks tr:nth-child(even) {
  background: var(--vp-c-bg-alt);
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  text-align: center;
  border-radius: 999px;
  font-weight: 700;
  font-size: 1.125rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.pill.ok {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: var(--success-dark);
  border: 2px solid var(--success);
}

.pill.bad {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
  color: var(--danger-dark);
  border: 2px solid var(--danger);
}

.footnote {
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
  line-height: 1.6;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border-left: 4px solid var(--primary);
  margin: 0;
}
</style>