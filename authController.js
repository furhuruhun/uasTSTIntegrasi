const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'pustakawarga-secret-key-2026-tst';
const JWT_EXPIRES_IN = '24h';
const USERS_FILE = path.join(__dirname, 'users.json');

function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('[Auth] Error loading users:', error.message);
    }
    return [];
}

function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error('[Auth] Error saving users:', error.message);
    }
}

async function register(req, res) {
    try {
        const { username, password, email } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Username dan password wajib diisi'
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                status: 'error',
                message: 'Username minimal 3 karakter'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                status: 'error',
                message: 'Password minimal 6 karakter'
            });
        }

        const users = loadUsers();

        const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'Username sudah terdaftar'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: Date.now(),
            username: username,
            email: email || '',
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);

        const token = jwt.sign(
            { 
                id: newUser.id, 
                username: newUser.username 
            }, 
            JWT_SECRET, 
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log(`[Auth] User registered: ${username}`);

        res.status(201).json({
            status: 'success',
            message: 'Registrasi berhasil',
            data: {
                token,
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    createdAt: newUser.createdAt
                }
            }
        });

    } catch (error) {
        console.error('[Auth] Registration error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat registrasi',
            details: error.message
        });
    }
}

async function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Username dan password wajib diisi'
            });
        }

        const users = loadUsers();

        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Username atau password salah'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'Username atau password salah'
            });
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username 
            }, 
            JWT_SECRET, 
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log(`[Auth] User logged in: ${username}`);

        res.json({
            status: 'success',
            message: 'Login berhasil',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    createdAt: user.createdAt
                }
            }
        });

    } catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat login',
            details: error.message
        });
    }
}

function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Token tidak ditemukan. Silakan login terlebih dahulu'
            });
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Token tidak valid atau expired'
                });
            }

            req.user = decoded;
            next();
        });

    } catch (error) {
        console.error('[Auth] Token verification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat verifikasi token'
        });
    }
}

function getProfile(req, res) {
    try {
        const users = loadUsers();
        const user = users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User tidak ditemukan'
            });
        }

        res.json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    createdAt: user.createdAt
                }
            }
        });

    } catch (error) {
        console.error('[Auth] Get profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat mengambil profil'
        });
    }
}

module.exports = {
    register,
    login,
    verifyToken,
    getProfile
};

