const adjectives = ["crimson", "golden", "silver", "velvet", "azure", "ruby", "soft", "gentle"];
const nouns = ["sunset", "moonlight", "star", "dream", "whisper", "heart", "rose", "spark"];

export function generateSlug(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const random = Math.random().toString(36).slice(2, 6);
  return `${adj}-${noun}-${random}`;
}
