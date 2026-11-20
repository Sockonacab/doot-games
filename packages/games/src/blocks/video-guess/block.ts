/**
 * Video Guess block (`multiple-choice` with prompt video + reveal video).
 * Big screen plays the clip, players pick an ending on their phones, and
 * reveal plays the ending clip + scores correct guesses.
 */
import { isEligible } from '@doot-games/engine'
import {
  type BlockResultsContext,
  type ResultsFragment,
  type RevealContext,
  defineBlock,
  promptText,
  z,
} from '@doot-games/sdk'
import VideoGuessHost from './VideoGuessHost.vue'
import VideoGuessPlayer from './VideoGuessPlayer.vue'
import VideoGuessReveal from './VideoGuessReveal.vue'

export const videoGuessOptionSchema = z.object({
  label: z.string().default(''),
  sublabel: z.string().optional(),
})

export const videoGuessContentSchema = z.object({
  subject: z.string().default('').describe('Optional category or round label shown on the big screen.'),
  prompt: promptText('How does this video end?'),
  video: z
    .string()
    .default('')
    .describe('Prompt video URL or local path (e.g. /videos/clip1-start.mp4).'),
  revealVideo: z
    .string()
    .default('')
    .describe('Optional ending/reveal video played on the big screen at reveal.'),
  autoplayVideo: z
    .boolean()
    .default(true)
    .describe('Autoplay video on the big screen (muted fallback handles browser autoplay rules).'),
  loopPromptVideo: z
    .boolean()
    .default(true)
    .describe('Loop the prompt clip while players lock in their answers.'),
  timer: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .default(25)
    .describe('Seconds to answer. Set to 0 or null for untimed.'),
  hideUntilReveal: z
    .boolean()
    .default(true)
    .describe('Keep answer counts hidden until reveal.'),
  options: z.array(videoGuessOptionSchema).min(2).describe('At least two ending choices.'),
  /** Correct option index; stripped to -1 in published content. */
  correct: z.number().int().default(0),
  showLetters: z.boolean().default(true).describe('Show A/B/C/D badges on choices.'),
})

export type VideoGuessContent = z.infer<typeof videoGuessContentSchema>
export interface VideoGuessInput {
  choice: number | null
}

export const videoGuessBlock = defineBlock<VideoGuessContent, VideoGuessInput>({
  kind: 'video-guess',
  name: 'Video Guess',
  scoring: 'Each correct guess scores a point.',
  contentSchema: videoGuessContentSchema,
  defaultContent: () => ({
    subject: '',
    prompt: 'How does this video end?',
    video: '',
    revealVideo: '',
    autoplayVideo: true,
    loopPromptVideo: true,
    timer: 25,
    hideUntilReveal: true,
    options: [
      { label: 'Ending A' },
      { label: 'Ending B' },
      { label: 'Ending C' },
      { label: 'Ending D' },
    ],
    correct: 0,
    showLetters: true,
  }),
  defaultTimer: 25,
  timerOf: (c) => c.timer,
  emptyInput: () => ({ choice: null }),
  isComplete: (_c, input) => input.choice != null,
  PlayerInput: VideoGuessPlayer,
  HostDisplay: VideoGuessHost,
  PlayerReveal: VideoGuessReveal,
  redactContent: (c) => ({ ...c, correct: -1, revealVideo: '' }),
  answerOf: (c) => ({ correct: c.correct }),
  revealSummary: (ctx: RevealContext<VideoGuessContent, VideoGuessInput>) => {
    const correctIndex = (ctx.answer as { correct?: number } | undefined)?.correct ?? -1
    return {
      correctIndex,
      correctLabel: ctx.content.options[correctIndex]?.label ?? '',
      revealVideo: ctx.content.revealVideo ?? '',
    }
  },
  aggregate: (ctx: BlockResultsContext<VideoGuessContent, VideoGuessInput>): ResultsFragment => {
    const tallies = ctx.players.map((p) => ({
      id: p.id,
      name: p.name,
      joinedAtIndex: p.joinedAtIndex,
      correct: 0,
      eligible: 0,
    }))
    for (const { index } of ctx.rounds) {
      const correctIndex = (ctx.answerFor(index) as { correct?: number } | undefined)?.correct
      const inputs = ctx.inputsFor(index)
      for (const t of tallies) {
        if (!isEligible(t.joinedAtIndex, index)) continue
        t.eligible++
        const input = inputs.get(t.id)
        if (input && input.choice != null && input.choice === correctIndex) t.correct++
      }
    }
    tallies.sort((a, b) => b.correct - a.correct || a.name.localeCompare(b.name))
    return {
      leaderboard: tallies.map((t) => ({
        id: t.id,
        name: t.name,
        score: t.correct,
        detail: `${t.correct} / ${t.eligible}`,
      })),
      stats: [{ label: 'Video guess rounds', value: ctx.rounds.length }],
    }
  },
})
