const { sessionMiddleware } = require('../config/session');
const getAllowedCorsOrigins = require('../config/corsAllowed');

const socketManager = {
    io: null,
    initialize(server) {
        const allowedOrigins = getAllowedCorsOrigins();
        this.io = require('socket.io')(server, {
            cors: {
                origin: allowedOrigins,
                credentials: true,
            },
            allowRequest: (req, callback) => {
                const fakeRes = {
                    getHeader() {
                        return [];
                    },
                    setHeader(key, values) {
                        req.cookieHolder = values[0];
                    },
                    writeHead() {},
                };
                sessionMiddleware(req, fakeRes, () => {
                    if (req.session) {
                        fakeRes.writeHead();
                        req.session.save();
                    }
                    callback(null, true);
                });
            },
        });
    },
    getIO() {
        if (!this.io) {
            throw new Error('Socket.io not initialized');
        }
        return this.io;
    },
};

module.exports = socketManager;
