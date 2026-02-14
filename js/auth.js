// ================================================
// Authentication — Eduvance LMS Admin
// ================================================
// Credentials stored in Firebase Firestore (admin_config collection)

const Auth = {
    TOKEN_KEY: 'eduvance_admin_token',
    ADMIN_KEY: 'eduvance_admin_info',

    // Check if user is logged in
    isLoggedIn() {
        return !!sessionStorage.getItem(this.TOKEN_KEY);
    },

    // Get stored admin info
    getAdmin() {
        const data = sessionStorage.getItem(this.ADMIN_KEY);
        return data ? JSON.parse(data) : null;
    },

    // Check if admin setup has been completed
    async isSetupDone() {
        try {
            const doc = await db.collection('admin_config').doc('credentials').get();
            return doc.exists;
        } catch (error) {
            console.error('Setup check error:', error);
            return false;
        }
    },

    // Create admin credentials (first-time setup)
    async setupAdmin(email, password) {
        try {
            await db.collection('admin_config').doc('credentials').set({
                email: email,
                password: password,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('Setup error:', error);
            return { success: false, message: 'Failed to save credentials. Check Firebase connection.' };
        }
    },

    // Login — checks credentials from Firebase
    async login(email, password) {
        try {
            const doc = await db.collection('admin_config').doc('credentials').get();

            if (!doc.exists) {
                return { success: false, message: 'Admin not configured. Please run setup first.' };
            }

            const creds = doc.data();

            if (email === creds.email && password === creds.password) {
                const token = btoa(`${email}:${Date.now()}:eduvance_admin`);
                sessionStorage.setItem(this.TOKEN_KEY, token);
                sessionStorage.setItem(this.ADMIN_KEY, JSON.stringify({ email: email }));
                return { success: true };
            } else {
                return { success: false, message: 'Invalid email or password' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Failed to connect to database. Check your internet connection.' };
        }
    },

    // Logout
    logout() {
        sessionStorage.removeItem(this.TOKEN_KEY);
        sessionStorage.removeItem(this.ADMIN_KEY);
        window.location.href = 'index.html';
    },

    // Route guard
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
};
