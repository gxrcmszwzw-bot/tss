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
TRUST_SCORE_CRON_SECRET=
```

`SUPABASE_SECRET_KEY` sadece server-side admin işlemlerinde kullanılır. Vercel deploy sırasında gerekli ortam değişkenlerini Project Settings > Environment Variables alanına ekleyin.

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

`NOTIFICATION_DELIVERY_MODE=log` iken worker gerçek provider'a çıkmadan teslimleri `sent` durumuna geçirir ve audit izi bırakır. Gerçek SMS/WhatsApp sağlayıcısı bağlandığında bu mod provider entegrasyonu ile değiştirilebilir.

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
