// ================================================
// Firebase Configuration — Eduvance LMS Admin
// ================================================

// Firebase config — these values are safe for client-side
// They are restricted by Firebase Security Rules
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
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
    }
};
