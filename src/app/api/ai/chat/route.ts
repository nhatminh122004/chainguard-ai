import { ApiRequestError, errorResponse, readJsonWithLimit } from '@/lib/api-validation';
import { protectAiRoute } from '@/lib/ai-route';
import { generateChat } from '@/lib/gemini-server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const protection = await protectAiRoute(request, 'chat', 12, 100);
    if ('response' in protection) return protection.response;
    const body = await readJsonWithLimit<{ message?: unknown; history?: unknown }>(request, 80_000);
    if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 4_000) throw new ApiRequestError('Message must contain 1-4000 characters');
    if (!Array.isArray(body.history) || body.history.length > 20) throw new ApiRequestError('Chat history is invalid');
    const history = body.history.map((item: unknown) => {
      if (!item || typeof item !== 'object') throw new ApiRequestError('Chat history is invalid');
      const entry = item as Record<string, unknown>;
      if ((entry.role !== 'user' && entry.role !== 'assistant') || typeof entry.content !== 'string' || entry.content.length > 8_000) throw new ApiRequestError('Chat history is invalid');
      return { role: entry.role, content: entry.content } as { role: 'user' | 'assistant'; content: string };
    });
    return Response.json({ text: await generateChat(body.message.trim(), history) });
  } catch (error) { return errorResponse(error); }
}
