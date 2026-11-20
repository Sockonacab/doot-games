<script setup lang="ts">
import { computed } from 'vue'
import type { VideoGuessContent, VideoGuessInput } from './block'

const props = defineProps<{
  content: VideoGuessContent
  myInput?: VideoGuessInput | null
  reveal?: { correctIndex: number; correctLabel: string; revealVideo?: string } | null
}>()

const answered = computed(() => props.myInput?.choice != null)
const correct = computed(
  () => answered.value && props.myInput?.choice === props.reveal?.correctIndex,
)
const answerLabel = computed(() => props.reveal?.correctLabel ?? '')
</script>

<template>
  <div class="vg-reveal" aria-live="polite">
    <template v-if="correct">
      <div class="badge ok">&#10003;</div>
      <h2>Correct!</h2>
      <p>Watch the ending on the big screen.</p>
    </template>
    <template v-else-if="answered">
      <div class="badge no">&#10007;</div>
      <h2>Not quite</h2>
      <p>The ending was <b>{{ answerLabel }}</b>.</p>
    </template>
    <template v-else>
      <div class="badge no">&#8211;</div>
      <h2>Time!</h2>
      <p>The ending was <b>{{ answerLabel }}</b>.</p>
    </template>
  </div>
</template>

<style scoped>
.vg-reveal {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 10px;
}
.badge {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 36px;
  font-weight: 800;
  border: var(--bd) solid var(--line);
}
.badge.ok {
  background: color-mix(in srgb, var(--c5) 22%, var(--surface));
  color: var(--c5);
}
.badge.no {
  background: var(--surface-2);
  color: var(--ink-soft);
}
</style>