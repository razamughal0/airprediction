import { workspace, apiError } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET() { try { return Response.json(await workspace()); } catch (error) { return apiError(error); } }
