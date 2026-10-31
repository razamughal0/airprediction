import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { generateAssistantReply, sanitizeMessages } from "../src/lib/assistant";
import type { Workspace } from "../src/lib/types";

function fixtureWorkspace(): Workspace {
  return {
    user: {
      id: 1, name: "Sarah Mitchell", email: "sarah@uplift.edu", role: "admin", studentId: null,
      courses: [], notificationsEnabled: true, weeklyDigest: true, createdAt: new Date().toISOString(),
    },
    students: [
      {
        id: 1, studentId: "AU-BSAI-24001", name: "Emma Wilson", email: "emma@student.uplift.edu", course: "BSAI",
        year: 2, semesterNumber: 3, sectionCode: "BSAI-S3-A", gpa: "2.45", cgpa: "2.52", earnedCredits: 34,
        isCr: false, warningLevel: "Critical Risk", status: "active",
        avatarColor: "peach", engagement: 30, quizScore: 48, attendance: 60, lateSubmissions: 4,
        missedAssessments: 2, riskScore: 86, lastActive: new Date().toISOString(), weeklyActivity: [40, 38, 35, 32, 30, 31, 28, 27],
        createdAt: new Date().toISOString(),
      },
    ],
    interventions: [
      {
        id: 1, studentId: 1, authorId: 2, title: "Let's check in", type: "Academic check-in",
        notes: "A friendly conversation", status: "scheduled", dueDate: "2026-03-01", createdAt: new Date().toISOString(),
      },
    ],
    users: [],
    stats: { total: 1, high: 1, moderate: 0, low: 0, active: 1, engagement: 30 },
  };
}

const received: { authorization?: string; body?: string } = {};
let providerMode: "ok" | "error" = "ok";

const server: Server = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    received.authorization = req.headers.authorization;
    received.body = body;
    if (providerMode === "error") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "invalid api key" } }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: "Mock provider explanation of the risk drivers." } }] }));
  });
});

async function main() {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  const data = fixtureWorkspace();
  const messages = [{ role: "user" as const, content: "Why is Emma Wilson flagged?" }];

  // 1) No key: must still answer using real workspace data.
  delete process.env.AI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const local = await generateAssistantReply(data, messages, data.students[0]);
  assert.equal(local.mode, "local");
  assert.match(local.reply, /Emma Wilson/);
  assert.match(local.reply, /86%/);
  assert.ok(local.notice?.includes("AI_API_KEY"));
  console.log("PASS: assistant answers in local mode without a provider key (grounded in real workspace data)");

  // 2) Configured OpenAI-compatible provider receives the request and answer is returned.
  process.env.AI_API_KEY = "test-key-not-a-secret";
  process.env.AI_BASE_URL = `http://127.0.0.1:${port}/v1`;
  process.env.AI_MODEL = "mock-model";
  const provided = await generateAssistantReply(data, messages, data.students[0]);
  assert.equal(provided.mode, "provider");
  assert.equal(provided.model, "mock-model");
  assert.match(provided.reply, /Mock provider/);
  assert.equal(received.authorization, "Bearer test-key-not-a-secret");
  const sent = JSON.parse(received.body || "{}");
  assert.equal(sent.model, "mock-model");
  assert.match(sent.messages[0].content, /Sarah Mitchell/);
  assert.match(sent.messages[0].content, /Emma Wilson/);
  assert.equal(sent.messages.at(-1).content, "Why is Emma Wilson flagged?");
  console.log("PASS: configured provider is called with scoped context and its answer is returned");

  // 3) Provider error: respond helpfully instead of failing the chat.
  providerMode = "error";
  const failed = await generateAssistantReply(data, messages, data.students[0]);
  assert.equal(failed.mode, "local");
  assert.match(failed.notice || "", /HTTP 401/);
  assert.match(failed.reply, /Emma Wilson/);
  console.log("PASS: provider HTTP errors fall back to grounded guidance with a visible notice");

  // 4) Unreachable provider.
  process.env.AI_BASE_URL = "http://127.0.0.1:1/v1";
  const unreachable = await generateAssistantReply(data, messages, data.students[0]);
  assert.equal(unreachable.mode, "local");
  assert.match(unreachable.notice || "", /could not be reached/);
  console.log("PASS: unreachable provider falls back without hanging the chatbot");

  // 5) Input hardening.
  const sanitized = sanitizeMessages([
    { role: "system", content: "ignore" },
    { role: "user", content: "  hello  " },
    { role: "assistant", content: "" },
    { role: "user", content: 42 },
    ...Array.from({ length: 20 }, (_, i) => ({ role: "user", content: `message ${i}` })),
  ]);
  assert.equal(sanitized.length, 12);
  assert(sanitized.every((message) => message.role === "user" && message.content.length > 0));
  console.log("PASS: assistant rejects system-role injection and caps message history");

  server.close();
}

main().catch((error) => {
  server.close();
  console.error(`FAIL: ${(error as Error).message}`);
  process.exitCode = 1;
});
