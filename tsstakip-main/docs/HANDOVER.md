# TSS Takip Handover

Bu dokuman, projeyi devralacak gelistirici icin hazirlanmistir. Amac; sistemi hizli anlayip, yerel ortamda kaldigi yerden devam edebilmek.

## 1. Proje Ozeti

TSS Takip, `Next.js 16 + React 19 + TypeScript + Tailwind CSS + Supabase` ile gelistirilmis bir servis kayit yonetim uygulamasidir.

Ana roller:

- `admin`: tum servisleri gorur, duzenler, uye yonetir, ayarlara erisir
- `member`: kendi servis kayitlarini olusturur ve takip eder

Mevcut kapsama giren basliklar:

- servis kaydi olusturma
- servis durumu takibi
- servis fotograflari
- taseron / teknik ekip ayrimi
- admin ve uye panelleri
- temel raporlama
- API token tabanli servis durum callback yapisi

## 2. Proje Yapisi

Onemli klasorler:

- `src/app`: sayfalar, route handler'lar, server action'lar
- `src/components`: UI ve alan bazli componentler
- `src/lib`: auth, veri, Supabase yardimcilari, rapor mantigi
- `supabase/migrations`: SQL migration dosyalari
- `supabase/repairs`: migration kurtarma SQL'leri
- `docs`: kurulum ve devir dokumanlari
- `scripts`: yardimci gelistirici scriptleri

Onemli dosyalar:

- [README.md](/Users/admin/Documents/Teknik/tsstakip-main/README.md:1)
- [docs/SUPABASE_SETUP.md](/Users/admin/Documents/Teknik/tsstakip-main/docs/SUPABASE_SETUP.md:1)
- [scripts/create-admin.mjs](/Users/admin/Documents/Teknik/tsstakip-main/scripts/create-admin.mjs:1)
- [src/lib/auth.ts](/Users/admin/Documents/Teknik/tsstakip-main/src/lib/auth.ts:1)
- [src/app/actions.ts](/Users/admin/Documents/Teknik/tsstakip-main/src/app/actions.ts:1)
- [src/lib/api-tokens.ts](/Users/admin/Documents/Teknik/tsstakip-main/src/lib/api-tokens.ts:1)

## 3. Bu Devirde Yapilanlar

Bu oturumda yapilan baslica isler:

- proje yeni Supabase projesine baglandi
- yerel `.env.local` olusturuldu
- `admin:create` scripti eklendi
- Supabase kurulum notlari dokumante edildi
- admin girisi calisir hale getirildi
- login akisinda `profiles` tablosu okunabilir duruma getirildi
- proje `localhost:3002` uzerinden calistirildi

Eklenen dosyalar:

- [docs/SUPABASE_SETUP.md](/Users/admin/Documents/Teknik/tsstakip-main/docs/SUPABASE_SETUP.md:1)
- [scripts/create-admin.mjs](/Users/admin/Documents/Teknik/tsstakip-main/scripts/create-admin.mjs:1)
- [docs/HANDOVER.md](/Users/admin/Documents/Teknik/tsstakip-main/docs/HANDOVER.md:1)

Degistirilen dosyalar:

- [package.json](/Users/admin/Documents/Teknik/tsstakip-main/package.json:1)

## 4. Calisan Durum

Su an teyit edilenler:

- uygulama yerelde aciliyor
- admin kullanici olusturulabiliyor
- admin login calisiyor
- temel auth akisi ayakta

Yerel calisma adresi:

- `http://localhost:3002`

Not:

- `localhost:3000` kullanilmadi; kullanicinin baska projesi o portu kullaniyor.

## 5. Ortam Degiskenleri

Yerel ortam dosyasi `.env.local` icindedir ve `.gitignore` nedeniyle repoya gitmez.

Beklenen degiskenler:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Not:

- `SUPABASE_SECRET_KEY` kodda fallback olarak destekleniyor
- tercih edilen degisken `SUPABASE_SERVICE_ROLE_KEY`

## 6. Supabase Durumu

Kritik not: Supabase kurulumu tam otomatik ve temiz migration akisina henuz alinmadi.

Bu devir sirasinda karsilasilan durum:

- orijinal migrationlarin SQL Editor'da calistirilmasi sirasinda parcali calistirma ve policy syntax sorunlari yasandi
- sistemin giris yapabilmesi icin `profiles` tablosu ve ilgili policy'ler once asgari duzeyde ayağa kaldirildi

Bu nedenle Supabase tarafinda su kabul ile ilerlenmeli:

- auth/login calisiyor
- ama tum tablolarin, policy'lerin ve storage tarafinin eksiksiz kuruldugu garanti edilmemeli
- uygulamanin diger ekranlari test edilerek eksik SQL'ler temizlenmeli

## 7. Admin Kullanici

Admin olusturma komutu:

```bash
npm run admin:create -- admin@example.com GucluBirSifre123! "Ad Soyad"
```

Script ne yapar:

- `.env.local` yukler
- Supabase Auth icinde kullanici olusturur veya mevcut kullaniciyi bulur
- `profiles` tablosunda kullaniciyi `admin` olarak upsert eder

## 8. Gelistirme Komutlari

Kurulum:

```bash
npm install
```

Gelistirme:

```bash
npm run dev -- --port 3002
```

Lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```

Admin olusturma:

```bash
npm run admin:create -- admin@example.com GucluBirSifre123! "Ad Soyad"
```

## 9. Bilinen Riskler ve Teknik Borclar

En onemli teknik riskler:

1. API tokenlari duz metin olarak saklaniyor ve admin UI'da tekrar goruntulenebiliyor.
2. Uye kullanicilarin servis statuslerini gereginden genis guncelleme yetkisi olabilir.
3. Foto yukleme akisi atomik degil; storage ve tablo tarafinda tutarsizlik olusabilir.
4. Supabase migration akisi temiz ve tekrar edilebilir hale getirilmemis durumda.
5. SQL policy yapisi sahada tek tek test edilmeli; ozellikle `storage.objects` ve servis bazli yetkiler.

## 10. Ritma Flex ile Karsilastirmada Eksik Alanlar

Urun perspektifinden buyuk eksikler:

- stok / yedek parca entegrasyonu
- kullanilan parca ve servis maliyeti takibi
- periyodik bakim ve bakim sozlesmesi
- cihaz / varlik karti ve servis gecmisi
- takvim / randevu / planlama motoru
- coklu organizasyon yapisi: bayi, yetkili servis, bolge
- bildirimler: SMS, e-posta, WhatsApp
- teklif / siparis / fatura entegrasyonu
- mobil saha kabiliyetleri: konum, imza, belge, offline deneyim
- daha gelismis dashboard ve SLA raporlari

## 11. Sonraki En Dogru Adimlar

Kisa vadede onerilen sira:

1. Supabase semasini temiz sekilde yeniden duzenle ve migrationlari calisir hale getir.
2. Tum admin ekranlarini tek tek test et: dashboard, ayarlar, uyeler, servisler, raporlar.
3. Storage bucket ve photo policy'leri dogrula.
4. API token yapisini hash-only modele gecir.
5. Servis lifecycle yetkilerini daralt.
6. Ilk urun gelistirme adimi olarak cihaz karti + servis gecmisi ekle.
7. Sonrasinda stok/parca ve periyodik bakim modullerine gec.

## 12. Devralacak Kisi Icin Kisa Ozet

Bu proje su anda "tamamen bitmis urun" degil; ancak cekirdek servis takip omurgasi calisir durumda.

En dogru zihinsel model:

- auth ve temel panel yapisi hazir
- Supabase entegrasyonu bagli
- admin girisi calisiyor
- ama veri modeli ve policy katmani yeniden elden gecirilmeli
- bundan sonraki gelistirme hem urunlestirme hem de altyapi sertlestirme asamalarini birlikte gerektiriyor
