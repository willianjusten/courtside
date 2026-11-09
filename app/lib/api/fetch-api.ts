export class ApiRequestError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
  ) {
    super(`Request to ${path} failed with status ${status}`);
    this.name = "ApiRequestError";
  }
}

// Reads one of the app's /api routes, which serve ESPN data already mapped and cached on Vercel's CDN.
export async function fetchApi<Data>(path: string): Promise<Data> {
  const response = await fetch(path);
  if (!response.ok) throw new ApiRequestError(path, response.status);
  return response.json();
}
