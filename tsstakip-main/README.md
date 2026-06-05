# TSS Takip

Next.js, TypeScript, Tailwind CSS ve Supabase ile geliştirilen servis kayıt yönetim uygulaması.

## Roller

- `admin`: Üyeleri yönetir, üye ekler/siler, tüm servis kayıtlarını görüntüler ve düzenler.
- `member`: Sadece kendi adına servis kaydı açar ve kendi kayıtlarını görüntüler.

## Kurulum

```bash
npm install
npm run dev
```

Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde çalışır.

## Ortam Değişkenleri

`.env.example` dosyasını `.env.local` olarak kopyalayıp değerleri doldurun.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
OPENAI_API_KEY=
AI_QUEUE_CRON_SECRET=
NOTIFICATION_CRON_SECRET=
NOTIFICATION_DELIVERY_MODE=log
NOTIFICATION_WEBHOOK_SMS_URL=
NOTIFICATION_WEBHOOK_WHATSAPP_URL=
NOTIFICATION_WEBHOOK_AUTH_HEADER=Authorization
NOTIFICATION_WEBHOOK_AUTH_TOKEN=
TRUST_SCORE_CRON_SECRET=
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_CUSTOMER_SITES_TABLE_ID=
AIRTABLE_SYNC_SECRET=
```

`SUPABASE_SECRET_KEY` sadece server-side admin işlemlerinde kullanılır. Vercel deploy sırasında gerekli ortam değişkenlerini Project Settings > Environment Variables alanına ekleyin.

## Musteri / Site ve Sehir Yapisi

- Taseronlar artik sehir bilgisi ile tutulur.
- Finans carpanlari bolge yerine sehir bazli yonetilir.
- Servis formunda kayitli `site / musteri` secilebilir ve alanlar otomatik dolar.
- Turkiye il ve ilce listesi uygulama icine sabit veri olarak dahil edilmiştir.

`Airtable` ile musteri/site senkronu icin:

- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_CUSTOMER_SITES_TABLE_ID`

degerlerini tanimlayin. Sonra admin ayarlar ekranindaki `Airtable'dan Senkronize Et` butonu ile kayitlari `customer_sites` tablosuna cekebilirsiniz.

Alternatif olarak Airtable Automation veya script tarafindan TSS'ye dogrudan POST da atabilirsiniz:

```text
POST /api/integrations/airtable/customer-sites
Authorization: Bearer <AIRTABLE_SYNC_SECRET>
```

Payload tek kayit veya dizi olabilir. Gerekli alanlar:

```json
{
  "organization_id": "uuid",
  "site_code": "SITE-001",
  "customer_name": "Acme Plaza",
  "customer_phone": "+90555...",
  "address": "Adres",
  "city_name": "Istanbul",
  "district_name": "Kadikoy",
  "project_name": "Merkez Proje",
  "record_id": "recAirtable123"
}
```

## AI Kuyruk Cron

Ses notu analiz kuyruğu için protected bir cron endpoint hazırdır:

```text
POST /api/cron/ai-queue
Authorization: Bearer <AI_QUEUE_CRON_SECRET>
```

Opsiyonel query parametreleri:

- `organization_id`: sadece tek organizasyon kuyruğunu işler
- `kind`: `voice`, `photo` veya `all`, varsayılan `all`
- `limit`: organizasyon başına işlenecek kayıt sayısı, varsayılan `5`
- `max_organizations`: global tetikte aynı turda işlenecek maksimum organizasyon sayısı, varsayılan `10`

Örnek:

```bash
curl -X POST \
  -H "Authorization: Bearer $AI_QUEUE_CRON_SECRET" \
  "http://localhost:3000/api/cron/ai-queue?kind=all&limit=5&max_organizations=10"
```

## Bildirim Worker Cron

Bildirim teslim kuyruğu için ikinci bir protected endpoint hazırdır:

```text
POST /api/cron/notifications
Authorization: Bearer <NOTIFICATION_CRON_SECRET>
```

Opsiyonel query parametresi:

- `limit`: aynı turda işlenecek teslim sayısı, varsayılan `10`

Örnek:

```bash
curl -X POST \
  -H "Authorization: Bearer $NOTIFICATION_CRON_SECRET" \
  "http://localhost:3000/api/cron/notifications?limit=10"
```

Teslim modu secenekleri:

- `disabled`: teslimleri iptal eder
- `log`: gercek provider'a cikmadan teslimleri `sent` yapar
- `webhook`: kanal bazli webhook endpoint'lerine gercek POST atar

`webhook` modunda:

- `NOTIFICATION_WEBHOOK_SMS_URL`: SMS teslimleri icin hedef URL
- `NOTIFICATION_WEBHOOK_WHATSAPP_URL`: WhatsApp teslimleri icin hedef URL
- `NOTIFICATION_WEBHOOK_AUTH_HEADER`: opsiyonel auth header adi, varsayilan `Authorization`
- `NOTIFICATION_WEBHOOK_AUTH_TOKEN`: opsiyonel auth token. Header adi verilirse dogrudan o header'a yazilir, verilmezse `Bearer` olarak gonderilir

Webhook payload'i su alanlari icerir:

```json
{
  "delivery_id": "uuid",
  "channel": "sms",
  "recipient": "+90555...",
  "message": "Merhaba ...",
  "event_key": "service_started",
  "service_id": "uuid",
  "attempts": 1
}
```

## Public Canli Takip

Servis detay ekranından `public tracking` açıldığında sistem her servis için token'lı bir public takip adresi üretir:

```text
/track/<public_tracking_token>
```

Üye panelinde servis `in_progress` olduğunda tarayıcı konumu düzenli olarak `/api/services/:id/live-location` endpoint'ine gönderilir ve public takip ekranı bunu periyodik olarak yeniler.

## Trust Score Cron

Taşeron güven skorlarını toplu yenilemek için protected endpoint:

```text
POST /api/cron/trust-scores
Authorization: Bearer <TRUST_SCORE_CRON_SECRET>
```

## Supabase

SQL migration dosyaları `supabase/migrations` altında tutulur. Yeni kurulumda dosyaları sıra ile çalıştırın:

```text
001_initial_schema.sql
002_add_member_role.sql
003_member_access_model.sql
```

Eğer daha önce eski rol modeli çalıştırıldıysa, `002` ve `003` migration dosyaları rol modelini `admin/member` yapısına taşır.

`001_initial_schema.sql` çalışırken `column "member_id" does not exist` hatası alınırsa önce şu repair dosyasını çalıştırın, sonra `001_initial_schema.sql` dosyasını tekrar çalıştırın:

```text
supabase/repairs/repair_001_member_id_missing.sql
```
