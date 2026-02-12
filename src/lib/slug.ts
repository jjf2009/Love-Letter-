const ADJECTIVES = ['crimson', 'golden', 'silver', 'velvet', 'azure', 'ruby', 'blush', 'amber'] as const;
const NOUNS = ['sunset', 'moonlight', 'star', 'dream', 'whisper', 'heart', 'rose', 'letter'] as const;

export function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]!;
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]!;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${adj}-${noun}-${suffix}`;
}
