// ================================================
// Authentication — Eduvance LMS Admin
// ================================================
// Client-side auth — credentials are set here directly.
// For a single-admin panel, this is secure enough.
// Change the email and password below to your own.

const ADMIN_CREDENTIALS = {
    email: "sadid.lm10@gmail.com",
    password: "sadid1218"
};

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

    // Login — checks credentials locally
    async login(email, password) {
        try {
            // Small delay to simulate server call (feels more natural)
            await new Promise(resolve => setTimeout(resolve, 500));

            if (!email || !password) {
                return { success: false, message: 'Email and password are required' };
            }

            if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
                // Generate session token
                const token = btoa(`${email}:${Date.now()}:eduvance_admin`);
                sessionStorage.setItem(this.TOKEN_KEY, token);
                sessionStorage.setItem(this.ADMIN_KEY, JSON.stringify({ email: email }));
                return { success: true };
            } else {
                return { success: false, message: 'Invalid email or password' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Authentication failed. Please try again.' };
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
