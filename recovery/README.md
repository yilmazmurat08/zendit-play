# 1.5.4 kurtarma referansı

Kaynak kod kaybolduğu için 1.5.4 debug APK'sından (cinestream reposu, `claude/iptv-ui-update-br1uti`
branch'i, `apk/zendit-play-debug.apk`) çıkarılan dosyalar. Yeniden kurulumda referans olarak kullanılır;
uygulamaya derlenmez.

- `1.5.4-web/index-*.formatted.js`: APK'daki küçültülmüş arayüz paketinin esbuild ile okunur hale
  getirilmiş hali (yerel değişken adları kayıp, metinler ve mantık aynı).
- `1.5.4-web/*.css`, `index.html`: derlenmiş stil ve giriş sayfası.
- `1.5.4-web/demo/`: geliştirme demosunun kurgusal görselleri.

- `1.5.4-android/java/`: `com.zendit.play` paketinin jadx 1.5.3 ile çözülmüş Java kodu (PlayerActivity,
  NativePlayerPlugin, EpgPlugin, EpgStore, CatchupUrl, StreamPlayers, PlayerGestures, RowAdapter...).
  Değişken adlarının bir kısmı ve yorumlar kayıp; jadx'in "WARN" notları olan yerler elle düzeltilmeli.
- `1.5.4-android/AndroidManifest.xml`, `res/`: birleştirilmiş manifest, oynatıcı düzenleri
  (`zendit_player*.xml`), ikonlar, splash, TV banner'ı, `xml/` ve değer dosyaları.
