// ================================================
// Authentication — Eduvance LMS Admin
// ================================================

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

    // Login via API
    async login(email, password) {
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                sessionStorage.setItem(this.TOKEN_KEY, data.token);
                sessionStorage.setItem(this.ADMIN_KEY, JSON.stringify(data.admin));
                return { success: true };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Server connection failed. Make sure the app is deployed on Vercel.' };
        }
    },

    // Logout
    logout() {
        sessionStorage.removeItem(this.TOKEN_KEY);
        sessionStorage.removeItem(this.ADMIN_KEY);
        window.location.href = 'index.html';
    },

    // Route guard — redirect to login if not authenticated
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
};
