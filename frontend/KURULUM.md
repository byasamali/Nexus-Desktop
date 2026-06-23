# Pratikecza - Kurulum Rehberi

## 1. Supabase Kurulumu

1. [supabase.com](https://supabase.com) adresine git ve hesap oluştur
2. Yeni bir proje oluştur
3. Proje settings'ten şunları al:
   - `NEXT_PUBLIC_SUPABASE_URL` (API URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Anon Key)

## 2. Ortam Değişkenlerini Ayarla

`.env.local` dosyasında:
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

## 3. Dependencies Yükle

```bash
npm install
```

## 4. Supabase Authentication Ayarları

Supabase Dashboard'da:
- Authentication > Providers'a git
- Email provider'ı enable et
- Onay email'lerini (optional) ayarla

## 5. Admin Paneli (Supabase Dashboard)

Kayıt isteklerini görmek için:
- Supabase Dashboard > Auth > Users
- Yeni kullanıcıları burada göreceksin
- Kullanıcıyı onaylamak için "Confirm" butonuna tıkla

## 6. Sayfalar

- `/register` - Kayıt sayfası
- `/login` - Giriş sayfası
- `/dashboard` - Oturum açan kullanıcılar için (korumalı)

## 7. Geliştirmeyi Başlat

```bash
npm run dev
```

http://localhost:3000 adresine git
