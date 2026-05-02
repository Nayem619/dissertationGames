const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

require('dotenv').config();
const { sessionMiddleware } = require('./config/session');

const PORT = process.env.PORT;
const getAllowedCorsOrigins = require('./config/corsAllowed');
const allowedOrigins = getAllowedCorsOrigins();

const app = express();

app.use(cookieParser());
app.use(
    express.urlencoded({
        extended: true,
    })
);
app.use(express.json());
app.set('trust proxy', 1);
app.use(
    cors({
        origin(origin, callback) {
            if (!origin) {
                callback(null, true);
                return;
            }
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    })
);
app.use(sessionMiddleware);

const uiRoot = path.join(__dirname, '..', 'build');
const hasProdUi = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(uiRoot, 'index.html'));

if (hasProdUi) {
    app.use(express.static(uiRoot));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/socket.io')) return next();
        res.sendFile(path.join(uiRoot, 'index.html'));
    });
}

require('./config/database')(mongoose);

const server = app.listen(PORT, () => {
    console.log(`mern-ludo listening :${PORT} prodUi=${hasProdUi}`);
});

require('./config/socket')(server);

module.exports = { server };
