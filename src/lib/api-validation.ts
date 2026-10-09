import 'server-only';

export class ApiRequestError extends Error {
  constructor(message: string, public status: number = 400) { super(message); }
}

export async function readJsonWithLimit<T>(request: Request, maxBytes: number): Promise<T> {
  const length = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(length) && length > maxBytes) throw new ApiRequestError('Request body is too large', 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new ApiRequestError('Request body is too large', 413);
  try { return JSON.parse(text) as T; } catch { throw new ApiRequestError('Malformed JSON body'); }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiRequestError) return Response.json({ error: error.message }, { status: error.status });
  console.error('API error:', error);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
