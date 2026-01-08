const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 8004;

// Konfigurasi Kunci & URL
const API_KEY = "uas-sukses-tst";

// URL Service Teman (Katalog Buku)
const CATALOG_SERVICE_URL = "https://darryl.tugastst.my.id/books";

// URL Service Saya (Review Buku)
const REVIEW_SERVICE_URL = "https://farhan.tugastst.my.id/reviews/book";

app.use(cors());
app.use(express.json());

// Endpoint Root (Cek Status)
app.get('/', (req, res) => {
    res.json({
        service: "PustakaWarga Integration Service",
        status: "Running",
        maintainer: "Muhammad Farhan"
    });
});

// Endpoint Utama: Ambil Data Buku + Review Gabungan
app.get('/pustakawarga/book/:id', async (req, res) => {
    const bookId = req.params.id;

    try {
        console.log(`[Integration] Fetching data for Book ID: ${bookId}...`);

        // call API parallel
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

        // Menggabungkan (Aggregating) Data
        const combinedData = {
            status: "success",
            meta: {
                timestamp: new Date().toISOString(),
                source: "PustakaWarga Aggregator"
            },
            data: {
                // Data katalog
                book_details: {
                    id: catalogRes.data.data.id,
                    title: catalogRes.data.data.title,
                    author: catalogRes.data.data.author,
                    synopsis: catalogRes.data.data.synopsis,
                    published_year: catalogRes.data.data.published_year
                },
                // Data review
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

        // timeout
        res.status(500).json({
            status: "error",
            message: "Terjadi kesalahan internal pada Server Integrasi.",
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Integration Service PustakaWarga berjalan di http://localhost:${PORT}`);
});