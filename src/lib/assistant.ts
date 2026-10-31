import { explainRisk, predictRisk } from "./risk-model";
import type { Student, Workspace } from "./types";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type AssistantReply = {
  reply: string;
  mode: "provider" | "local";
  model?: string;
  notice?: string;
};

const MAX_MESSAGES = 12;
const MAX_CHARS = 4_000;

export function aiConfig() {
  const apiKey = process.env.AI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || "";
  const baseUrl = (process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL?.trim() || "gpt-4o-mini";
  const timeoutMs = Math.max(3_000, Math.min(Number(process.env.AI_TIMEOUT_MS) || 25_000, 60_000));
  const temperature = Math.max(0, Math.min(Number(process.env.AI_TEMPERATURE) || 0.4, 1.5));
  return { apiKey, baseUrl, model, timeoutMs, temperature, configured: Boolean(apiKey) };
}

export function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is ChatMessage => {
      if (!item || typeof item !== "object") return false;
      const message = item as { role?: unknown; content?: unknown };
      return (message.role === "user" || message.role === "assistant") && typeof message.content === "string";
    })
    .map((message) => ({ role: message.role, content: message.content.trim().slice(0, MAX_CHARS) }))
    .filter((message) => message.content.length > 0)
    .slice(-MAX_MESSAGES);
}

function nameMatches(student: Student, question: string) {
  const lower = question.toLowerCase();
  const parts = student.name.toLowerCase().split(" ");
  return lower.includes(student.name.toLowerCase()) || (parts.length > 1 && parts.every((part) => lower.includes(part)));
}

function studentSummary(student: Student) {
  const drivers = explainRisk(student)
    .slice(0, 3)
    .map((driver) => `${driver.label} ${driver.value > 0 ? "+" : ""}${driver.value.toFixed(1)} pts`)
    .join(", ");
  return `${student.name} (${student.studentId}, ${student.course}, year ${student.year}): risk ${student.riskScore}%, engagement ${student.engagement}%, quiz average ${student.quizScore}%, attendance ${student.attendance}%, ${student.lateSubmissions} late submissions, ${student.missedAssessments} missed assessments. Top contributions: ${drivers}.`;
}

function buildContext(data: Workspace, focus?: Student) {
  const { user, stats, students, interventions } = data;
  const top = students
    .filter((student) => student.riskScore >= 40)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 6)
    .map((student) => `${student.name} (${student.studentId}) ${student.riskScore}% · ${student.course}`)
    .join("; ");
  const plans = interventions.slice(0, 6).map((plan) => `${plan.title} [${plan.type}, ${plan.status}, due ${plan.dueDate}]`).join("; ");
  return [
    `Signed-in user: ${user.name}, role ${user.role}.`,
    user.role === "teacher" ? `Assigned courses: ${user.courses.join(", ") || "none"}.` : "",
    `Cohort: ${stats.total} students; ${stats.high} high risk (≥65%), ${stats.moderate} moderate (40–64%), ${stats.low} low risk; average engagement ${stats.engagement}%.`,
    top ? `Students needing attention: ${top}.` : "",
    plans ? `Support plans: ${plans}.` : "",
    focus ? `Focused student: ${studentSummary(focus)}` : "",
    "Scores are synthetic demo values from a transparent rule-based index (not a trained dropout model). Never make final academic decisions from them.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSystemPrompt(data: Workspace, focus?: Student) {
  return [
    "You are Uplift, a concise student-success assistant inside a university advisor portal.",
    "Help staff understand early-warning signals, explain risk contributors in plain language, and suggest supportive next steps.",
    "Rules: use only the supplied workspace context; never invent names, scores, or records; do not reveal personal data beyond the signed-in user's scope; do not make admissions, disciplinary, or diagnostic decisions; frame risk as a signal for support.",
    "For a student in the data, explain their Shapley-style drivers and suggest 1–3 concrete, empathetic actions. Keep answers under 180 words and use short paragraphs or bullets.",
    "",
    "WORKSPACE CONTEXT",
    buildContext(data, focus),
  ].join("\n");
}

function localGuidance(data: Workspace, question: string, focus?: Student): string {
  const { user, stats, students, interventions } = data;
  const lower = question.toLowerCase();
  const named = focus || students.find((student) => nameMatches(student, question));

  if (!question.trim()) {
    return `Hi ${user.name.split(" ")[0]} — I'm the Uplift assistant. I can explain a student's risk score, summarize who needs support, or suggest a next step for an intervention.`;
  }

  if (/what can you|help|capabilit|how do i|guide/.test(lower)) {
    return user.role === "student"
      ? "I can explain what contributes to your risk score, walk through your support plan, and suggest study actions. Your advisor can discuss anything more personal — you're not doing this alone."
      : `I can help you:\n• explain why a student is flagged (feature contributions)\n• list the students who most need a check-in\n• draft a supportive intervention\n• interpret engagement and quiz trends\n\nRight now ${stats.high} of ${stats.total} students are high risk and ${interventions.filter((plan) => plan.status !== "completed").length} support plans are active. Ask me about a specific student by name.`;
  }

  if (named) {
    const drivers = explainRisk(named).slice(0, 3);
    const strongest = drivers[0];
    const driverText = drivers.map((driver) => `• ${driver.label}: ${driver.value > 0 ? "+" : ""}${driver.value.toFixed(1)} points`).join("\n");
    const plans = interventions.filter((plan) => plan.studentId === named.id && plan.status !== "completed");
    return `${named.name} is at ${named.riskScore}% risk in ${named.course}. The score is mostly explained by:\n${driverText}\n\nSignals: engagement ${named.engagement}%, quiz average ${named.quizScore}%, attendance ${named.attendance}%, ${named.lateSubmissions} late submissions and ${named.missedAssessments} missed assessments.\n\nSupport-oriented next step: focus first on ${strongest.label.toLowerCase()}, make one achievable ask, and arrange a follow-up${plans.length ? ` (${plans.length} plan${plans.length > 1 ? "s" : ""} already open)` : ""}. Use the what-if sliders to explore how signals affect the demo score — they are illustrative, not guarantees.`;
  }

  if (/what.?if|improve|slider|raise|drop/.test(lower)) {
    const sample = students[0];
    if (!sample) return "There is no student record in scope to explore right now.";
    const improved = predictRisk({
      ...sample,
      quizScore: Math.min(100, sample.quizScore + 10),
      lateSubmissions: Math.max(0, sample.lateSubmissions - 1),
    });
    return `Open a student's "Risk & insights" tab to use the what-if sliders. For example, on ${sample.name}'s demo record, adding 10 quiz points and removing one late submission moves the score from ${sample.riskScore}% to ${improved}%. This model is illustrative, so treat the change as a conversation prompt, not a prediction.`;
  }

  if (/plan|intervention|support|next step/.test(lower)) {
    const active = interventions.filter((plan) => plan.status !== "completed");
    const next = active[0];
    if (user.role === "student") {
      return next
        ? `Your next support step is “${next.title}” (${next.type}), due ${next.dueDate}. Keep it small: choose one 25-minute focus block today, then tell your advisor how it went.`
        : "You have no open support plans. A good first step is to message your advisor about one topic you'd like help with this week.";
    }
    return `${active.length} support plan${active.length === 1 ? "" : "s"} are open. A useful structure is: one specific goal, one agreed action, one follow-up date.${next ? ` Example already in the workspace: “${next.title}” due ${next.dueDate}.` : ""}\n\nTry: “Would a 20-minute check-in this week help you prioritize the next assessment?”`;
  }

  if (/who|at.?risk|risk|flag|attention|concern/.test(lower)) {
    if (user.role === "student") {
      const me = students[0];
      return me
        ? `Your demo risk signal is ${me.riskScore}%. The strongest contributor is ${explainRisk(me)[0].label.toLowerCase()}. A score is a prompt for support, not a judgement about your potential.`
        : "No student record is linked to your account yet.";
    }
    const priority = students.filter((student) => student.riskScore >= 65).sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
    if (!priority.length) return `No students in your scope are currently high risk. ${stats.moderate} are moderate — a light-touch check-in can help.`;
    return `Priority check-ins in your scope:\n${priority.map((student) => `• ${student.name} — ${student.riskScore}% · ${student.course}`).join("\n")}\n\nStart with ${priority[0].name}: open their record, review the top contributors, and offer one specific, achievable next step.`;
  }

  return `Here's the current picture: ${stats.total} students in scope, ${stats.high} high risk, ${stats.moderate} moderate, ${stats.low} low, average engagement ${stats.engagement}%, and ${interventions.filter((plan) => plan.status !== "completed").length} open support plans.\n\nAsk me about a student by name, or say “who needs attention?” to see priorities. If you tell me the signal you're worried about (late work, quizzes, engagement), I can suggest a supportive next step.`;
}

export async function generateAssistantReply(
  data: Workspace,
  messages: ChatMessage[],
  focus?: Student,
): Promise<AssistantReply> {
  const config = aiConfig();
  const question = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  if (!config.configured) {
    return {
      reply: localGuidance(data, question, focus),
      mode: "local",
      notice: "Local guidance mode: no AI provider key is configured. Add AI_API_KEY in .env to use your own model.",
    };
  }

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        ...(process.env.AI_APP_NAME ? { "X-Title": process.env.AI_APP_NAME } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature,
        max_tokens: 500,
        messages: [{ role: "system", content: buildSystemPrompt(data, focus) }, ...messages],
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[uplift] AI provider returned ${response.status}: ${detail.slice(0, 300)}`);
      return {
        reply: localGuidance(data, question, focus),
        mode: "local",
        notice: `Your AI provider returned HTTP ${response.status}. Showing grounded local guidance instead. Check AI_BASE_URL, AI_MODEL, and AI_API_KEY.`,
      };
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = payload.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return {
        reply: localGuidance(data, question, focus),
        mode: "local",
        notice: "The AI provider returned an empty response. Showing grounded local guidance instead.",
      };
    }
    return { reply, mode: "provider", model: config.model };
  } catch (error) {
    console.error("[uplift] AI provider request failed:", (error as Error).message);
    return {
      reply: localGuidance(data, question, focus),
      mode: "local",
      notice:
        "The AI provider could not be reached (check AI_BASE_URL and network access). Showing grounded local guidance instead.",
    };
  }
}
