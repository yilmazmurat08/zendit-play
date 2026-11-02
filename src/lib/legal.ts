/**
 * Terms of Use and Privacy Policy, shown in Settings > Hakkında. Developer: Lusnika.
 * Update LEGAL_UPDATED whenever the texts change.
 */

export const DEVELOPER = 'Lusnika';
export const CONTACT_EMAIL = 'yilmazmurat08@gmail.com';
export const APP_NAME = 'Zendit Player';
export const LEGAL_UPDATED = '6 Ekim 2026';

const CONTACT_LINE = `Sorularınız ve talepleriniz için: ${DEVELOPER} · ${CONTACT_EMAIL}`;

export type LegalDocId = 'terms' | 'privacy';

export interface LegalSection {
  heading: string;
  /** Paragraphs; lines starting with "• " are shown as a list. */
  body: string[];
}

export interface LegalDoc {
  id: LegalDocId;
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  terms: {
    id: 'terms',
    title: 'Kullanım Koşulları',
    intro: `Bu koşullar, ${DEVELOPER} tarafından geliştirilen ${APP_NAME} uygulamasının ("Uygulama") kullanımını düzenler. Uygulamayı yükleyerek veya kullanarak bu koşulları kabul etmiş olursunuz. Kabul etmiyorsanız lütfen Uygulamayı kullanmayın.`,
    sections: [
      {
        heading: '1. Uygulamanın niteliği',
        body: [
          'Uygulama bir medya oynatıcıdır. Kendi içinde hiçbir televizyon kanalı, film, dizi, yayın akışı (EPG) veya başka bir içerik barındırmaz, satmaz ve sağlamaz.',
          'İzlenen tüm içerikler, kullanıcının kendi eklediği Xtream Codes hesabından, M3U listesinden veya EPG adresinden gelir. Bu kaynakların seçimi ve sağlanması tamamen kullanıcıya ve ilgili hizmet sağlayıcıya aittir.',
          `${DEVELOPER}, hiçbir IPTV hizmet sağlayıcısıyla bağlantılı değildir; abonelik satmaz ve içerik tavsiye etmez.`,
        ],
      },
      {
        heading: '2. Kullanıcının sorumlulukları',
        body: [
          'Uygulamayı yalnızca yasal yollardan edindiğiniz ve izleme hakkına sahip olduğunuz içeriklerle kullanmayı kabul edersiniz.',
          'Telif hakkıyla korunan içeriklerin izinsiz çoğaltılması, yayılması veya izlenmesi için Uygulamayı kullanmak yasaktır. 5846 sayılı Fikir ve Sanat Eserleri Kanunu başta olmak üzere ilgili mevzuata uymak kullanıcının sorumluluğundadır.',
          'Eklediğiniz hesap ve listelerin içeriğinden, bunların kullanımından ve doğabilecek her türlü hukuki sonuçtan siz ve hizmet sağlayıcınız sorumlusunuz.',
          'Uygulamayı, çalışmasını bozacak, başkalarına zarar verecek veya yasalara aykırı biçimde kullanmamayı kabul edersiniz.',
        ],
      },
      {
        heading: '3. Üçüncü taraf hizmetler',
        body: [
          'Uygulama; IPTV hizmet sağlayıcınızın sunucularına, yayın akışı (EPG) kaynaklarına, kanal logosu ve poster adreslerine, fragmanlar için YouTube’a ve seçtiğinizde VLC veya MX Player gibi harici oynatıcılara bağlanabilir.',
          `Bu hizmetler ${DEVELOPER} tarafından işletilmez. Kullanılabilirliklerinden, içeriklerinden ve kendi koşullarından ${DEVELOPER} sorumlu değildir; bu hizmetleri kullanırken onların koşulları ve gizlilik politikaları geçerlidir.`,
        ],
      },
      {
        heading: '4. Ebeveyn denetimi',
        body: [
          'Ebeveyn denetimi, yetişkin içerikleri ve seçtiğiniz kategorileri 4 haneli bir şifreyle kilitlemeye yardımcı olan bir araçtır.',
          'Yetişkin içerik tespiti, hizmet sağlayıcının bildirdiği bilgilere ve kategori adlarına dayanır; her içeriğin doğru tanınacağı garanti edilmez. Çocukların neyi izlediğinin denetimi ebeveynin sorumluluğundadır. Gerekli kategorileri Ayarlar > Ebeveyn denetimi bölümünden elle kilitleyebilirsiniz.',
        ],
      },
      {
        heading: '5. Fikri mülkiyet',
        body: [
          `Uygulamanın adı, logosu, tasarımı ve yazılımı ${DEVELOPER}’ya aittir. Uygulamayı kopyalamak, değiştirmek, tersine mühendislik yapmak, yeniden dağıtmak veya ticari amaçla kullanmak yasaktır; yasaların açıkça izin verdiği durumlar saklıdır.`,
          'Uygulamada görünen kanal adları, logolar, posterler ve diğer içerikler, ilgili hak sahiplerine aittir ve kullanıcının eklediği kaynaklardan gelir.',
        ],
      },
      {
        heading: '6. Garanti reddi',
        body: [
          'Uygulama "olduğu gibi" ve "mevcut haliyle" sunulur. Kesintisiz, hatasız veya her cihazla uyumlu çalışacağı garanti edilmez.',
          'Yayın kalitesi, erişilebilirlik ve kesintiler; hizmet sağlayıcınıza, internet bağlantınıza ve cihazınıza bağlıdır.',
        ],
      },
      {
        heading: '7. Sorumluluğun sınırlandırılması',
        body: [
          `Yürürlükteki mevzuatın izin verdiği ölçüde ${DEVELOPER}; Uygulamanın kullanımından veya kullanılamamasından, eklenen içeriklerden, üçüncü taraf hizmetlerden ya da veri kaybından doğan doğrudan veya dolaylı zararlardan sorumlu tutulamaz. Tüketici mevzuatından doğan haklarınız saklıdır.`,
        ],
      },
      {
        heading: '8. Değişiklikler ve sonlandırma',
        body: [
          `${DEVELOPER}, Uygulamayı ve bu koşulları önceden bildirmeksizin güncelleyebilir, değiştirebilir veya Uygulamanın yayınını durdurabilir. Güncel koşullar Uygulamanın Ayarlar bölümünde yayımlanır; değişiklikten sonra Uygulamayı kullanmaya devam etmeniz güncel koşulları kabul ettiğiniz anlamına gelir.`,
          'Bu koşullara aykırı kullanım hâlinde Uygulamayı kullanma hakkınız sona erer.',
        ],
      },
      {
        heading: '9. Uygulanacak hukuk',
        body: [
          'Bu koşullar Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda Türkiye Cumhuriyeti mahkemeleri ve icra daireleri yetkilidir; tüketici sıfatıyla başvurabileceğiniz tüketici hakem heyetleri ve tüketici mahkemeleri saklıdır.',
        ],
      },
      { heading: '10. İletişim', body: [CONTACT_LINE] },
    ],
  },
  privacy: {
    id: 'privacy',
    title: 'Gizlilik Politikası',
    intro: `Bu politika, ${DEVELOPER} tarafından geliştirilen ${APP_NAME} uygulamasının ("Uygulama") hangi bilgileri nasıl kullandığını açıklar. Kısaca: Uygulama kişisel verilerinizi ${DEVELOPER}’ya ait herhangi bir sunucuya göndermez; hesap oluşturma, reklam ve kullanıcı takibi yoktur.`,
    sections: [
      {
        heading: '1. Topladığımız veriler',
        body: [
          `${DEVELOPER}, Uygulama üzerinden sizden hiçbir kişisel veri toplamaz, saklamaz, satmaz veya paylaşmaz. Uygulamada reklam, analiz (istatistik) veya kullanıcı takibi yapan üçüncü taraf yazılım bulunmaz.`,
        ],
      },
      {
        heading: '2. Yalnızca cihazınızda saklanan bilgiler',
        body: [
          'Uygulamanın çalışabilmesi için aşağıdaki bilgiler yalnızca cihazınızda, Uygulamaya özel depolama alanında saklanır:',
          '• Eklediğiniz hesap bilgileri: sunucu adresi, kullanıcı adı, şifre veya M3U / EPG adresleri',
          '• Hizmet sağlayıcınızdan indirilen kanal, film ve dizi listeleri ile yayın akışı (EPG) önbelleği',
          '• Favoriler, izleme geçmişi, kaldığınız yer bilgisi ve izleme istatistikleri',
          '• Uygulama ayarları ve ekranda gösterilen, cihazda rastgele üretilen Cihaz ID / Cihaz PIN numaraları',
          '• Ebeveyn denetimi şifresi: şifrenin kendisi değil, geri çevrilemeyen bir özeti (hash) saklanır',
          `Bu bilgiler ${DEVELOPER}’ya iletilmez.`,
        ],
      },
      {
        heading: '3. Bağlantı kurulan üçüncü taraflar',
        body: [
          'Uygulama, siz kullandıkça yalnızca şu adreslere bağlanır:',
          '• IPTV hizmet sağlayıcınızın sunucuları: listeleri indirmek ve yayınları oynatmak için hesap bilgileriniz bu sunuculara gönderilir. Sağlayıcınız, bağlantı sırasında IP adresiniz gibi teknik bilgileri görebilir.',
          '• Yayın akışı (EPG) kaynakları ile kanal logosu ve poster adresleri: bu adresler sağlayıcınızın listesinden veya sizin girdiğiniz bilgilerden gelir.',
          '• YouTube: fragman izlediğinizde video, YouTube (Google) üzerinden oynatılır; bu sırada Google’ın gizlilik politikası geçerlidir (policies.google.com/privacy).',
          '• Harici oynatıcılar: VLC veya MX Player ile açmayı seçerseniz, yayın adresi seçtiğiniz uygulamaya iletilir.',
          `Bu hizmetlerin verilerinizi nasıl işlediğinden ${DEVELOPER} sorumlu değildir; lütfen ilgili hizmetin gizlilik politikasını inceleyin.`,
        ],
      },
      {
        heading: '4. İzinler',
        body: [
          'Uygulama yalnızca yayınları ve listeleri indirebilmek için internet erişimi izni kullanır. Konum, kamera, mikrofon, rehber, dosyalar veya benzeri kişisel verilere erişim izni istemez.',
        ],
      },
      {
        heading: '5. Veri güvenliği',
        body: [
          'Bilgileriniz Android’in her uygulamaya ayırdığı korumalı depolama alanında tutulur ve diğer uygulamalar tarafından okunamaz.',
          'Bazı IPTV sunucuları şifrelenmemiş (HTTP) bağlantı kullanır. Bu durumda hesap bilgileri ve yayınlar sağlayıcıya şifresiz iletilebilir; bağlantının güvenliği sağlayıcınızın altyapısına bağlıdır.',
          'Android’in otomatik yedekleme özelliği açıksa, Uygulama verileri cihazınızın Google hesabınıza aldığı yedeğe dahil edilebilir. Bu yedekleme Google tarafından yürütülür ve Android ayarlarından yönetilir.',
        ],
      },
      {
        heading: '6. Saklama süresi ve verilerin silinmesi',
        body: [
          'Bilgiler, siz silene kadar cihazınızda kalır. İstediğiniz zaman şu yollarla silebilirsiniz:',
          '• Ayarlar > Veri > "Hesaptan çık ve tüm verileri sil": hesap, listeler, favoriler, geçmiş ve ayarlar silinir',
          '• Ayarlar > Veri > "İzleme geçmişini sil" ve "Önbelleği temizle"',
          '• Uygulamayı cihazınızdan kaldırmak: Uygulamaya ait tüm veriler silinir',
          `${DEVELOPER} verilerinizi saklamadığı için silinmesini istemeniz gereken başka bir kopya bulunmaz.`,
        ],
      },
      {
        heading: '7. Çocukların gizliliği',
        body: [
          'Uygulama 13 yaşından küçük çocuklara yönelik değildir ve çocuklardan bilerek veri toplamaz. Ebeveynler, çocukların erişimini Ebeveyn denetimi özelliğiyle sınırlayabilir.',
        ],
      },
      {
        heading: '8. KVKK kapsamındaki haklarınız',
        body: [
          `6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 11. maddesi kapsamındaki haklarınıza (verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme ve itiraz) ilişkin taleplerinizi ${CONTACT_EMAIL} adresine iletebilirsiniz. ${DEVELOPER} sizinle ilgili kişisel veri saklamadığından, talepleriniz bu çerçevede yanıtlanır.`,
        ],
      },
      {
        heading: '9. Politikadaki değişiklikler',
        body: [
          'Bu politika, Uygulamadaki değişikliklere göre güncellenebilir. Güncel metin Uygulamanın Ayarlar bölümünde ve mağaza sayfasındaki gizlilik politikası bağlantısında yayımlanır; son güncelleme tarihi metnin başında yer alır.',
        ],
      },
      { heading: '10. İletişim', body: [CONTACT_LINE] },
    ],
  },
};
