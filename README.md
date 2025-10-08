# Wordford

Modern ve oyunlaştırılmış bir İngilizce kelime öğrenme uygulaması. Expo + React Native + TypeScript üzerinde kurulmuştur ve Firebase, RevenueCat ile günlük enerji ve "cevabı göster" sistemi, captcha ve cihaz güvenliği gibi özellikleri destekler.

## ✨ Özellikler
- **E-posta/Şifre ile üyelik** ve kayıt sırasında cihaz güvenliği + captcha kontrolü
- **Cihaz başına kayıt ve giriş limiti** ile brute force engelleme
- **Günlük enerji ve cevabı göster hakları**; cevap gösterme veya ekstra deneme için tüketilir, bonuslar günlük sıfırlamadan etkilenmez
- **Seviye bazlı kelime kartları** (A1–C2), favorileme ve öğrenilen kelimeleri işaretleme
- **İlerleme takibi** (mastered/in-progress) ve toplam başarı yüzdeleri
- **Reklam araları için sayaç** (placeholder) ve RevenueCat üzerinden enerji/ad-free satın alma akışları (konfigürasyon gerekli)
- **Yönetici araçları** ile kelime ekleme ve kullanıcılara bonus enerji/"cevabı göster" hakları tanımlama
- **İletişim formu ve yönetimi**; profil ekranından captcha korumalı mesaj gönderme, admin panelinden talepleri görüntüleme ve statü güncelleme
- **Tema ve bileşen kütüphanesi** ile tutarlı görsel stil

## 📁 Proje Yapısı
```
src/
  components/      // UI bileşenleri (Button, ProgressBar vb.)
  config/          // Firebase & RevenueCat yapılandırmaları
  constants/       // Seviye listeleri, sabitler
  context/         // Auth ve Word context sağlayıcıları
  data/            // Örnek kelime verisi
  navigation/      // Stack & Tab gezinti yapılandırmaları
  screens/         // Auth, Home, Level, Profile, Admin ekranları
  services/        // Firebase işlemleri, enerji/cevap hakları, güvenlik, RevenueCat servisleri
  theme/           // Renkler, tipografi, spacing
  utils/           // Captcha, tarih, cihaz yardımcıları
```

## 🚀 Başlarken
### Gereksinimler
- Node.js 18+
- npm 9+ (repo `package-lock.json` kullanıyor)
- Expo CLI (`npm install -g expo-cli`) veya `npx expo`
- Firebase projesi (Authentication + Firestore etkin)
- RevenueCat hesabı ve ürün kimlikleri

### Kurulum
```bash
npm install
```

```bash
npm run start
```
Expo QR kodu ile cihazınızda veya emülatörde uygulamayı açabilirsiniz.

## 🔐 Firebase Yapılandırması
1. `src/config/firebase.ts` içindeki `REPLACE_WITH_...` alanlarını Firebase projenizin değerleriyle güncelleyin.
2. Authentication > Sign-in method altında **Email/Password** yöntemini aktifleştirin.
3. Firestore Database oluşturun ve aşağıdaki örnek kuralları uygulayın:

```bash
firebase login
firebase init firestore
# ardından rules dosyasını düzenleyin ve aşağıdaki içerikle güncelleyin
```

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{userId} {
      allow read, create: if isOwner(userId);
      allow update: if isOwner(userId);
      allow delete: if false;
    }

    match /users/{userId}/progress/{wordId} {
      allow read, write: if isOwner(userId);
    }

    match /resourceTransactions/{docId} {
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow update, delete: if false;
    }

    match /devices/{deviceId} {
      allow read, write: if isSignedIn();
    }

    match /levels/{levelId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    match /levels/{levelId}/words/{wordId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    match /contactRequests/{requestId} {
      allow create: if request.resource.data.status == 'open';
      allow read, update: if isAdmin();
      allow delete: if false;
    }
  }
}
```

> **Not:** `isAdmin` fonksiyonu, `users/{uid}` belgesindeki `role` alanının `admin` olduğu senaryoda yazma izni tanır. Yönetici kullanıcı atamak için ilgili kullanıcının Firestore `users` kaydındaki `role` alanını `admin` olarak güncelleyin.

4. Gerekirse indeksleri ve `devices` koleksiyonu için varsayılan belgeleri oluşturun (ilk girişte servisler kendileri oluşturmaya çalışır).

## 💸 RevenueCat Kurulumu
1. `src/config/appConfig.ts` içindeki `REVENUECAT_KEYS.apiKey` alanına RevenueCat public API anahtarınızı girin.
2. RevenueCat’te "credits" ve "ad-free" ürünlerini oluşturun ve `src/types/models.ts` içindeki `PurchasePackageIds` tipini kullanarak ürün kimliklerini `purchasePackage` ve `purchaseAdFree` çağrılarına parametre olarak geçirin.
3. `configureRevenueCat` fonksiyonu SDK’yı ilk çağrıda hazırlar. Test/Simülasyon için RevenueCat sandbox kullanıcılarını kullanın.

## 📱 Reklam Entegrasyonu
`src/services/adService.ts` şu anda yalnızca placeholder log üretir. AdMob veya tercih ettiğiniz sağlayıcıdan interstitial reklam gösterimi eklemek için `showInterstitialAd` fonksiyonunu güncelleyin.

## 🔄 Günlük Enerji & Haklar
- `creditService.ensureDailyResources` her oturumda kullanıcıya günlük enerji ve "cevabı göster" haklarını Firebase sunucu saatiyle senkronize şekilde tanımlar.
- `progressService.recordAnswerResult` doğru/yanlış cevapları deneme sayısı ve durum olarak işler.
- `AuthContext` ve `WordContext` gerekli servisleri tek noktadan sağlar.

## 📬 İletişim Talepleri
- Profil ekranındaki **“İletişim”** butonu, captcha doğrulamalı form ile `contactRequests` koleksiyonuna kayıt ekler.
- Kayıtlı kullanıcı bilgilerinden e-posta ve ad otomatik doldurulur; misafir kullanıcılar manuel girebilir.
- Admin panelinde yer alan **“Destek Kutusu”** kısayolu, `AdminContactRequestsScreen` üzerinden talepleri listeler, durumlarını **açık/çözüldü** olarak günceller.
- `contactService.ts` istemci tarafı Firestore işlemlerini kapsüller. Gerekirse ek alanlar (cihaz bilgisi, uygulama sürümü vb.) aynı servis üzerinden gönderilebilir.
- Firestore kurallarına uygun olarak yalnızca yöneticiler talepleri okuyabilir/güncelleyebilir; herkes yeni talep oluşturabilir.

## 🧪 Doğrulama
Hızlı tip kontrolü:

```bash
npx tsc --noEmit
```

Expo sağlık kontrolü (opsiyonel):

```bash
npx expo-doctor
```

## 🛠️ Faydalı Komutlar
```bash
npm run start   # Expo Metro sunucusunu başlatır
npm run android # Android emülatöründe açar
npm run ios     # iOS simülatöründe açar (macOS + Xcode gerektirir)
npm run web     # Web önizlemesi
```

## 📓 Notlar & Yapılacaklar
- Captcha doğrulama servisinin gerçek backend entegrasyonu yapılmalıdır (şu anda utils içindeki mock fonksiyon kullanılıyor).
- Reklam ve RevenueCat satın alma akışları gerçek kimliklerle test edilmelidir.
- Firebase Functions ile gelişmiş güvenlik/günlük limit kontrolleri eklenecekse `src/config/firebase.ts` & `functions` dizinleri uyarlanmalıdır.

Keyifli geliştirmeler! 🎉
