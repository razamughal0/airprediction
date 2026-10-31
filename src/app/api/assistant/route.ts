import { workspace, apiError } from "@/lib/server";
import { generateAssistantReply, sanitizeMessages } from "@/lib/assistant";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { messages?: unknown; studentId?: unknown };
    const messages = sanitizeMessages(body.messages);
    if (!messages.length || messages.at(-1)?.role !== "user") {
      return Response.json({ error: "Send a question so the assistant can help." }, { status: 400 });
    }

    const data = await workspace();
    const requestedId = Number(body.studentId);
    // Only ground the assistant in records the signed-in role can already access.
    const focus = Number.isInteger(requestedId)
      ? data.students.find((student) => student.id === requestedId)
      : undefined;

    const result = await generateAssistantReply(data, messages, focus);
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
