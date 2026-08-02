const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Needed for Drizzle's expo-sqlite migrations, which import raw .sql files as text
// (via babel-plugin-inline-import) — see lib/db/migrations/migrations.js.
config.resolver.sourceExts.push('sql');

module.exports = config;
