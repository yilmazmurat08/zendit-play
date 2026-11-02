# 1.5.4 kurtarma referansı

Kaynak kod kaybolduğu için 1.5.4 debug APK'sından (cinestream reposu, `claude/iptv-ui-update-br1uti`
branch'i, `apk/zendit-play-debug.apk`) çıkarılan dosyalar. Yeniden kurulumda referans olarak kullanılır;
uygulamaya derlenmez.

- `1.5.4-web/index-*.formatted.js`: APK'daki küçültülmüş arayüz paketinin esbuild ile okunur hale
  getirilmiş hali (yerel değişken adları kayıp, metinler ve mantık aynı).
- `1.5.4-web/*.css`, `index.html`: derlenmiş stil ve giriş sayfası.
- `1.5.4-web/demo/`: geliştirme demosunun kurgusal görselleri.

Android (Java) sınıfları henüz çıkarılmadı.
