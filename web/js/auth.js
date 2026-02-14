// ================================================
// User Auth — Eduvance LMS (Firestore-based)
// ================================================

const UserAuth = {
    // Simple hash for password (SHA-256)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Signup
    async signup(name, email, password) {
        email = email.toLowerCase().trim();
        // Check if email exists
        const existing = await db.collection('users').where('email', '==', email).get();
        if (!existing.empty) {
            return { success: false, message: 'This email is already registered' };
        }
        const hashedPw = await this.hashPassword(password);
        const docRef = await db.collection('users').add({
            name: name.trim(),
            email: email,
            password: hashedPw,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const user = { id: docRef.id, name: name.trim(), email };
        sessionStorage.setItem('eduvance_user', JSON.stringify(user));
        return { success: true, user };
    },

    // Login
    async login(email, password) {
        email = email.toLowerCase().trim();
        const hashedPw = await this.hashPassword(password);
        const snap = await db.collection('users').where('email', '==', email).get();
        if (snap.empty) {
            return { success: false, message: 'Email not found. Please sign up.' };
        }
        const doc = snap.docs[0];
        const data = doc.data();
        if (data.password !== hashedPw) {
            return { success: false, message: 'Incorrect password' };
        }
        const user = { id: doc.id, name: data.name, email: data.email };
        sessionStorage.setItem('eduvance_user', JSON.stringify(user));
        return { success: true, user };
    },

    // Get current user
    getUser() {
        const u = sessionStorage.getItem('eduvance_user');
        return u ? JSON.parse(u) : null;
    },

    // Check if logged in
    isLoggedIn() {
        return !!this.getUser();
    },

    // Logout
    logout() {
        sessionStorage.removeItem('eduvance_user');
        window.location.href = 'login.html';
    },

    // Require auth — redirect to login
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};
