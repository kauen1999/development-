// src/utils/trpc.ts
import { createTRPCNext } from '@trpc/next';
import superjson from 'superjson';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/trpc/router/_app';

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      transformer: superjson,
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    };
  },
  ssr: false,
});
