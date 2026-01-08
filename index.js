const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const authController = require('./authController');
const profileController = require('./profileController');

const app = express();
const PORT = 8004;

const API_KEY = "uas-sukses-tst";
const CATALOG_SERVICE_URL = "https://darryl.tugastst.my.id/books";
const REVIEW_SERVICE_URL = "https://farhan.tugastst.my.id/reviews/book";
const REVIEW_POST_URL = "https://farhan.tugastst.my.id/reviews";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.json({
        service: "PustakaWarga Integration Service",
        status: "Running",
        maintainer: "Muhammad Farhan",
        features: ["Authentication", "Book Aggregation", "Review Management"]
    });
});

app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);
app.get('/auth/profile', authController.verifyToken, authController.getProfile);

app.post('/user/shelf', authController.verifyToken, profileController.updateShelfStatus);
app.get('/user/shelf/:book_id', authController.verifyToken, profileController.getShelfStatus);
app.get('/user/profile', authController.verifyToken, profileController.getUserProfile);

app.get('/pustakawarga/book/:id', async (req, res) => {
    const bookId = req.params.id;

    try {
        console.log(`[Integration] Fetching data for Book ID: ${bookId}...`);

        const [catalogRes, reviewRes] = await Promise.all([
            axios.get(`${CATALOG_SERVICE_URL}/${bookId}`, {
                headers: { 'uas-api-key': API_KEY },
                timeout: 5000 
            }),
            axios.get(`${REVIEW_SERVICE_URL}/${bookId}`, {
                headers: { 'uas-api-key': API_KEY },
                timeout: 5000
            })
        ]);

        const combinedData = {
            status: "success",
            meta: {
                timestamp: new Date().toISOString(),
                source: "PustakaWarga Aggregator"
            },
            data: {
                book_details: {
                    id: catalogRes.data.data.id,
                    title: catalogRes.data.data.title,
                    author: catalogRes.data.data.author,
                    synopsis: catalogRes.data.data.synopsis,
                    published_year: catalogRes.data.data.published_year
                },
                social_proof: {
                    average_rating: reviewRes.data.average_rating,
                    total_reviews: reviewRes.data.reviews ? reviewRes.data.reviews.length : 0,
                    reviews: reviewRes.data.reviews
                }
            }
        };

        res.json(combinedData);

    } catch (error) {
        console.error("[Error] Integration Failed:", error.message);

        if (error.response) {
            const status = error.response.status;
            const serviceName = error.config.url.includes('darryl') ? 'Catalog Service' : 'Review Service';
            
            return res.status(status).json({
                status: "error",
                message: `Gagal mengambil data dari ${serviceName}.`,
                details: error.response.data
            });
        }

        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan internal pada Server Integrasi.",
            details: error.message
        });
    }
});

app.post('/pustakawarga/review', authController.verifyToken, async (req, res) => {
    try {
        const { book_id, rating, comment, contains_spoiler, tags } = req.body;

        if (!book_id || !rating || !comment) {
            return res.status(400).json({
                status: 'error',
                message: 'book_id, rating, dan comment wajib diisi'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                status: 'error',
                message: 'Rating harus antara 1 - 5'
            });
        }

        const reviewData = {
            book_id: parseInt(book_id),
            reviewer: req.user.username,
            rating: parseFloat(rating),
            comment: comment,
            contains_spoiler: contains_spoiler || false,
            tags: tags || []
        };

        console.log(`[Integration] Posting review as ${req.user.username} for book ${book_id}`);

        const response = await axios.post(REVIEW_POST_URL, reviewData, {
            headers: { 
                'uas-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });

        res.status(201).json({
            status: 'success',
            message: 'Review berhasil ditambahkan',
            data: response.data.data
        });

    } catch (error) {
        console.error('[Error] Post review failed:', error.message);

        if (error.response) {
            return res.status(error.response.status).json({
                status: 'error',
                message: 'Gagal mengirim review ke Review Service',
                details: error.response.data
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat mengirim review',
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Integration Service PustakaWarga berjalan di http://localhost:${PORT}`);
    console.log(`[Auth] Authentication endpoints aktif`);
    console.log(`[Profile] User profile & bookshelf endpoints aktif`);
    console.log(`[Integration] Book aggregation endpoints aktif`);
    console.log(`[Integration] Protected review posting endpoint aktif`);
});
