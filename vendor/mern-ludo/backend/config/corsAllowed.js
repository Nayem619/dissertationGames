/**
 * Allowed browser origins for CORS / Socket.IO (comma-separated env).
 * Default covers Expo WebView localhost + Android emulator forwarding.
 */
module.exports = function getAllowedCorsOrigins() {
    const fallback = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://10.0.2.2:3000',
    ].join(',');
    return (process.env.CORS_ORIGINS || fallback)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
};
