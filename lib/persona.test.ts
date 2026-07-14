import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT } from "./persona";

describe("embarrassing story photo pairing instruction", () => {
  it("tells the model to always pair awk.jpg with the blind-date story", () => {
    expect(SYSTEM_PROMPT).toMatch(/awk\.jpg/);
    expect(SYSTEM_PROMPT).toMatch(/always call show_photo with awk\.jpg/i);
  });

  it("still contains the embarrassing story itself", () => {
    expect(SYSTEM_PROMPT).toMatch(/high-fived her/i);
  });

  it("tells the model to always pair twinflame.jpg with the Twin Flame story", () => {
    expect(SYSTEM_PROMPT).toMatch(/twinflame\.jpg/);
    expect(SYSTEM_PROMPT).toMatch(/always call show_photo with twinflame\.jpg/i);
  });

  it("still contains the Twin Flame story itself", () => {
    expect(SYSTEM_PROMPT).toMatch(/saved herself as "Twin Flame"/i);
  });

  it("tells the model to always pair moms-words.jpg with the mom quote", () => {
    expect(SYSTEM_PROMPT).toMatch(/moms-words\.jpg/);
    expect(SYSTEM_PROMPT).toMatch(/always call show_photo with moms-words\.jpg/i);
  });

  it("still contains the mom quote itself", () => {
    expect(SYSTEM_PROMPT).toMatch(/three heads and six arms/i);
  });

  it("tells the model to always pair chortle.jpg with the CHORTLE fun fact", () => {
    expect(SYSTEM_PROMPT).toMatch(/chortle\.jpg/);
    expect(SYSTEM_PROMPT).toMatch(/always call show_photo with chortle\.jpg/i);
  });

  it("still contains the CHORTLE license plate fun fact itself", () => {
    expect(SYSTEM_PROMPT).toMatch(/licence plate reads "CHORTLE"/i);
  });

  it("tells the model to always play impression.m4a with the Australian impression fun fact", () => {
    expect(SYSTEM_PROMPT).toMatch(/impression\.m4a/);
    expect(SYSTEM_PROMPT).toMatch(/always call show_audio with impression\.m4a/i);
  });

  it("still contains the Australian impression fun fact itself", () => {
    expect(SYSTEM_PROMPT).toMatch(/impression of an Australian man/i);
  });

  it("tells the model to breadcrumb the other fun fact when only one is told", () => {
    expect(SYSTEM_PROMPT).toMatch(/tell only one of these.*breadcrumb that there's another/i);
  });
});
