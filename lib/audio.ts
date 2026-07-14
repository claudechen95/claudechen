export type AudioClip = { filename: string; description: string };

export const AUDIO_CLIPS: AudioClip[] = [
  { filename: "impression.m4a", description: "his Australian man impression. Always play this alongside the Australian impression fun fact — never any other clip for it" },
];

export const AUDIO_FILENAMES = AUDIO_CLIPS.map((a) => a.filename);

// Clips allowed to be played again even if already played earlier in the session —
// e.g. a clip paired to a specific story should replay every time that story is retold.
export const REPEATABLE_AUDIO = new Set<string>(["impression.m4a"]);

export function getAvailableAudio(playedAudio: string[]): string[] {
  const playedSet = new Set(playedAudio);
  return AUDIO_FILENAMES.filter((f) => !playedSet.has(f) || REPEATABLE_AUDIO.has(f));
}
