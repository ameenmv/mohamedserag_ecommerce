/** Base URL of the Nuxt storefront/app for direct HTTP checks. */
export const appUrl = (path: string) => new URL(path, process.env.APP_URL ?? 'http://localhost:3000').toString();
