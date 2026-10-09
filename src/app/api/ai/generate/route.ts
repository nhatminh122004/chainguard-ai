import { ApiRequestError, errorResponse, readJsonWithLimit } from '@/lib/api-validation';
import { protectAiRoute } from '@/lib/ai-route';
import { generateText } from '@/lib/gemini-server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const protection = await protectAiRoute(request, 'generate', 6, 40);
    if ('response' in protection) return protection.response;
    const body = await readJsonWithLimit<{ prompt?: unknown; task?: unknown }>(request, 60_000);
    if (body.task !== 'financial-report' && body.task !== 'financial-plan') throw new ApiRequestError('Unsupported generation task');
    if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 25_000) throw new ApiRequestError('Prompt must contain 1-25000 characters');
    return Response.json({ text: await generateText(body.prompt) });
  } catch (error) { return errorResponse(error); }
}
