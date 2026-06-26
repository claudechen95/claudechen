import Anthropic from "@anthropic-ai/sdk";
import { Redis } from "@upstash/redis";
import { SYSTEM_PROMPT } from "@/lib/persona";

const client = new Anthropic();
const kv = new Redis({
  url: process.env.personalwebsite_KV_REST_API_URL!,
  token: process.env.personalwebsite_KV_REST_API_TOKEN!,
});

const tools: Anthropic.Tool[] = [
  {
    name: "show_calendar",
    description:
      "Display the calendar booking widget so the visitor can schedule a meeting with Claude Chen. Call this whenever the visitor expresses interest in meeting, scheduling, booking, or talking on a call.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "show_photo",
    description:
      "Display a photo of Claude inline in the conversation. Use when a visitor asks about his life, travels, hobbies, appearance, or anything a photo would answer better than words.",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: {
          type: "string",
          description: "The photo filename from the available catalog",
          enum: [
            "paris-love-wall.jpg",
            "costume-party.jpg",
            "coastal-selfie.jpg",
            "iceland-waterfall.jpg",
            "iceland-beach.jpg",
            "puppies-yoga.jpg",
            "bar-friends.jpg",
            "sunset-dinner.jpg",
            "sculpting_photo.jpg",
            "pyramids.jpg",
            "dog.jpg",
            "ram-in-glacier-national-park.jpeg",
            "jellyfish.jpg",
            "flying-fish-hawaii.jpg",
          ],
        },
      },
      required: ["filename"],
    },
  },
  {
    name: "show_guestbook",
    description:
      "Start the guest book flow. Call this when someone wants to leave a note or sign the guest book, then immediately ask for their name.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "save_guestbook_entry",
    description:
      "Save the visitor's guest book entry after collecting their name and message through conversation. After calling this, the tool will return the saved entry id. Then tell the visitor their note is saved in your voice, and let them know they can add an optional photo below.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string" },
        message: { type: "string" },
      },
      required: ["name", "message"],
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
  const { messages, visitorName } = await req.json();

  const system = visitorName
    ? `${SYSTEM_PROMPT}\n\n— RETURNING VISITOR —\nThis visitor's name is ${visitorName}. Use it naturally.`
    : SYSTEM_PROMPT;

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        let currentMessages: Anthropic.MessageParam[] = messages;
        const MAX_TURNS = 5;

        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const stream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system,
            tools,
            messages: currentMessages,
          });

          // Stream text to the client as it arrives
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }

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

            if (
              block.name === "save_guestbook_entry" &&
              input.name &&
              input.message
            ) {
              const entry = {
                id: Math.random().toString(36).slice(2, 10),
                name: input.name.trim(),
                message: input.message.trim(),
                date: new Date().toISOString(),
              };
              await kv.lpush("guestbook", entry);
              controller.enqueue(
                encoder.encode(`\x00GUESTBOOK_ID:${entry.id}\x00`)
              );
              result = `Saved. Entry id: ${entry.id}`;
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
