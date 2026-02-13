// Vercel Serverless Function — Admin Authentication
// Validates credentials against environment variables

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('ADMIN_EMAIL or ADMIN_PASSWORD not set in environment variables');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    if (email === adminEmail && password === adminPassword) {
      // Generate a simple session token
      const token = Buffer.from(`${email}:${Date.now()}:eduvance_admin_secret`).toString('base64');
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: token,
        admin: { email: email }
      });
    } else {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
