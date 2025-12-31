<template>
  <div class="container">
    <h1>pompelmi File Scanner</h1>
    <p class="description">Upload a file to scan for malware using pompelmi</p>
    
    <form @submit.prevent="handleSubmit" class="upload-form">
      <div class="file-input-wrapper">
        <input
          type="file"
          ref="fileInput"
          @change="handleFileChange"
          :disabled="loading"
          id="file-input"
        />
        <label for="file-input" class="file-label">
          {{ file ? file.name : 'Choose a file...' }}
        </label>
      </div>
      
      <button type="submit" :disabled="!file || loading" class="scan-button">
        {{ loading ? 'Scanning...' : 'Scan File' }}
      </button>
    </form>

    <div v-if="error" class="message error">
      <strong>Error:</strong> {{ error }}
    </div>

    <div v-if="result" class="result">
      <h2>Scan Result</h2>
      <div :class="['verdict-badge', `verdict-${result.verdict}`]">
        {{ result.verdict.toUpperCase() }}
      </div>
      <details open>
        <summary>Full Scan Details</summary>
        <pre class="scan-output">{{ JSON.stringify(result, null, 2) }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
const file = ref<File | null>(null)
const loading = ref(false)
const result = ref<any>(null)
const error = ref('')

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  file.value = target.files?.[0] || null
  result.value = null
  error.value = ''
}

async function handleSubmit() {
  if (!file.value) return

  loading.value = true
  error.value = ''
  result.value = null

  try {
    const formData = new FormData()
    formData.append('file', file.value)

    const response = await fetch('/api/scan', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    result.value = await response.json()
  } catch (err: any) {
    error.value = err.message || 'Failed to scan file'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

h1 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.description {
  color: #7f8c8d;
  margin-bottom: 2rem;
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.file-input-wrapper {
  position: relative;
}

#file-input {
  opacity: 0;
  position: absolute;
  z-index: -1;
}

.file-label {
  display: block;
  padding: 1rem;
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  color: #495057;
  transition: all 0.2s;
}

.file-label:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.scan-button {
  padding: 1rem 2rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.scan-button:hover:not(:disabled) {
  background: #0056b3;
}

.scan-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.message {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.result {
  margin-top: 2rem;
}

.result h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.verdict-badge {
  display: inline-block;
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  font-weight: 700;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.verdict-clean {
  background: #d4edda;
  color: #155724;
}

.verdict-suspicious {
  background: #fff3cd;
  color: #856404;
}

.verdict-malicious {
  background: #f8d7da;
  color: #721c24;
}

details {
  margin-top: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  background: #f8f9fa;
}

summary {
  cursor: pointer;
  font-weight: 600;
  color: #495057;
  user-select: none;
}

summary:hover {
  color: #007bff;
}

.scan-output {
  background: #fff;
  padding: 1rem;
  border-radius: 4px;
  overflow: auto;
  margin-top: 1rem;
  border: 1px solid #dee2e6;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
