const fs = require('fs');
const path = require('path');
const axios = require('axios');

const USER_DATA_FILE = path.join(__dirname, 'user_data.json');
const API_KEY = "uas-sukses-tst";
const CATALOG_SERVICE_URL = "https://darryl.tugastst.my.id/books";
const REVIEW_SERVICE_URL = "https://farhan.tugastst.my.id/reviews";

function loadUserData() {
    try {
        if (fs.existsSync(USER_DATA_FILE)) {
            const data = fs.readFileSync(USER_DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('[Profile] Error loading user data:', error.message);
    }
    return {};
}

function saveUserData(data) {
    try {
        fs.writeFileSync(USER_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('[Profile] Error saving user data:', error.message);
    }
}

function getUserShelf(username) {
    const userData = loadUserData();
    if (!userData[username]) {
        userData[username] = {
            shelf: [],
            created_at: new Date().toISOString()
        };
    }
    return userData[username].shelf || [];
}

function updateUserShelf(username, bookId, status) {
    const userData = loadUserData();
    
    if (!userData[username]) {
        userData[username] = {
            shelf: [],
            created_at: new Date().toISOString()
        };
    }
    
    const shelf = userData[username].shelf;
    const existingIndex = shelf.findIndex(item => item.book_id === bookId);
    
    if (existingIndex >= 0) {
        shelf[existingIndex].status = status;
        shelf[existingIndex].updated_at = new Date().toISOString();
    } else {
        shelf.push({
            book_id: bookId,
            status: status,
            added_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }
    
    userData[username].shelf = shelf;
    saveUserData(userData);
    
    return shelf;
}

async function updateShelfStatus(req, res) {
    try {
        const { book_id, status } = req.body;
        const username = req.user.username;

        if (!book_id || !status) {
            return res.status(400).json({
                status: 'error',
                message: 'book_id dan status wajib diisi'
            });
        }

        const validStatuses = ['read', 'want-to-read', 'currently-reading'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Status harus: read, want-to-read, atau currently-reading'
            });
        }

        const shelf = updateUserShelf(username, parseInt(book_id), status);

        console.log(`[Profile] ${username} updated book ${book_id} to status: ${status}`);

        res.json({
            status: 'success',
            message: 'Status buku berhasil diupdate',
            data: {
                book_id: parseInt(book_id),
                status: status
            }
        });

    } catch (error) {
        console.error('[Profile] Update shelf error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat mengupdate shelf',
            details: error.message
        });
    }
}

async function getShelfStatus(req, res) {
    try {
        const { book_id } = req.params;
        const username = req.user.username;

        const shelf = getUserShelf(username);
        const bookStatus = shelf.find(item => item.book_id === parseInt(book_id));

        res.json({
            status: 'success',
            data: {
                book_id: parseInt(book_id),
                status: bookStatus ? bookStatus.status : null
            }
        });

    } catch (error) {
        console.error('[Profile] Get shelf status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat mengambil status buku'
        });
    }
}

async function getUserProfile(req, res) {
    try {
        const username = req.user.username;
        
        const usersFile = path.join(__dirname, 'users.json');
        let userData = { join_date: new Date().toISOString() };
        
        try {
            if (fs.existsSync(usersFile)) {
                const usersData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
                const user = usersData.find(u => u.username === username);
                if (user) {
                    userData.join_date = user.createdAt;
                }
            }
        } catch (err) {
            console.error('[Profile] Error reading users file:', err);
        }

        const shelf = getUserShelf(username);
        
        const readBooks = shelf.filter(item => item.status === 'read');
        const currentlyReading = shelf.filter(item => item.status === 'currently-reading');
        const wantToRead = shelf.filter(item => item.status === 'want-to-read');

        let bookDetails = [];
        if (readBooks.length > 0) {
            const bookPromises = readBooks.map(async (item) => {
                try {
                    const response = await axios.get(`${CATALOG_SERVICE_URL}/${item.book_id}`, {
                        headers: { 'uas-api-key': API_KEY },
                        timeout: 5000
                    });
                    
                    if (response.data && response.data.data) {
                        return {
                            ...response.data.data,
                            shelf_status: item.status,
                            added_at: item.added_at
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`[Profile] Error fetching book ${item.book_id}:`, error.message);
                    return null;
                }
            });

            const results = await Promise.all(bookPromises);
            bookDetails = results.filter(book => book !== null);
        }

        let totalReviews = 0;
        try {
            const reviewsResponse = await axios.get(REVIEW_SERVICE_URL, {
                headers: { 'uas-api-key': API_KEY },
                timeout: 5000
            });
            
            if (reviewsResponse.data && reviewsResponse.data.data) {
                totalReviews = reviewsResponse.data.data.filter(
                    review => review.reviewer.toLowerCase() === username.toLowerCase()
                ).length;
            }
        } catch (error) {
            console.error('[Profile] Error fetching reviews:', error.message);
        }

        const profileData = {
            username: username,
            join_date: userData.join_date,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            stats: {
                total_read: readBooks.length,
                total_reviews: totalReviews,
                currently_reading: currentlyReading.length,
                want_to_read: wantToRead.length
            },
            read_books: bookDetails
        };

        console.log(`[Profile] Profile data fetched for ${username}`);

        res.json({
            status: 'success',
            data: profileData
        });

    } catch (error) {
        console.error('[Profile] Get profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat mengambil profil',
            details: error.message
        });
    }
}

module.exports = {
    updateShelfStatus,
    getShelfStatus,
    getUserProfile
};


