/** Base URL of the NestJS API for direct HTTP checks. */
export const apiUrl = (path: string) => new URL(path, process.env.API_URL ?? 'http://localhost:4000').toString();
