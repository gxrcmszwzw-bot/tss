# TSS Takip Sozlesme Merkezli Operasyon Tasarimi

## Amac

Bu tasarimin amaci TSS Takip projesini sadece servis yonetimi yapan bir yapi olmaktan cikarip, teknik ekip altindaki farkli operasyon ekiplerinin ayni cekirdekte calisabildigi moduler bir operasyon platformuna donusturmektir.

Hedeflenen ekipler:

- Teknik Satin Alma
- Teknik Kurulum
- Teknik Destek / Teknik Servis
- IoT Ekibi

Bu ekipler ayni veri omurgasini kullanacak, fakat kendi modullerinde ve kendi is listelerinde calisacaktir. Ortak baglanti noktasi `sozlesme` olacaktir.

## Problem Tanimi

Mevcut sistem agirlikli olarak servis, taseron, saha operasyonu ve servis finans akislarini yonetiyor. Bu yapi teknik destek ve teknik servis tarafinda guclu bir temel sagliyor, ancak tum teknik organizasyonu tek bir operasyon modelinde toplamak icin yetersiz kaliyor.

Ozellikle su alanlar eksik:

- sozlesme ana kaydi
- bir siteye bagli birden fazla sozlesme modeli
- satin alma ve depo akislarinin sistemsel takibi
- kurulum proje ve faz yonetimi
- servis kayitlarinin sozlesme baglamina oturtulmasi
- IoT aylik operasyonlari icin ayri bir domain modeli
- tek bir sozlesmenin tum yasam dongusunu gosteren merkezi ekran

## Tasarim Ilkeleri

- Ortak cekirdek, ayri moduller
- Servis modulu korunur; kurulum ve satin alma ile ayni kayda zorlanmaz
- Her operasyonel kayit bir `contract_id` ile merkezi sozlesmeye baglanir
- Lookup modelinde `site` fiziksel lokasyonu temsil eder, `sozlesme` operasyon ve ticari merkezi temsil eder
- Bir site birden fazla sozlesmeye sahip olabilir
- Sozlesme karti 360 derece gorunum sunar
- Moduller kendi ekranlarina ve kendi is listelerine sahip olur
- Fazlama kademeli yapilir; once cekirdek ve kurulum, sonra stok ve IoT

## Kapsam

Bu tasarim ilk asamada su alanlari kapsar:

- sozlesme merkezli cekirdek veri modeli
- site ile coklu sozlesme iliskisi
- kurulum modulu tasarimi
- mevcut servis modulu ile sozlesme baglantisi
- satin alma ve stok modulu icin baglanti noktalari
- IoT modulu icin baglanti noktalari
- sozlesme karti ve site karti gorunum modeli
- ilk faz uygulama sinirlari

Kapsam disi:

- tam satin alma siparis motoru
- tam depo lot veya seri numarasi otomasyonu
- tam IoT okuma ve faturalandirma motoru
- yenileme otomasyonlari
- tum KPI dashboard'larinin ilk fazda tamamlanmasi

## Mevcut Durum Analizi

### Kurulmus Alanlar

- `services` tablosu ve servis kayit akislari
- `customer_sites` ile musteri veya site lookup yapisi
- taseron yonetimi ve taseron skorlamasi
- finans is kalemi, fiyatlandirma, pazarlik, fatura ve odeme batch mantigi
- bildirim ve arka plan isleyicileri
- canli takip, AI inceleme ve saha medya kayitlari

### Kismi Olarak Hazir Alanlar

- site bazli lookup mantigi
- operasyonel ekip ve taseron atama yapisi
- fiyatlandirma ve bolgesel finans tabani

### Eksik Alanlar

- `contracts` omurgasi
- siteye bagli coklu sozlesme modeli
- kurulum proje ve faz modeli
- satin alma ve depo modulu
- servis kayitlarinin sozlesme veya proje baglami
- IoT aylik operasyon modeli
- sozlesme yasam dongusu ozeti

## Onerilen Genel Mimari

Onerilen yapi mevcut `Next.js + Supabase` tabani uzerinde moduler bir monolith olarak ilerlemelidir.

Ana sinirlar:

- `Core Lookup Layer`
- `Contract Center`
- `Installation Module`
- `Service & Support Module`
- `Procurement & Stock Module`
- `IoT Operations Module`
- `Reporting & Timeline Layer`

Bu sinirlar ayni veritabani ve ayni uygulama icinde yasayabilir, fakat tablo, ekran ve action bazinda ayrik tutulmalidir.

## Merkez Model

### Temel Kavramlar

- `Site`
  Fiziksel lokasyon veya operasyon noktasi.
- `Sozlesme`
  Ticari ve operasyonel ana kayit.
- `Proje`
  Sozlesmenin uygulanabilir operasyon kutusu.
- `Modul`
  Belirli bir sozlesme icin aktif operasyon alani. Ornek: kurulum, servis, IoT, stok.

### Iliski Mantigi

- bir `site` birden cok `sozlesme`ye sahip olabilir
- bir `sozlesme` bir veya birden cok `site` ile iliskili olabilir
- bir `sozlesme` bir veya birden cok `proje` dogurabilir
- servis kayitlari belirli bir sozlesme veya proje ile iliskili olabilir
- kurulum, stok ve IoT kayitlari dogrudan sozlesmeye bagli calisir

Bu model sayesinde:

- Aydin Apartmani tek bir `site` olarak tanimli kalir
- ayni siteye bagli PTS sozlesmesi ayri, sayac okuma sozlesmesi ayri tutulur
- her sozlesmenin kendi urunleri, kurulum durumu, servisleri ve IoT isleyisi ayri goruntulenir

## Veri Modeli

### 1. Cekirdek Lookup Katmani

#### `customer_sites`

Mevcut site lookup yapisi korunur ve fiziksel lokasyon ana karti olarak kullanilir.

Kullanim amaci:

- fiziksel lokasyon
- musteri baglami
- adres ve iletisim tabani
- ayni sitenin farkli sozlesmeler tarafindan tekrar kullanilmasi

#### `contracts`

Ana ticari ve operasyonel merkez.

Alan onerileri:

- `id`
- `organization_id`
- `contract_no`
- `contract_type`
- `customer_name`
- `status`
- `start_date`
- `end_date`
- `renewal_date`
- `technical_owner_id`
- `commercial_owner_id`
- `primary_site_id`
- `lifecycle_stage`
- `summary`
- `notes`
- `created_at`
- `updated_at`

#### `contract_sites`

Sozlesme ile site iliskisini kurar.

Alan onerileri:

- `id`
- `contract_id`
- `site_id`
- `role`
- `is_primary`
- `created_at`

`role` ornekleri:

- `installation_site`
- `service_site`
- `iot_site`
- `billing_site`

#### `contract_modules`

Bir sozlesmede hangi operasyon modullerinin aktif oldugunu belirler.

Alan onerileri:

- `id`
- `contract_id`
- `module_key`
- `is_enabled`
- `started_at`
- `ended_at`

`module_key` ornekleri:

- `installation`
- `service_support`
- `procurement_stock`
- `iot_operations`

#### `contract_products`

Sozlesmeye bagli urun ve kapsam listesi.

Alan onerileri:

- `id`
- `contract_id`
- `catalog_item_id`
- `product_name_snapshot`
- `quantity`
- `unit`
- `requires_installation`
- `is_iot_related`
- `is_service_covered`
- `notes`
- `created_at`

### 2. Kurulum Modulu

#### `projects`

Sozlesmenin operasyonel uygulama kabidir.

Alan onerileri:

- `id`
- `contract_id`
- `name`
- `status`
- `planned_start_at`
- `planned_end_at`
- `actual_start_at`
- `actual_end_at`
- `project_manager_id`
- `notes`

#### `project_phases`

Kurulum asamalari.

Alan onerileri:

- `id`
- `project_id`
- `phase_key`
- `status`
- `planned_start_at`
- `planned_end_at`
- `completed_at`
- `sort_order`

`phase_key` ornekleri:

- `discovery`
- `material_preparation`
- `field_installation`
- `commissioning`
- `training`
- `customer_acceptance`

#### `installation_tasks`

Sahada veya hazirlik asamasinda yapilacak somut isler.

Alan onerileri:

- `id`
- `project_phase_id`
- `contract_id`
- `site_id`
- `title`
- `task_type`
- `status`
- `assigned_team`
- `assigned_member_id`
- `assigned_subcontractor_id`
- `planned_at`
- `completed_at`
- `depends_on_task_id`

#### `installation_deliverables`

Kurulum ciktisi ve teslim kayitlari.

Alan onerileri:

- `id`
- `contract_id`
- `project_id`
- `deliverable_type`
- `status`
- `delivered_at`
- `delivered_by`
- `approval_required`
- `approved_at`
- `notes`

`deliverable_type` ornekleri:

- `training_completed`
- `system_commissioned`
- `acceptance_form_signed`
- `handover_completed`

### 3. Teknik Servis / Destek Modulu

Mevcut `services` yapisi korunur. Bu tasarimda servis modulu ayri bir operasyon ailesi olarak kalir.

Eklenecek iliski alanlari:

- `contract_id`
- `project_id`
- `contract_site_id`

Bu sayede servis kayitlari:

- bir sozlesmenin kapsami icinde mi
- hangi proje ile iliskili
- hangi site veya lokasyon icin acildi

sorularina cevap verebilir.

Servis modulu yeni sistemde destek ve teknik servis akislarini yonetir:

- destek talepleri
- saha servis planlamasi
- ucretli veya ucretsiz servisler
- taseron yonlendirmeleri

### 4. Satin Alma / Depo / Stok Modulu

Bu modulu ilk fazda tam uygulamak yerine veri baglanti noktalarini tasarlamak yeterlidir.

#### Onerilen tablolar

- `inventory_items`
- `warehouses`
- `stock_units` veya `stock_batches`
- `stock_movements`
- `contract_material_reservations`
- `purchase_requests`
- `purchase_orders`

#### Mantik

- kurulum veya proje bir urun ihtiyaci olusturur
- satin alma ekibi talebi gorur
- stoktan rezervasyon yapar veya siparis acar
- malzeme sevke hazirlanir
- montajda kullanilan urunler hareket olarak dusulur
- demontaj urunleri gerekiyorsa geri giris olur

Bu modulin ana baglantisi `contract_id` ve urun bazli bag kurulan durumlarda `contract_product_id` uzerinden kurulur.

### 5. IoT Operasyon Modulu

Bu modulu de ilk fazda tam uygulamak yerine dogru domain sinirlarini cizmek gerekir.

#### Onerilen tablolar

- `iot_assets`
- `iot_reading_cycles`
- `iot_readings`
- `iot_distribution_runs`
- `iot_billing_runs`

#### Mantik

- yalnizca IoT aktif sozlesmelerde calisir
- sozlesmenin urunleri ve site iliskisi uzerinden cihazlar veya sayaclar baglanir
- aylik okuma dongusu planlanir
- dagitim ve faturalandirma akislarina cikti verir

Bu modulin ana baglantisi `contract_id` olacaktir.

## Yasam Dongusu Modeli

Her sozlesmenin merkezi bir yasam dongusu ozetine ihtiyaci vardir.

Onerilen `lifecycle_stage` degerleri:

- `draft`
- `approved`
- `procurement_pending`
- `installation_planned`
- `installation_in_progress`
- `partially_live`
- `live`
- `support_phase`
- `renewal_due`
- `closed`

Bu alan elle guncellenebilir veya modullerden gelen sinyallerle turetilmis bir ozet alan olabilir.

Onerilen yaklasim:

- ilk fazda kontrollu ve acik kurallar icin server-side guncellenen alan
- ilerleyen fazlarda modullerden derive edilen otomatik hesaplama

## Gorunum Modeli

### 1. Sozlesme Karti

Ana operasyon ekranidir. Tek sozlesmenin tum yasam dongusunu gosterir.

Sekmeler:

- `Genel`
- `Urunler ve Malzemeler`
- `Kurulum`
- `Servis ve Destek`
- `IoT Operasyon`
- `Zaman Cizgisi`

Gosterilecek ozetler:

- sozlesme durumu
- yasam dongusu asamasi
- bagli site ve proje sayisi
- urun ve malzeme hazirlik durumu
- kurulum ilerleme orani
- acik servis kayitlari
- IoT aylik dagitim ozeti
- kritik tarih ve gecikmeler

### 2. Site Karti

Iliski ve tarihce ekranidir.

Sekmeler:

- `Site Ozeti`
- `Sozlesmeler`
- `Acik Isler`
- `Varliklar`

Amaç:

- ayni siteye bagli farkli sozlesmeleri birlikte gormek
- lokasyon bazli butun operasyon gecmisini takip etmek

### 3. Modul Calisma Ekranlari

Her ekip kendi operasyon listesinde calisir.

#### Satin Alma / Depo

- malzeme talepleri
- rezervasyonlar
- eksik stoklar
- sevk hazirliklari

#### Kurulum

- projeler
- aktif fazlar
- bugun yapilacak saha isleri
- taseron atamalari
- geciken teslimatlar

#### Teknik Destek / Teknik Servis

- acik destek talepleri
- planli servisler
- saha mudahaleleri
- ucretli veya ucretsiz servis ayrimi

#### IoT

- acik okuma donguleri
- basarisiz okuma oranlari
- dagitim ve faturalandirma calismalari

Her kayittan geri donus noktasi ayni `sozlesme karti` olur.

## Rol ve Yetki Yansimasi

Bugunku `admin/member` modeli hedef yapi icin yetersizdir, ancak ilk fazda tamamen degistirilmesi zorunlu degildir.

Onerilen gecis modeli:

- mevcut global erisim bozulmaz
- modul bazli ekip rolleri organization katmaninda genisletilir

Ornek ekip rolleri:

- `procurement_member`
- `installation_member`
- `support_member`
- `iot_member`
- `technical_manager`

Bu roller ilk fazda tam policy seviyesinde degilse bile ekran filtreleme, atama ve is listesi bazinda uygulanabilir.

## Fazlama Onerisi

### Faz 1

- `contracts`
- `contract_sites`
- `contract_modules`
- `contract_products`
- `projects`
- `project_phases`
- `installation_tasks`
- `services` tablosuna sozlesme baglantilari
- `sozlesme karti`
- `site karti`
- temel `kurulum panosu`

### Faz 2

- satin alma talepleri
- stok rezervasyon
- depo hareket temeli
- kurulum ile stok entegrasyonu

### Faz 3

- IoT varlik ve okuma donguleri
- aylik dagitim ve faturalandirma akislarinin ilk versiyonu

### Faz 4

- ileri dashboard'lar
- otomatik yasam dongusu hesaplama
- yenileme ve SLA otomasyonlari

## Hata ve Tutarlilik Kurallari

- bir servis kaydi sozlesmesiz acilabiliyorsa bu acikca desteklenmeli veya engellenmeli
- bir `project` mutlaka bir `contract`a bagli olmali
- bir `contract_product` sozlesme silinirse cascade veya soft delete kurali net olmali
- ayni site uzerinde farkli sozlesmeler oldugu icin ekranlar daima `site` ve `contract`i ayri gostermeli
- stok rezervasyonlari sozlesme urunlerinden bagimsiz serbest veri olarak birakilmamali
- IoT modulu aktif olmayan sozlesmelerde IoT ekranlari gosterilmemeli

## Test Stratejisi

Ilk faz testlerinin odagi is kurali dogrulugu olmali:

- bir siteye birden fazla sozlesme baglanabiliyor mu
- bir sozlesme birden fazla siteye baglanabiliyor mu
- sozlesmeden proje acilabiliyor mu
- projeden kurulum gorevleri dogabiliyor mu
- servis kaydi ilgili sozlesmeye baglanabiliyor mu
- sozlesme karti kurulum ve servis ozetlerini birlikte gosterebiliyor mu
- site karti ayni siteye bagli coklu sozlesmeleri gosterebiliyor mu

## Ozet

Bu tasarimda TSS Takip'in yeni merkezi `sozlesme` olur. `Site` fiziksel lookup olarak korunur. Her ekip ayni merkezi sozlesmeye bakarak kendi modulu icinde calisir. Sozlesme karti 360 derece operasyon gorunumu saglar; site karti ise lokasyon bazli iliski ve tarihceyi sunar.

Bu yaklasim mevcut servis yapisini bozmadan buyur, kurulum ve satin alma gibi farkli operasyon tiplerini dogru domain sinirlariyla sisteme ekler ve gelecekteki IoT operasyonlarini ayni merkeze baglamaya imkan verir.
