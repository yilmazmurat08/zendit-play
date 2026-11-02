# Zendit Play — IPTV & Medya Oynatıcı

Zendit Play, React 19 + TypeScript + Vite 6 + Tailwind v4 ile geliştirilmiş, ultra akıcı ve güvenli bir IPTV ve medya oynatıcı web uygulamasıdır.

## Mimari Yapı

- **`server/proxyRoutes.js`**: CORS ve Mixed-Content (HTTPS üzerinde HTTP akışları) proxy mantığı. Çerçeveden bağımsız düz JavaScript olarak tasarlanmıştır. İçerisinde özel ve yerel IP aralıklarını (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, loopback ve metadata servisleri) engelleyen dahili **SSRF koruması** bulunur.
- **`vite-plugins/iptv-proxy.ts`**: Yerel geliştirme ortamında (`npm run dev`) `/api/proxy` isteklerini doğrudan `server/proxyRoutes.js` üzerinden yöneten Vite eklentisi.
- **`server/index.js`**: Bağımsız Express üretim sunucusu (`npm run build && npm start`). `dist/` klasöründeki statik derlemeyi sunar ve `/api/proxy` rotalarını yönetir.
- **`src/lib/xtreamApi.ts`**: Standart Xtream Codes API istemcisi (canlı TV, film, dizi, EPG ve kategori senkronizasyonu).
- **`src/lib/m3uParser.ts`**: M3U ve M3U8 çalma listesi ayrıştırıcısı.
- **`src/lib/useVirtualList.ts`**: Binlerce kanal ve medya içeriğinde tarayıcının donmasını engelleyen, yalnızca ekranda görünen öğeleri işleyen sanallaştırma kancası.
- **`src/components/VideoPlayerModal.tsx`**: `.m3u8` için `hls.js`, ham `.ts` akışlar için `mpegts.js` ve `.mp4` için yerel video oynatıcı. Akış hatası durumunda sessizce demo videoya geçmez; kullanıcıya net hata bilgisi sunar.

## Güvenlik Kuralları

1. **Herkese Açık CORS Proxy Yasağı**: `corsproxy.io` veya `allorigins.win` gibi genel CORS servisleri kullanılmaz. Xtream Codes isteklerinde kullanıcı adı ve şifre açık metin olarak taşındığından, tüm istekler yerel `/api/proxy` üzerinden güvenle yönlendirilir.
2. **SSRF Koruması**: Yerel ağ ve dahili cloud metadata adreslerine giden istekler `server/proxyRoutes.js` içinde engellenir.
3. **Akış Hata Yönetimi**: Başarısız olan yayınlar sessizce demo içerikle maskelenmez, açık hata mesajı ve tekrar deneme imkanı verilir.

## Tasarım Özellikleri

- Düz, sade, "hafif" koyu tema (`#0F1016` zemin, `#181A20` kartlar).
- Camgöbeği (`#00E5FF`) ve mor (`#7C4DFF`) tek noktalarda vurgu renkleri.
- Tipografi: **Inter**.
- Alt Navigasyon (5 Sekme):
  1. **Ana Sayfa**
  2. **Canlı TV**
  3. **Filmler**
  4. **Diziler**
  5. **Ayarlar**

## Çalıştırma Komutları

```bash
# Geliştirme ortamı (Vite + IPTV Proxy Eklentisi)
npm run dev

# Üretim derlemesi
npm run build

# Bağımsız Express sunucusu ile başlatma
npm start

# Tip kontrolü
npm run lint
```
