/** Video Guess: watch a clip, guess how it ends on phones, watch the reveal clip. */
import { type RoundInstance, defineGame } from '@doot-games/sdk'
import { videoGuessBlock } from '../../blocks/video-guess/block'

const rounds: RoundInstance[] = ['Round 1', 'Round 2', 'Round 3'].map((subject) => ({
  block: 'video-guess',
  content: {
    subject,
    prompt: 'How does this video end?',
    video: '',
    revealVideo: '',
    autoplayVideo: true,
    loopPromptVideo: true,
    timer: 25,
    hideUntilReveal: true,
    options: [
      { label: 'Option A' },
      { label: 'Option B' },
      { label: 'Option C' },
      { label: 'Option D' },
    ],
    correct: 0,
    showLetters: true,
  },
}))

export const videoGuess = defineGame({
  manifest: {
    id: 'video-guess',
    name: 'Video Guess',
    version: '0.1.0',
    description: 'Watch a video clip, guess the ending on your phone, and see the reveal clip.',
    author: 'Doot',
    capabilities: ['timer'],
    minPlayers: 1,
  },
  blocks: [videoGuessBlock],
  defaultConfig: { title: 'What Happens Next?', rounds },
})