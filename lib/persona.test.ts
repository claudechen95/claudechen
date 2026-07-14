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

  it("tells the model to play impression.m4a once on the Australian impression reveal turn", () => {
    expect(SYSTEM_PROMPT).toMatch(/impression\.m4a/);
    expect(SYSTEM_PROMPT).toMatch(/call show_audio with impression\.m4a exactly once/i);
  });

  it("still contains the Australian impression fun fact itself", () => {
    expect(SYSTEM_PROMPT).toMatch(/impression of an Australian man/i);
  });

  it("tells the model to breadcrumb the other fun fact when only one is told", () => {
    expect(SYSTEM_PROMPT).toMatch(/tell only one of these.*breadcrumb that there's another/i);
  });

  it("tells the model to challenge with a guestbook bet before revealing the Australian impression fact", () => {
    expect(SYSTEM_PROMPT).toMatch(/bet them that if they laugh, they have to sign the guestbook/i);
  });

  it("tells the model not to reveal the fact at all if they decline the bet", () => {
    expect(SYSTEM_PROMPT).toMatch(/if they decline or disagree, drop it.*don't reveal fun fact #2 at all/i);
  });

  it("tells the model to call show_guestbook if they laugh after the reveal", () => {
    expect(SYSTEM_PROMPT).toMatch(/if their reaction afterward reads like they're laughing or amused, call show_guestbook/i);
  });

  it("tells the model not to replay impression.m4a on later nagging/reaction turns", () => {
    expect(SYSTEM_PROMPT).toMatch(/do not call show_audio again, no matter what/i);
    expect(SYSTEM_PROMPT).toMatch(/one clip per ask/i);
  });

  it("tells the model to always pair tibet.jpg with the running-away-at-four story", () => {
    expect(SYSTEM_PROMPT).toMatch(/tibet\.jpg/);
    expect(SYSTEM_PROMPT).toMatch(/always call show_photo with tibet\.jpg/i);
  });

  it("still contains the running-away-at-four / Tibet story itself", () => {
    expect(SYSTEM_PROMPT).toMatch(/sell him to Tibet/i);
  });
});
