# Supabase Kurulum Notlari

Bu proje artik su Supabase projesine bagli:

- `NEXT_PUBLIC_SUPABASE_URL=https://wrtiqjcfwlxwhdzgtsax.supabase.co`

## 1. Veritabani semasini kur

Supabase Dashboard -> SQL Editor icinde asagidaki migration dosyalarini bu sirayla calistir:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_add_member_role.sql`
3. `supabase/migrations/003_member_access_model.sql`
4. `supabase/migrations/004_member_paid_service_insert.sql`
5. `supabase/migrations/005_service_photos_bucket.sql`
6. `supabase/migrations/006_photo_delete_policies.sql`
7. `supabase/migrations/007_service_number_and_api_status.sql`
8. `supabase/migrations/008_api_tokens.sql`
9. `supabase/migrations/009_api_token_history.sql`

Not:

- `001_initial_schema.sql` calisirken `column "member_id" does not exist` benzeri bir hata alirsan once `supabase/repairs/repair_001_member_id_missing.sql` dosyasini calistir, sonra `001_initial_schema.sql` dosyasini yeniden calistir.

## 2. Ilk admin hesabini olustur

Migrationlar bittikten sonra terminalden:

```bash
npm run admin:create -- admin@example.com GucluBirSifre123! "Senin Adin"
```

Bu script:

- Supabase Auth icinde kullaniciyi olusturur
- `profiles` tablosunda rolu `admin` yapar
- kullaniciyi aktif hale getirir

## 3. Uygulamayi calistir

```bash
npm run dev
```

Ardindan giris ekrani:

- `http://localhost:3000`

## 4. Ilk kontrol listesi

- Login calisiyor mu?
- Admin paneli aciliyor mu?
- Yeni servis kaydi olusuyor mu?
- `service-photos` bucket olustu mu?
- Rapor ve ayarlar sayfalari hata vermeden aciliyor mu?

## 5. Sonraki teknik isler

Bu proje artik senin bakimin altinda olacaksa ilk firsatta su alanlari ele al:

1. API tokenlarini duz metin yerine sadece hash olarak sakla.
2. Uye kullanicilarin servis statuslerini keyfi degistirmesini engelle.
3. Foto yukleme akisini server-side veya rollback destekli hale getir.
4. Supabase migrationlarini CLI tabanli bir akisa tasiyip version disiplinini oturt.
