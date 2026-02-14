// ================================================
// Firebase Configuration — Eduvance LMS (Student)
// ================================================
const firebaseConfig = {
    apiKey: "AIzaSyCnOKFxljT897IuSqwdat9cs8orSgQtqHs",
    authDomain: "diploma-result-app-1.firebaseapp.com",
    projectId: "diploma-result-app-1",
    storageBucket: "diploma-result-app-1.firebasestorage.app",
    messagingSenderId: "167287408836",
    appId: "1:167287408836:web:e0bfd634fa8c66a66be191",
    measurementId: "G-PLFFHMB76Y"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---- Public Firestore Helpers ----
const DB = {
    async getAllCategories() {
        const snap = await db.collection('categories').orderBy('order', 'asc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async getAllCourses() {
        const snap = await db.collection('courses').orderBy('createdAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async getCoursesByCategory(catId) {
        const snap = await db.collection('courses').where('categoryId', '==', catId).orderBy('createdAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async getCoursesByCategory(categoryId) {
        const snap = await db.collection('courses').where('categoryId', '==', categoryId).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async getCourse(id) {
        const doc = await db.collection('courses').doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },
    async getSections(courseId) {
        const snap = await db.collection('courses').doc(courseId)
            .collection('sections').orderBy('order', 'asc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async getContents(courseId, sectionId) {
        const snap = await db.collection('courses').doc(courseId)
            .collection('sections').doc(sectionId)
            .collection('contents').orderBy('order', 'asc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async getContent(courseId, sectionId, contentId) {
        const doc = await db.collection('courses').doc(courseId)
            .collection('sections').doc(sectionId)
            .collection('contents').doc(contentId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    // === ENROLLMENT ===
    async enrollCourse(userId, courseId) {
        const docId = `${userId}_${courseId}`;
        await db.collection('enrollments').doc(docId).set({
            userId, courseId,
            enrolledAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async unenrollCourse(userId, courseId) {
        const docId = `${userId}_${courseId}`;
        await db.collection('enrollments').doc(docId).delete();
    },

    async isEnrolled(userId, courseId) {
        const docId = `${userId}_${courseId}`;
        const doc = await db.collection('enrollments').doc(docId).get();
        return doc.exists;
    },

    async getEnrolledCourses(userId) {
        const snap = await db.collection('enrollments').where('userId', '==', userId).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // === PROGRESS TRACKING ===
    async saveProgress(userId, courseId, sectionId, contentId, data) {
        const docId = `${userId}_${courseId}_${contentId}`;
        await db.collection('progress').doc(docId).set({
            userId, courseId, sectionId, contentId,
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    },

    async getContentProgress(userId, courseId, contentId) {
        const docId = `${userId}_${courseId}_${contentId}`;
        const doc = await db.collection('progress').doc(docId).get();
        return doc.exists ? doc.data() : null;
    },

    async getCourseProgress(userId, courseId) {
        const snap = await db.collection('progress')
            .where('userId', '==', userId)
            .where('courseId', '==', courseId).get();
        return snap.docs.map(d => d.data());
    },

    async getRecentlyWatched(userId, limit = 6) {
        const snap = await db.collection('progress')
            .where('userId', '==', userId)
            .orderBy('updatedAt', 'desc')
            .limit(limit).get();
        return snap.docs.map(d => d.data());
    },

    // === ANNOUNCEMENTS (Read Only) ===
    async getActiveAnnouncements() {
        const snap = await db.collection('announcements')
            .where('active', '==', true)
            .orderBy('createdAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // === SETTINGS (Read Only) ===
    async getHFToken() {
        const doc = await db.collection('settings').doc('huggingface').get();
        return doc.exists ? doc.data().token : null;
    }
};
