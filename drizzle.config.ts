/** CLI config for drizzle-kit@0.18 — typed loosely because kit's Config omits the Expo driver. */
export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  driver: 'expo',
};
