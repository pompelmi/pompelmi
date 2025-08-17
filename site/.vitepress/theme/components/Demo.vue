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
/* Improved styles for the demo card */
.demo-card{
  --ring: #93c5fd;
  --blue: #0ea5e9;
  --blue-600: #2563eb;

  display: grid;
  gap: 18px;
  padding: 24px;
  border-radius: 18px;
  border: 1px solid #e5e7eb;
  background: #fff;
  box-shadow: 0 10px 35px rgba(2, 36, 82, 0.08);
  max-width: 900px;
  margin: 0 auto 18px;
}
.demo-header{ padding-bottom: 10px; border-bottom: 1px solid #eef2f7; }
.demo-header h2{ margin: 0; font-size: 1.25rem; letter-spacing: .2px; }
.demo-header .sub{ margin: 6px 0 0; color: #6b7280; font-size: .95rem; }

.dropzone{
  border: 2px dashed rgba(37,99,235,.35);
  border-radius: 16px;
  padding: 28px;
  text-align: center;
  background: linear-gradient(180deg, rgba(14,165,233,.06), rgba(14,165,233,.02));
  transition: all .15s ease, border-color .2s ease;
}
.dropzone.dragging{
  background: rgba(14,165,233,.08);
  border-color: rgba(37,99,235,.6);
  box-shadow: inset 0 0 0 2px rgba(14,165,233,.12);
}
.dz-inner p{ margin: 0 0 8px; }
.dropzone input[type="file"]{
  display: inline-block;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: #fff;
}

.file-info{ display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: #334155; }
.badge{ background: #eef2ff; color: #3730a3; padding: 3px 8px; border-radius: 999px; font-size: .75rem; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.dim{ color: #667085; }

.actions{ display: flex; gap: 12px; flex-wrap: wrap; }
.btn{
  appearance: none;
  border: 1px solid transparent;
  background: linear-gradient(180deg, var(--blue), #3b82f6);
  color: #fff;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  box-shadow: 0 2px 0 rgba(0,0,0,.05);
  transition: transform .04s ease, box-shadow .15s ease, filter .2s ease;
}
.btn:hover{ filter: brightness(1.03); box-shadow: 0 7px 18px rgba(14,165,233,.25); }
.btn:active{ transform: translateY(1px); }
.btn:focus-visible{ outline: none; box-shadow: 0 0 0 3px rgba(147,197,253,.7); }

.btn.ghost{ background: transparent; color: var(--blue-600); border-color: rgba(37,99,235,.35); }
.btn.ghost:hover{ background: rgba(59,130,246,.08); }

.result{ display: grid; gap: 12px; }
.status{ align-self: start; border-radius: 999px; padding: 6px 12px; font-weight: 800; font-size: .9rem; letter-spacing: .3px; }
.status.ok{ background: #ecfdf5; color: #065f46; }
.status.bad{ background: #fef2f2; color: #991b1b; }

.checks{ width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 12px; overflow: hidden; border: 1px solid #eef2f7; }
.checks thead th{ background: #f8fafc; font-weight: 600; padding: 10px 12px; border-bottom: 1px solid #eef2f7; }
.checks td{ padding: 10px 12px; border-top: 1px solid #f1f5f9; }
.checks tr:nth-child(even) td{ background: #fbfdff; }

.pill{ display: inline-block; min-width: 28px; text-align: center; border-radius: 999px; padding: 3px 8px; font-weight: 700; }
.pill.ok{ background: #dcfce7; color: #166534; }
.pill.bad{ background: #fee2e2; color: #7f1d1d; }

.footnote{ color: #6b7280; font-size: .875rem; }
</style>