// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_gray_captain_britain.sql';
import m0001 from './0001_wooden_stranger.sql';
import m0002 from './0002_curly_black_widow.sql';
import m0003 from './0003_amazing_ricochet.sql';
import m0004 from './0004_solid_black_bolt.sql';

  export default {
    journal,
    migrations: {
      m0000,
      m0001,
      m0002,
      m0003,
      m0004
    }
  }
