<script setup lang="ts">
import type { RoundState } from '@doot-games/engine'
import { injectDootRoom } from '@doot-games/engine/vue'
import { computed, ref } from 'vue'
import type { VideoGuessContent, VideoGuessInput } from './block'

const props = defineProps<{
  content: VideoGuessContent
  inputs: Map<string, VideoGuessInput>
  state: RoundState
  answer?: unknown
}>()

const room = injectDootRoom()
const revealed = computed(() => props.state === 'reveal')
const showLive = ref(props.content.hideUntilReveal === false)
const showDistribution = computed(() => revealed.value || showLive.value)
const isMuted = ref(false)
const videoEl = ref<HTMLVideoElement | null>(null)

const lockedCount = computed(() => {
  let n = 0
  for (const v of props.inputs.values()) if (v?.choice != null) n++
  return n
})

const counts = computed(() => {
  const out = props.content.options.map(() => 0)
  for (const v of props.inputs.values()) {
    const choice = v?.choice
    if (choice != null && out[choice] != null) out[choice]++
  }
  return out
})

const summary = computed(
  () =>
    room.roundRevealFor(room.round.value.index) as
      | { correctIndex?: number; correctLabel?: string; revealVideo?: string }
      | undefined,
)
const correctIndex = computed(
  () =>
    summary.value?.correctIndex ??
    (props.answer as { correct?: number } | undefined)?.correct ??
    -1,
)
const correctOption = computed(() =>
  correctIndex.value >= 0 ? props.content.options[correctIndex.value] : undefined,
)
const activeVideoSrc = computed(() => {
  if (revealed.value) {
    return summary.value?.revealVideo?.trim() || props.content.revealVideo?.trim() || props.content.video?.trim() || ''
  }
  return props.content.video?.trim() || ''
})
const correctCount = computed(() =>
  correctIndex.value >= 0 ? (counts.value[correctIndex.value] ?? 0) : 0,
)
const showLetters = computed(() => props.content.showLetters !== false)
const letter = (i: number) => String.fromCharCode(65 + i)

function toggleMute() {
  isMuted.value = !isMuted.value
  if (videoEl.value) videoEl.value.muted = isMuted.value
}

function replayVideo() {
  if (!videoEl.value) return
  videoEl.value.currentTime = 0
  videoEl.value.play().catch(() => {
    isMuted.value = true
    if (videoEl.value) {
      videoEl.value.muted = true
      videoEl.value.play().catch(() => {})
    }
  })
}

function onVideoError() {
  // If autoplay with audio is blocked by the browser, retry muted.
  if (videoEl.value && !isMuted.value) {
    isMuted.value = true
    videoEl.value.muted = true
    videoEl.value.play().catch(() => {})
  }
}
</script>

<template>
  <div class="vg-stage">
    <div v-if="activeVideoSrc" class="video-wrap">
      <video
        ref="videoEl"
        :key="`${revealed ? 'reveal' : 'prompt'}-${activeVideoSrc}`"
        :src="activeVideoSrc"
        class="vg-video"
        controls
        playsinline
        :autoplay="content.autoplayVideo !== false"
        :loop="!revealed && content.loopPromptVideo !== false"
        :muted="isMuted"
        @error="onVideoError"
      />
      <div class="video-bar">
        <button type="button" class="chip-btn" @click="replayVideo">Replay clip</button>
        <button type="button" class="chip-btn" @click="toggleMute">
          {{ isMuted ? 'Unmute TV' : 'Mute TV' }}
        </button>
      </div>
    </div>

    <div v-if="revealed" class="reveal-banner">
      <span class="kicker">{{ summary?.revealVideo ? 'La réponse' : 'The answer' }}</span>
      <strong class="winner">{{
        correctOption?.label || (correctIndex >= 0 ? `Option ${letter(correctIndex)}` : '—')
      }}</strong>
      <span v-if="lockedCount > 0" class="tally">
        <span class="mono">{{ correctCount }}</span> of {{ lockedCount }} guessed right
      </span>
    </div>

    <template v-else>
      <ul class="board">
        <li v-for="(opt, i) in content.options" :key="i" class="panel">
          <span v-if="showLetters" class="letter">{{ letter(i) }}</span>
          <span class="label">
            <span>{{ opt.label || `Option ${letter(i)}` }}</span>
            <span v-if="opt.sublabel" class="sub">{{ opt.sublabel }}</span>
          </span>
          <span v-if="showDistribution" class="count mono">{{ counts[i] ?? 0 }}</span>
        </li>
      </ul>

      <div class="status-row">
        <span class="status"><span class="dot" aria-hidden="true" /> {{ lockedCount }} locked in</span>
        <button type="button" class="chip-btn" :aria-pressed="showLive" @click="showLive = !showLive">
          {{ showLive ? 'Hide answers' : 'Peek at answers' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.vg-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.video-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.vg-video {
  max-width: 100%;
  max-height: min(44vh, 420px);
  border-radius: var(--radius-lg);
  border: var(--bd) solid var(--line-soft);
  background: #000;
}
.video-bar,
.status-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
.board {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 1100px) {
  .board {
    grid-template-columns: 1fr;
  }
}
.panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--surface-2);
  border: var(--bd) solid var(--line-soft);
  font-weight: 700;
}
.panel .letter {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-weight: 800;
  background: var(--primary);
  color: var(--primary-ink);
  border: var(--bd) solid var(--line);
}
.panel .label {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.panel .sub {
  font-size: 13px;
  color: var(--ink-soft);
  font-weight: 600;
}
.panel .count {
  font-weight: 800;
  color: var(--ink-soft);
}
.reveal-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
}
.kicker {
  text-transform: uppercase;
  font-size: 13px;
  font-weight: 800;
  color: var(--c5);
}
.winner {
  font-size: clamp(24px, 4vw, 44px);
}
.tally,
.status {
  color: var(--ink-soft);
  font-weight: 700;
}
.chip-btn {
  background: var(--surface-2);
  border: var(--bd) solid var(--line-soft);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 6px 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.chip-btn[aria-pressed='true'] {
  background: var(--primary);
  color: var(--primary-ink);
}
</style>