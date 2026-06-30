import Anthropic from "@anthropic-ai/sdk";
import { Redis } from "@upstash/redis";
import { SYSTEM_PROMPT } from "@/lib/persona";
import { PHOTOS } from "@/lib/photos";

const client = new Anthropic();
const kv = new Redis({
  url: process.env.personalwebsite_KV_REST_API_URL!,
  token: process.env.personalwebsite_KV_REST_API_TOKEN!,
});

const tools: Anthropic.Tool[] = [
  {
    name: "show_guestbook",
    description:
      "Show the guest book form inline in the conversation so the visitor can fill it out directly — name, message, and a photo. Call this when someone wants to leave a note or sign the guest book.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "show_calendar",
    description:
      "Display the calendar booking widget so the visitor can schedule a meeting with Claude Chen. Only call this when the visitor explicitly asks to schedule, book, or set up a meeting or call — not for general conversation.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "list_photos",
    description:
      "Browse the available photo catalog. Call this first before show_photo to find the best filename for the visitor's request.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "show_photo",
    description:
      "Display a photo of Claude inline in the conversation. Call list_photos first to get the catalog, then call this once with the best matching filename.",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: {
          type: "string",
          description: "The photo filename from the catalog returned by list_photos",
        },
      },
      required: ["filename"],
    },
  },
  {
    name: "update_visitor",
    description:
      "Save the visitor's name for future visits. Call this the first time someone shares their name.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "The visitor's name" },
      },
      required: ["name"],
    },
  },
];

export async function POST(req: Request) {
  const { messages, visitorName, sessionId } = await req.json();

  const system = visitorName
    ? `${SYSTEM_PROMPT}\n\n— RETURNING VISITOR —\nThis visitor's name is ${visitorName}. Use it naturally.`
    : SYSTEM_PROMPT;

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        let currentMessages: Anthropic.MessageParam[] = messages;
        const MAX_TURNS = 5;
        let lastAssistantText = "";

        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const stream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system,
            tools,
            messages: currentMessages,
          });

          // Stream text to the client as it arrives
          let turnText = "";
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              turnText += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          if (turnText) lastAssistantText = turnText;

          const finalMsg = await stream.finalMessage();
          const toolBlocks = finalMsg.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );

          if (toolBlocks.length === 0) break;

          // Emit UI sentinels and build tool results
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const block of toolBlocks) {
            const input = block.input as Record<string, string>;
            let result = "done";

            if (block.name === "list_photos") {
              result = JSON.stringify(PHOTOS);
            }

            if (block.name === "show_guestbook") {
              controller.enqueue(encoder.encode("\x00SHOW_GUESTBOOK\x00"));
            }

            if (block.name === "show_calendar") {
              controller.enqueue(encoder.encode("\x00SHOW_CAL\x00"));
            }

            if (block.name === "show_photo" && input.filename) {
              controller.enqueue(
                encoder.encode(`\x00PHOTO:${input.filename}\x00`)
              );
            }

            if (block.name === "update_visitor" && input.name) {
              controller.enqueue(
                encoder.encode(`\x00VISITOR:${input.name}\x00`)
              );
            }

toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
          }

          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: finalMsg.content },
            { role: "user", content: toolResults },
          ];
        }
        // Persist conversation to Redis
        if (sessionId) {
          try {
            const toSave = lastAssistantText
              ? [...messages, { role: "assistant", content: lastAssistantText }]
              : messages;
            await kv.set(`conv:${sessionId}`, {
              sessionId,
              visitorName: visitorName ?? null,
              messages: toSave,
              updatedAt: new Date().toISOString(),
            });
            await kv.zadd("conv_index", { score: Date.now(), member: sessionId });
          } catch (e) {
            console.error("[conv save]", e);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[chat route]", msg);
        controller.enqueue(encoder.encode(`Error: ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
