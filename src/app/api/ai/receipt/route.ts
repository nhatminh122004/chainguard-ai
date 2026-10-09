import { ApiRequestError, errorResponse, readJsonWithLimit } from '@/lib/api-validation';
import { protectAiRoute, validateImageInput } from '@/lib/ai-route';
import { analyzeReceipt } from '@/lib/gemini-server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const protection = await protectAiRoute(request, 'receipt', 4, 25);
    if ('response' in protection) return protection.response;
    const body = await readJsonWithLimit<unknown>(request, 11 * 1024 * 1024);
    let input;
    try { input = validateImageInput(body); } catch (error) { throw new ApiRequestError(error instanceof Error ? error.message : 'Invalid image'); }
    return Response.json(await analyzeReceipt(input.imageBase64, input.mimeType));
  } catch (error) { return errorResponse(error); }
}
