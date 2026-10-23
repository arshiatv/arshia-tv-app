Arshia TV — Channel Upgrade Package (100%)
==========================================

Copy these files into your project root (overwrite):

  data/channels.ts
  data/playlist.ts
  data/embeddedChannels.ts   ← NEW FILE (required)
  screens/LiveChannelsPage.tsx
  screens/IranianSatellitePage.tsx

What changed:
- ZERO channels dropped. No hard caps.
- 413 real local Iran/Persian streams embedded (work offline + first paint).
- Multi-source online playlists (~9500 unique available) load in background.
- Automatic mirror failover for critical sources.
- Catalogue persisted with AsyncStorage after first successful load.
- FlatList virtualization so UI does not hang with thousands of channels.
- All folders preserved: Wrestling, Nature, Sports, Movies, Kids, News, etc.

Do NOT delete embeddedChannels.ts — playlist.ts imports it.
