<script setup lang="ts">
/**
 * Image field for the editor: paste a URL, drag-and-drop an image file, or,
 * when an uploader is available, pick a file to upload. Always shows a live
 * preview.
 */
import { computed, inject, ref } from 'vue'
import { IMAGE_UPLOAD } from '../upload'

const props = defineProps<{ modelValue: string; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// A pasted data: URL is embedded inline in the game config, which the host
// broadcasts in one relay frame (hard cap ~64 KB). A big inline image silently
// breaks the whole round, so reject oversized ones here and steer to a URL/upload.
const MAX_DATA_URL_BYTES = 32 * 1024
const dataUrlError = ref('')

function onInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  broken.value = false
  if (value.startsWith('data:') && value.length > MAX_DATA_URL_BYTES) {
    dataUrlError.value = `That pasted image is too large to send to players (over ${Math.round(
      MAX_DATA_URL_BYTES / 1024,
    )} KB). Upload it, or paste a hosted image URL instead.`
    // Don't keep the oversized value: revert the input's visible text to the
    // previous value too (re-emitting an unchanged modelValue won't reset the DOM).
    ;(e.target as HTMLInputElement).value = props.modelValue
    emit('update:modelValue', props.modelValue)
    return
  }
  dataUrlError.value = ''
  emit('update:modelValue', value)
}

const broken = ref(false)
const uploadCtx = inject(IMAGE_UPLOAD, null)
const canUpload = computed(() => !!uploadCtx?.enabled.value || true)
// A reason to show when uploads are configured but not available right now (e.g.
// the author is signed out), so they understand the option instead of seeing
// nothing. URL-paste still works regardless.
const uploadHint = computed(() =>
  uploadCtx?.enabled.value ? '' : (uploadCtx?.reason?.value ?? ''),
)
const uploading = ref(false)
const uploadError = ref('')
const isDragging = ref(false)

async function performUpload(file: File): Promise<string> {
  if (uploadCtx?.enabled.value) {
    return await uploadCtx.upload(file)
  }

  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/media/upload', {
    method: 'POST',
    body: fd,
  })
  const data = (await res.json().catch(() => ({}))) as {
    url?: string
    statusMessage?: string
    message?: string
  }
  if (!res.ok || !data.url) {
    throw new Error(data.statusMessage || data.message || `Upload failed (${res.status}).`)
  }
  return data.url
}

async function handleFile(file: File | undefined) {
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  dataUrlError.value = ''
  broken.value = false
  try {
    const url = await performUpload(file)
    emit('update:modelValue', url)
  } catch (err) {
    const e = err as { statusMessage?: string; message?: string }
    uploadError.value = e?.statusMessage ?? e?.message ?? 'Upload failed.'
  } finally {
    uploading.value = false
  }
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  await handleFile(file)
  input.value = ''
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (uploading.value) return
  isDragging.value = true
}

function onDragLeave(e: DragEvent) {
  const current = e.currentTarget as HTMLElement | null
  const related = e.relatedTarget as Node | null
  if (current && related && current.contains(related)) return
  isDragging.value = false
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  if (uploading.value) return
  const file = e.dataTransfer?.files?.[0]
  await handleFile(file)
}
</script>

<template>
  <div
    class="sf-field if-dropzone"
    :class="{ 'is-dragging': isDragging }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <span class="sf-label">{{ label }}</span>
    <div class="if-row">
      <input
        class="sf-input"
        type="url"
        inputmode="url"
        placeholder="https://… or drag & drop an image here"
        :value="modelValue"
        @input="onInput"
      />
      <label v-if="canUpload" class="if-upload" :class="{ busy: uploading }">
        <input
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          :disabled="uploading"
          @change="onFile"
        />
        <span>{{ uploading ? 'Uploading…' : 'Upload' }}</span>
      </label>
    </div>
    <p class="sf-hint">
      {{ isDragging ? 'Drop image to upload…' : 'Drag & drop an image onto this field, paste a URL, or upload a file.' }}
    </p>
    <p v-if="uploadHint" class="sf-hint">{{ uploadHint }}</p>
    <p v-if="uploadError" class="sf-error">{{ uploadError }}</p>
    <p v-if="dataUrlError" class="sf-error">{{ dataUrlError }}</p>
    <div v-if="modelValue" class="sf-image-preview">
      <img v-if="!broken" :src="modelValue" alt="Preview of the round image" @error="broken = true" />
      <span v-else class="sf-image-broken">Couldn't load that image URL.</span>
    </div>
  </div>
</template>

<style scoped>
.if-dropzone {
  border-radius: 12px;
  padding: 6px;
  margin: -6px;
  transition: background-color 0.15s ease, outline-color 0.15s ease;
  outline: 2px dashed transparent;
}
.if-dropzone.is-dragging {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  outline-color: var(--primary);
}
.if-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.if-row .sf-input {
  flex: 1;
}
.if-upload {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  border: var(--bd) solid var(--line-soft);
  background: var(--surface);
  color: var(--ink);
  border-radius: 11px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.if-upload:hover {
  border-color: var(--primary);
}
.if-upload.busy {
  opacity: 0.6;
  cursor: progress;
}
.if-upload input {
  display: none;
}
.sf-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--mute);
}
.sf-image-preview {
  margin-top: 10px;
  border: var(--bd) solid var(--line-soft);
  border-radius: 11px;
  overflow: hidden;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  min-height: 64px;
}
.sf-image-preview img {
  max-width: 100%;
  max-height: 220px;
  display: block;
}
.sf-image-broken {
  padding: 18px;
  font-size: 13px;
  color: var(--mute);
}
</style>