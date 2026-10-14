# Iron Front — WWII Browser FPS

Iron Front, masaüstü tarayıcılar için geliştirilen 2. Dünya Savaşı temalı FPS prototipidir.

## Özellikler
- Three.js ile birinci şahıs 3D savaş alanı
- WASD hareketi, fareyle bakış ve nişan, ateş etme, şarjör yenileme
- Yapay zekâ düşmanları ve temel savaş döngüsü
- Socket.IO ile oyuncu konumu / çok oyunculu senkronizasyon altyapısı
- bcrypt ile parola hashleme, JWT oturumu ve SQLite kullanıcı kayıtları
- XP ve skor kayıtları için başlangıç düzeyinde kalıcı profil desteği
- Render dağıtımı için Blueprint yapılandırması

## Yerelde çalıştırma
Node.js 20 kullanılması önerilir.

```bash
npm install
npm start
```

Tarayıcıdan http://localhost:3000 adresini açın.

## Render'a dağıtım
1. https://dashboard.render.com/ adresine girin.
2. **New + → Blueprint** seçin.
3. GitHub deposu olarak https://github.com/ykntr1/iron-front-ww2 adresini bağlayın.
4. Render'ın kökteki `render.yaml` dosyasını algıladığını doğrulayın ve dağıtımı başlatın.
5. Dağıtım bittikten sonra Render'ın verdiği `onrender.com` adresini açın. Sağlık kontrolü `/api/health` yolundadır.

Render, `JWT_SECRET` değerini Blueprint'te otomatik üretir. Bu değeri kaynak koda yazmayın veya herkese açık paylaşmayın.

## Kontroller
- **W A S D:** hareket
- **Fare:** kamera / nişan
- **Sol tık:** ateş
- **R:** yeniden doldur
- **Shift:** koşma
- **Space:** zıplama (uygulanan sürümde destekleniyorsa)
- **Esc:** fare kilidini bırak

## Kalıcılık ve yayın notları
Render'ın ücretsiz web servislerinde yerel dosya sistemi kalıcı değildir. SQLite veritabanı servis yeniden başlatıldığında veya yeniden dağıtıldığında kaybolabilir. Hesapların ve ilerlemenin kalıcı olması için Render Persistent Disk (ücretli plan koşullarını kontrol edin) veya yönetilen PostgreSQL kullanıp veritabanı bağlantısını sunucuya ekleyin.

Bu proje erken aşama prototiptir; üretim öncesinde sunucu tarafı isabet/hasar doğrulaması, oran sınırlama, güvenlik testleri, hata izleme, yedekleme, gerçek eşleştirme ve gecikme telafisi gerekir. Mevcut bot ve multiplayer davranışı rekabetçi yayın için hazır kabul edilmemelidir.

Three.js CDN üzerinden yüklendiği için oyun istemcisi internet bağlantısı gerektirir. Grafikler ve oynanış, Call of Duty: WWII seviyesinde AAA içerik değildir; bu hedef için özel/lisanslı varlıklar, animasyonlar, ses tasarımı ve ileri render çalışması gerekir.
