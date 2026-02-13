# 🚀 Vercel-এ Eduvance Admin Panel Deploy করার গাইড

## ধাপ ১: Vercel Account তৈরি করুন

1. ব্রাউজারে যান: **https://vercel.com**
2. **"Sign Up"** বাটনে ক্লিক করুন
3. **GitHub** অথবা **Google** দিয়ে signup করুন (GitHub recommended)
4. Account verify করুন

---

## ধাপ ২: GitHub-এ প্রজেক্ট আপলোড করুন

### অপশন A: GitHub Desktop দিয়ে (সহজ পদ্ধতি)
1. **GitHub Desktop** ডাউনলোড করুন: https://desktop.github.com
2. ইনস্টল করে GitHub account দিয়ে login করুন
3. `File > Add Local Repository` ক্লিক করুন
4. `Eduvance` ফোল্ডার সিলেক্ট করুন
5. `Publish Repository` বাটনে ক্লিক করুন
6. Repository name দিন: `eduvance-admin`
7. `Publish` ক্লিক করুন

### অপশন B: Git Command Line দিয়ে
```bash
cd Eduvance
git init
git add .
git commit -m "Initial commit - Eduvance Admin Panel"
git remote add origin https://github.com/YOUR_USERNAME/eduvance-admin.git
git push -u origin main
```

> ⚠️ **গুরুত্বপূর্ণ:** `YOUR_USERNAME` এর জায়গায় আপনার GitHub username দিন

---

## ধাপ ৩: Vercel-এ প্রজেক্ট Import করুন

1. **https://vercel.com/dashboard** যান
2. **"Add New..." > "Project"** ক্লিক করুন
3. GitHub সিলেক্ট করুন
4. `eduvance-admin` repository খুঁজুন → **"Import"** ক্লিক করুন
5. **Framework Preset:** `Other` রাখুন
6. **Root Directory:** খালি রাখুন (default)

---

## ধাপ ৪: Environment Variables সেট করুন ⚡ (সবচেয়ে গুরুত্বপূর্ণ!)

Import পেজে **"Environment Variables"** সেকশনে নিচের variables যোগ করুন:

| Variable Name | Value (আপনার নিজের দিন) |
|---|---|
| `ADMIN_EMAIL` | `admin@example.com` (আপনার admin email) |
| `ADMIN_PASSWORD` | `your_secure_password` (আপনার admin password) |

### Firebase এর জন্য (js/firebase-config.js এ ব্যবহৃত):
Firebase config values আপনাকে সরাসরি `js/firebase-config.js` ফাইলে বসাতে হবে। Firebase Setup Guide দেখুন।

---

## ধাপ ৫: Deploy করুন

1. সব Environment Variables দেওয়া হয়ে গেলে **"Deploy"** বাটনে ক্লিক করুন
2. কিছুক্ষণ অপেক্ষা করুন (সাধারণত ১-২ মিনিট)
3. ✅ **"Congratulations!"** মেসেজ দেখলে Deploy সফল!
4. আপনি একটি লিংক পাবেন, যেমন: `https://eduvance-admin.vercel.app`

---

## ধাপ ৬: Deploy হওয়ার পর চেক করুন

1. আপনার Vercel URL-এ যান
2. Login পেজ আসবে
3. Environment Variables এ যে email ও password দিয়েছেন সেটা দিয়ে login করুন
4. Dashboard দেখতে পাবেন!

---

## 🔄 পরবর্তীতে Update করতে

1. কোডে পরিবর্তন করুন
2. GitHub-এ push করুন:
   ```bash
   git add .
   git commit -m "Updated..."
   git push
   ```
3. Vercel **স্বয়ংক্রিয়ভাবে** re-deploy করবে! 🎉

---

## ❓ সমস্যা হলে

| সমস্যা | সমাধান |
|---|---|
| Login কাজ করছে না | Vercel Dashboard > Settings > Environment Variables চেক করুন |
| "Server connection failed" error | `/api/auth` endpoint ঠিকমতো deploy হয়নি, Vercel logs চেক করুন |
| Firebase error | `firebase-config.js` ফাইলে সঠিক config আছে কিনা চেক করুন |
| পেজ লোড হচ্ছে না | Browser Console (F12) চেক করুন error দেখতে |
