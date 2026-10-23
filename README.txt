Arshia TV — بسته نهایی کامل
===========================
همه فایل‌ها را جایگزین هم‌نام در پروژه کن، بعد:
  npx expo install expo-brightness
  بیلد جدید بگیر (EAS / run:android)

تغییرات این نسخه:
1) پخش سریع‌تر
   - شروع فوری بعد از pre-roll
   - یک بار تلاش خودکار در خطای اول HLS
   - لود اولویت‌دار شبکه‌های ایران/فارسی (لیست زودتر می‌آید)

2) شبکه‌های بیشتر فارسی‌زبان
   PRIORITY (بدون سقف):
   - iptv-org countries/ir
   - iptv-org languages/fas (فارسی)
   - iptv-org languages/prs (فارسی افغانی)
   - shayanline iran.m3u
   - shayanline sat-movies / sat-general
   - shayanline irib-national / irib-provincial

   EXTRA (سقف ۱۸۰ هر کدام، پس‌زمینه):
   sports, movies, series, kids, documentary, news,
   entertainment, music, animation, family, religious,
   cooking, culture, comedy, classic, education, outdoor,
   auto, business

3) پلیر حرفه‌ای: تمام‌صفحه، PiP، قفل، صدا، روشنایی، نسبت تصویر
4) کانال من / کانال عمومی سبک آپارات
5) رفع کرش durationSeconds

فایل‌ها:
  screens/PlayerPage.tsx
  screens/MyChannelPage.tsx
  screens/PublicChannelsPage.tsx
  components/PlayerControls.tsx
  components/PreRollOverlay.tsx
  data/playlist.ts
  data/channels.ts
  data/labels.ts
  theme/AppTheme.tsx
  package.json   (expo-brightness اضافه شده)
