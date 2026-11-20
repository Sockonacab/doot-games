<script setup lang="ts">
import { OptionGrid } from '@doot-games/ui'
import type { VideoGuessContent, VideoGuessInput } from './block'

defineProps<{ content: VideoGuessContent; modelValue: VideoGuessInput; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: VideoGuessInput] }>()
</script>

<template>
  <div class="video-guess-player">
    <OptionGrid
      :options="content.options"
      :selected="modelValue.choice"
      :disabled="disabled"
      :show-letters="content.showLetters !== false"
      @select="emit('update:modelValue', { choice: $event })"
    />
  </div>
</template>