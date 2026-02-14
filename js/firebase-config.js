// ================================================
// Firebase Configuration — Eduvance LMS Admin
// ================================================

// Firebase config — these values are safe for client-side
// They are restricted by Firebase Security Rules
const firebaseConfig = {
    apiKey: "AIzaSyCnOKFxljT897IuSqwdat9cs8orSgQtqHs",
    authDomain: "diploma-result-app-1.firebaseapp.com",
    projectId: "diploma-result-app-1",
    storageBucket: "diploma-result-app-1.firebasestorage.app",
    messagingSenderId: "167287408836",
    appId: "1:167287408836:web:e0bfd634fa8c66a66be191",
    measurementId: "G-PLFFHMB76Y"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore reference
const db = firebase.firestore();

// ---- Firestore Helper Functions ----

const FirestoreDB = {
    // === COURSES ===
    async getAllCourses() {
        const snapshot = await db.collection('courses').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getCourse(courseId) {
        const doc = await db.collection('courses').doc(courseId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },

    async createCourse(data) {
        const docRef = await db.collection('courses').add({
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    },

    async updateCourse(courseId, data) {
        await db.collection('courses').doc(courseId).update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async deleteCourse(courseId) {
        // Delete all sections and their contents first
        const sections = await this.getAllSections(courseId);
        for (const section of sections) {
            await this.deleteSection(courseId, section.id);
        }
        await db.collection('courses').doc(courseId).delete();
    },

    // === SECTIONS ===
    async getAllSections(courseId) {
        const snapshot = await db.collection('courses').doc(courseId)
            .collection('sections').orderBy('order', 'asc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async createSection(courseId, data) {
        const docRef = await db.collection('courses').doc(courseId)
            .collection('sections').add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        return docRef.id;
    },

    async updateSection(courseId, sectionId, data) {
        await db.collection('courses').doc(courseId)
            .collection('sections').doc(sectionId).update(data);
    },

    async deleteSection(courseId, sectionId) {
        // Delete all contents in this section first
        const contents = await this.getAllContents(courseId, sectionId);
        for (const content of contents) {
            await this.deleteContent(courseId, sectionId, content.id);
        }
        await db.collection('courses').doc(courseId)
            .collection('sections').doc(sectionId).delete();
    },

    // === CONTENTS ===
    async getAllContents(courseId, sectionId) {
        const snapshot = await db.collection('courses').doc(courseId)
            .collection('sections').doc(sectionId)
            .collection('contents').orderBy('order', 'asc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async createContent(courseId, sectionId, data) {
        const docRef = await db.collection('courses').doc(courseId)
            .collection('sections').doc(sectionId)
            .collection('contents').add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        return docRef.id;
    },

    async updateContent(courseId, sectionId, contentId, data) {
        await db.collection('courses').doc(courseId)
            .collection('sections').doc(sectionId)
            .collection('contents').doc(contentId).update(data);
    },

    async deleteContent(courseId, sectionId, contentId) {
        await db.collection('courses').doc(courseId)
            .collection('sections').doc(sectionId)
            .collection('contents').doc(contentId).delete();
    },

    // === STATS ===
    async getStats() {
        const courses = await this.getAllCourses();
        let totalSections = 0;
        let totalVideos = 0;
        let totalPdfs = 0;

        for (const course of courses) {
            const sections = await this.getAllSections(course.id);
            totalSections += sections.length;

            for (const section of sections) {
                const contents = await this.getAllContents(course.id, section.id);
                contents.forEach(c => {
                    if (c.type === 'video') totalVideos++;
                    if (c.type === 'pdf') totalPdfs++;
                });
            }
        }

        return {
            totalCourses: courses.length,
            totalSections,
            totalVideos,
            totalPdfs
        };
    },

    // === CATEGORIES ===
    async getAllCategories() {
        const snapshot = await db.collection('categories').orderBy('order', 'asc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async createCategory(data) {
        const docRef = await db.collection('categories').add({
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    },

    async updateCategory(categoryId, data) {
        await db.collection('categories').doc(categoryId).update(data);
    },

    async deleteCategory(categoryId) {
        await db.collection('categories').doc(categoryId).delete();
    },

    // === STUDENTS ===
    async getAllStudents() {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getStudentCount() {
        const snapshot = await db.collection('users').get();
        return snapshot.size;
    },

    async getRecentStudents(limit = 10) {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').limit(limit).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async updateStudent(userId, data) {
        await db.collection('users').doc(userId).update(data);
    },

    async deleteStudent(userId) {
        // Delete student document
        await db.collection('users').doc(userId).delete();
        // Note: Enrollments and progress will remain for data integrity
        // You can add cascade delete if needed
    },

    // === ENROLLMENTS (Admin) ===
    async getAllEnrollments() {
        const snapshot = await db.collection('enrollments').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getEnrollmentCount() {
        const snapshot = await db.collection('enrollments').get();
        return snapshot.size;
    },

    async getEnrollmentsByCourse(courseId) {
        const snapshot = await db.collection('enrollments').where('courseId', '==', courseId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getPopularCourses(limit = 5) {
        const enrollments = await this.getAllEnrollments();
        const countMap = {};
        enrollments.forEach(e => {
            countMap[e.courseId] = (countMap[e.courseId] || 0) + 1;
        });
        const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, limit);
        const results = [];
        for (const [courseId, count] of sorted) {
            const course = await this.getCourse(courseId);
            if (course) results.push({ ...course, enrollmentCount: count });
        }
        return results;
    },

    // === ANNOUNCEMENTS ===
    async getAllAnnouncements() {
        const snapshot = await db.collection('announcements').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async createAnnouncement(data) {
        const docRef = await db.collection('announcements').add({
            ...data,
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    },

    async updateAnnouncement(annId, data) {
        await db.collection('announcements').doc(annId).update(data);
    },

    async deleteAnnouncement(annId) {
        await db.collection('announcements').doc(annId).delete();
    },

    async toggleAnnouncement(annId, active) {
        await db.collection('announcements').doc(annId).update({ active });
    },

    // === SETTINGS ===
    async getSettings(key) {
        const doc = await db.collection('settings').doc(key).get();
        return doc.exists ? doc.data() : null;
    },

    async saveSettings(key, data) {
        await db.collection('settings').doc(key).set({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
};

