# 🔥 Firebase Setup ও Eduvance Admin Panel-এ Connect করার গাইড

## ধাপ ১: Firebase Account তৈরি করুন

1. ব্রাউজারে যান: **https://console.firebase.google.com**
2. আপনার **Google Account** দিয়ে login করুন
3. Firebase Console দেখতে পাবেন

---

## ধাপ ২: নতুন Firebase Project তৈরি করুন

1. **"Create a project"** বা **"Add project"** ক্লিক করুন
2. **Project Name** দিন: `eduvance-lms` (অথবা আপনার পছন্দের নাম)
3. **Google Analytics** — চাইলে Enable করুন, না চাইলে Disable করুন
4. **"Create project"** ক্লিক করুন
5. কিছুক্ষণ অপেক্ষা করুন, project তৈরি হয়ে গেলে **"Continue"** ক্লিক করুন

---

## ধাপ ৩: Firestore Database তৈরি করুন

1. বাম পাশের মেনু থেকে **"Build" > "Firestore Database"** ক্লিক করুন
2. **"Create Database"** ক্লিক করুন
3. **Location** সিলেক্ট করুন:
   - `asia-southeast1` (Singapore) — বাংলাদেশের জন্য সবচেয়ে কাছে
   - অথবা `asia-south1` (Mumbai)
4. **Security Rules** এ **"Start in test mode"** সিলেক্ট করুন
   > ⚠️ **নোট:** Test mode ৩০ দিনের জন্য open access দেয়। পরে Security Rules আপডেট করতে হবে।
5. **"Enable"** ক্লিক করুন

---

## ধাপ ৪: Web App Register করুন (Config পেতে)

1. Firebase Console-এ আপনার project-এ যান
2. **Project Overview** পেজে (হোম পেজ) **"</>"** (Web) আইকন ক্লিক করুন
3. **App Nickname** দিন: `Eduvance Admin`
4. **Firebase Hosting** — চেক করবেন না (আমরা Vercel ব্যবহার করছি)
5. **"Register app"** ক্লিক করুন

### 🔑 এখন আপনি Firebase Config দেখতে পাবেন:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "eduvance-lms.firebaseapp.com",
  projectId: "eduvance-lms",
  storageBucket: "eduvance-lms.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

> 📋 **এই config কপি করুন!** পরের ধাপে লাগবে।

---

## ধাপ ৫: Eduvance Admin Panel-এ Firebase Config যোগ করুন

1. আপনার প্রজেক্টের `js/firebase-config.js` ফাইল খুলুন
2. ফাইলের উপরে `firebaseConfig` অবজেক্ট পাবেন:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. **প্রতিটি `YOUR_...` value** আপনার Firebase Console থেকে কপি করা config দিয়ে **replace** করুন
4. ফাইল **Save** করুন

---

## ধাপ ৬: Firestore Security Rules আপডেট করুন (গুরুত্বপূর্ণ!)

> Test mode ৩০ দিন পর বন্ধ হয়ে যাবে। তাই rules আপডেট করুন:

1. Firebase Console > **Firestore Database** > **Rules** ট্যাবে যান
2. নিচের Rules কপি করে paste করুন:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // সব document read ও write করতে পারবে
    // Production-এ আরো strict rules দিন
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. **"Publish"** ক্লিক করুন

> ⚠️ **Production Tips:** পরে যখন প্রজেক্ট live করবেন, rules আরো strict করুন। যেমন শুধুমাত্র authenticated users-এ write access দিন।

---

## ধাপ ৭: টেস্ট করুন ✅

1. আপনার Vercel URL-এ যান (বা locally `index.html` খুলুন)
2. Login করুন
3. Dashboard-এ যান
4. **"New Course"** ক্লিক করে একটি course তৈরি করুন
5. Firebase Console > **Firestore Database** > **Data** ট্যাবে গিয়ে দেখুন data save হয়েছে কিনা

---

## 📁 Firestore Database Structure

আপনার database এভাবে organize হবে:

```
courses/ (collection)
  ├── {courseId}/ (document)
  │   ├── name: "Web Development"
  │   ├── description: "Learn web dev..."
  │   ├── thumbnail: "https://..."
  │   ├── createdAt: Timestamp
  │   ├── updatedAt: Timestamp
  │   │
  │   └── sections/ (subcollection)
  │       ├── {sectionId}/ (document)
  │       │   ├── name: "HTML Basics"
  │       │   ├── order: 0
  │       │   │
  │       │   └── contents/ (subcollection)
  │       │       ├── {contentId}/ (document)
  │       │       │   ├── type: "video"
  │       │       │   ├── name: "Intro to HTML"
  │       │       │   ├── url: "https://youtube.com/..."
  │       │       │   └── order: 0
  │       │       │
  │       │       └── {contentId}/ (document)
  │       │           ├── type: "pdf"
  │       │           ├── name: "HTML Cheatsheet"
  │       │           ├── url: "https://example.com/..."
  │       │           └── order: 1
```

---

## ❓ সমস্যা হলে

| সমস্যা | সমাধান |
|---|---|
| "Firebase app not initialized" | `firebase-config.js` ফাইলে config সঠিকভাবে বসানো হয়েছে কিনা চেক করুন |
| Data save হচ্ছে না | Firestore Security Rules চেক করুন, test mode আছে কিনা দেখুন |
| "Permission denied" error | Firestore Rules-এ `allow read, write: if true;` আছে কিনা চেক করুন |
| Console-এ data দেখা যাচ্ছে না | সঠিক Firebase project সিলেক্ট করা আছে কিনা চেক করুন |
| Page-এ কিছু লোড হচ্ছে না | Browser Console (F12) খুলে error দেখুন |
