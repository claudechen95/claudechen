import { describe, expect, it } from "vitest";
import { PHOTOS, PHOTO_FILENAMES, getAvailablePhotos } from "./photos";

describe.each(["awk.jpg", "twinflame.jpg", "moms-words.jpg", "chortle.jpg", "tibet.jpg"])("%s / repeatable story pairing", (filename) => {
  it("is registered in the catalog", () => {
    expect(PHOTO_FILENAMES).toContain(filename);
  });

  it("stays available on the first offer", () => {
    expect(getAvailablePhotos([])).toContain(filename);
  });

  it("stays available even after already being shown this session", () => {
    expect(getAvailablePhotos([filename])).toContain(filename);
  });

  it("stays available alongside other already-shown photos", () => {
    const shown = ["bar-friends.jpg", filename, "dog.jpg"];
    expect(getAvailablePhotos(shown)).toContain(filename);
  });
});

describe("getAvailablePhotos general behavior", () => {
  it("excludes non-repeatable photos once shown", () => {
    expect(getAvailablePhotos(["bar-friends.jpg"])).not.toContain("bar-friends.jpg");
  });

  it("includes everything when nothing has been shown", () => {
    expect(getAvailablePhotos([])).toEqual(PHOTO_FILENAMES);
  });
});

describe("photo catalog integrity", () => {
  it("has no duplicate filenames", () => {
    expect(new Set(PHOTO_FILENAMES).size).toBe(PHOTO_FILENAMES.length);
  });

  it("every photo has a non-empty description", () => {
    for (const p of PHOTOS) {
      expect(p.description.trim().length).toBeGreaterThan(0);
    }
  });
});
