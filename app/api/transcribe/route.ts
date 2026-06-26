import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return Response.json({ error: "No file" }, { status: 400 });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-transcribe",
    });

    return Response.json({ transcript: transcription.text });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    const status = err?.status ?? err?.statusCode ?? 500;
    console.error("[transcribe]", status, msg, err?.error ?? "");
    return Response.json({ error: msg }, { status: 500 });
  }
}
