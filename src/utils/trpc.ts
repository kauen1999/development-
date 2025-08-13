import { createTRPCNext } from '@trpc/next';
import superjson from 'superjson';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/trpc/router/_app';

// Detect base URL for server-side and production
function getBaseUrl() {
  if (typeof window !== 'undefined') return ''; // client-side uses relative path
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // production Vercel
  return `http://localhost:${process.env.PORT ?? 3000}`; // local dev
}

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    };
  },
  ssr: false,
});
