import { describe, expect, it } from "vitest";
import { AUDIO_CLIPS, AUDIO_FILENAMES, REPEATABLE_AUDIO, getAvailableAudio } from "./audio";

describe.each(["impression.m4a"])("%s / repeatable clip pairing", (filename) => {
  it("is registered in the catalog", () => {
    expect(AUDIO_FILENAMES).toContain(filename);
  });

  it("stays available on the first offer", () => {
    expect(getAvailableAudio([])).toContain(filename);
  });

  it("stays available even after already being played this session", () => {
    expect(getAvailableAudio([filename])).toContain(filename);
  });
});

describe("getAvailableAudio general behavior", () => {
  it("includes everything when nothing has been played", () => {
    expect(getAvailableAudio([])).toEqual(AUDIO_FILENAMES);
  });

  it("excludes non-repeatable clips once played", () => {
    const nonRepeatable = AUDIO_FILENAMES.filter((f) => !REPEATABLE_AUDIO.has(f));
    if (nonRepeatable.length === 0) return;
    const [first] = nonRepeatable;
    expect(getAvailableAudio([first])).not.toContain(first);
  });
});

describe("audio catalog integrity", () => {
  it("has no duplicate filenames", () => {
    expect(new Set(AUDIO_FILENAMES).size).toBe(AUDIO_FILENAMES.length);
  });

  it("every clip has a non-empty description", () => {
    for (const a of AUDIO_CLIPS) {
      expect(a.description.trim().length).toBeGreaterThan(0);
    }
  });
});
