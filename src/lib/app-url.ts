// Next.js handles basePath for Link/router, but native fetch and Supabase redirects need it explicitly.
export const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH === '/todo' ? '/todo' : '';
export const appUrl = (path: `/${string}`) => `${appBasePath}${path}`;
