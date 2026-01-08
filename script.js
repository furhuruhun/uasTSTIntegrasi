const API_KEY = "uas-sukses-tst";
const BASE_CATALOG_URL = "https://darryl.tugastst.my.id/books";
const BASE_REVIEW_URL = "https://farhan.tugastst.my.id/reviews/book";
const POST_REVIEW_URL = "https://farhan.tugastst.my.id/reviews";

let currentBookId = null;
let currentReviews = [];
let allBooks = [];
let currentBookshelfStatus = 'want-to-read';
let helpfulCounts = {};

async function loadBookList() {
    try {
        const response = await fetch(BASE_CATALOG_URL, {
            headers: { 'uas-api-key': API_KEY }
        });
        const result = await response.json();

        if (result.status === "success") {
            allBooks = result.data;
            const select = document.getElementById('bookSelect');
            select.innerHTML = '<option value="">-- Pilih Buku --</option>';

            result.data.forEach(book => {
                const option = document.createElement('option');
                option.value = book.id;
                option.textContent = book.title;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Gagal memuat buku:", error);
        document.getElementById('bookSelect').innerHTML = '<option value="">Gagal memuat data</option>';
    }
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let starsHTML = '';
    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<span class="star-filled">★</span>';
    }
    if (hasHalfStar) {
        starsHTML += '<span class="star-filled">★</span>';
    }
    for (let i = 0; i < emptyStars; i++) {
        starsHTML += '<span class="star-empty">★</span>';
    }
    return starsHTML;
}

function calculateRatingDistribution(reviews) {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const total = reviews.length;

    reviews.forEach(review => {
        const rating = Math.round(review.rating);
        if (distribution[rating] !== undefined) {
            distribution[rating]++;
        }
    });

    const percentages = {};
    for (let i = 1; i <= 5; i++) {
        percentages[i] = total > 0 ? Math.round((distribution[i] / total) * 100) : 0;
    }

    return { counts: distribution, percentages };
}

function enhanceReviews(reviews) {
    return reviews.map((review, index) => {
        if (!helpfulCounts[index]) {
            helpfulCounts[index] = {
                count: Math.floor(Math.random() * 50),
                clicked: false
            };
        }

        const isVerified = Math.random() > 0.7 || 
                          ['Ahmad', 'Budi', 'Sarah', 'John'].some(name => 
                            review.reviewer.toLowerCase().includes(name.toLowerCase()));

        const timestamp = Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000);

        return {
            ...review,
            isVerified,
            timestamp,
            helpfulCount: helpfulCounts[index].count,
            originalIndex: index
        };
    });
}

function formatReviewText(text) {
    return text.replace(/"([^"]+)"/g, '<div class="quote-text">"$1"</div>');
}

function sortReviews(reviews, sortBy) {
    const sorted = [...reviews];
    
    switch(sortBy) {
        case 'newest':
            return sorted.sort((a, b) => b.timestamp - a.timestamp);
        case 'highest':
            return sorted.sort((a, b) => b.rating - a.rating);
        case 'lowest':
            return sorted.sort((a, b) => a.rating - b.rating);
        case 'helpful':
            return sorted.sort((a, b) => b.helpfulCount - a.helpfulCount);
        default:
            return sorted;
    }
}

function toggleHelpful(reviewIndex) {
    const helpfulData = helpfulCounts[reviewIndex];
    if (!helpfulData.clicked) {
        helpfulData.count++;
        helpfulData.clicked = true;
        
        const btn = document.querySelector(`[data-review-index="${reviewIndex}"]`);
        if (btn) {
            btn.classList.add('active');
            btn.querySelector('.helpful-count').textContent = helpfulData.count;
        }
    }
}

function toggleSpoiler(reviewIndex) {
    const commentDiv = document.getElementById(`review-comment-${reviewIndex}`);
    const overlayDiv = document.getElementById(`spoiler-overlay-${reviewIndex}`);
    
    if (commentDiv && overlayDiv) {
        commentDiv.classList.remove('hidden');
        overlayDiv.style.display = 'none';
    }
}

function getRelatedBooks(currentBookId) {
    return allBooks
        .filter(book => book.id !== currentBookId)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
}

async function loadBookDetails(bookId) {
    if (!bookId) {
        document.getElementById('content').innerHTML = `
            <div class="empty-state">
                <p>Silakan pilih buku dari menu di atas untuk melihat detail dan ulasan.</p>
            </div>
        `;
        currentBookId = null;
        return;
    }

    currentBookId = bookId;
    currentBookshelfStatus = 'want-to-read';
    document.getElementById('content').innerHTML = '<div class="loading">⏳ Memuat data buku dan ulasan...</div>';

    try {
        const resBook = await fetch(`${BASE_CATALOG_URL}/${bookId}`, {
            headers: { 'uas-api-key': API_KEY }
        });
        const bookData = await resBook.json();

        const resReview = await fetch(`${BASE_REVIEW_URL}/${bookId}`, {
            headers: { 'uas-api-key': API_KEY }
        });
        const reviewData = await resReview.json();

        if (bookData.status === "success") {
            renderBookDetails(bookData.data, reviewData);
        }
    } catch (error) {
        console.error("Error loading book:", error);
        document.getElementById('content').innerHTML = `
            <div class="message message-error">
                Gagal memuat data. Pastikan server backend dan tunnel sedang aktif.
            </div>
        `;
    }
}

function renderBookDetails(book, reviewData) {
    const avgRating = reviewData.average_rating || 0;
    let reviews = reviewData.reviews || [];
    
    reviews = enhanceReviews(reviews);
    currentReviews = reviews;

    const ratingDist = calculateRatingDistribution(reviews);
    const relatedBooks = getRelatedBooks(book.id);

    const html = `
        <div class="book-detail-container">
            <div class="book-info-section">
                <div class="book-cover-placeholder">
                    <svg fill="#8b7355" viewBox="0 0 24 24">
                        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                    </svg>
                </div>
                <h1 class="book-title">${book.title}</h1>
                <div class="book-author">oleh ${book.author}</div>
                
                <div class="bookshelf-section">
                    <select class="bookshelf-dropdown" id="bookshelfStatus" onchange="updateBookshelfStatus(this.value)">
                        <option value="want-to-read">📚 Want to Read</option>
                        <option value="currently-reading">📖 Currently Reading</option>
                        <option value="read">✅ Read</option>
                    </select>
                </div>

                <div class="book-meta">
                    <div class="book-meta-item">
                        <span class="book-meta-label">Tahun Terbit</span>
                        <span class="book-meta-value">${book.published_year}</span>
                    </div>
                    <div class="book-meta-item">
                        <span class="book-meta-label">Stok Tersedia</span>
                        <span class="book-meta-value">${book.stock} eksemplar</span>
                    </div>
                </div>

                <div class="book-synopsis">
                    <h3>Sinopsis</h3>
                    <p>${book.synopsis}</p>
                </div>
            </div>

            <div class="reviews-section">
                <div class="review-stats">
                    <h2>Rating & Ulasan</h2>
                    <div class="rating-overview">
                        <div class="average-rating-box">
                            <div class="rating-number">${avgRating.toFixed(1)}</div>
                            <div class="rating-stars">${generateStars(avgRating)}</div>
                            <div class="total-reviews">${reviews.length} ulasan</div>
                        </div>
                        <div class="rating-breakdown">
                            ${[5, 4, 3, 2, 1].map(star => `
                                <div class="rating-bar-row">
                                    <div class="rating-label">
                                        ${star} <span class="star-filled">★</span>
                                    </div>
                                    <div class="rating-bar-container">
                                        <div class="rating-bar-fill" style="width: ${ratingDist.percentages[star]}%">
                                            ${ratingDist.percentages[star] > 15 ? ratingDist.percentages[star] + '%' : ''}
                                        </div>
                                    </div>
                                    <div class="rating-count">(${ratingDist.counts[star]})</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="review-controls">
                    <h3>Ulasan Pembaca</h3>
                    <div>
                        <label for="sortReviews" style="margin-right: 0.5rem; font-weight: 600;">Urutkan:</label>
                        <select id="sortReviews" class="sort-dropdown" onchange="applySort(this.value)">
                            <option value="newest">Terbaru</option>
                            <option value="highest">Rating Tertinggi</option>
                            <option value="lowest">Rating Terendah</option>
                            <option value="helpful">Paling Membantu</option>
                        </select>
                    </div>
                </div>

                <div class="write-review-section">
                    <h3>✍️ Tulis Ulasan Anda</h3>
                    <div id="reviewMessage"></div>
                    <form id="reviewForm" onsubmit="submitReview(event)">
                        <div class="form-group">
                            <label for="reviewerName">Nama Anda *</label>
                            <input type="text" id="reviewerName" required placeholder="Masukkan nama Anda">
                        </div>

                        <div class="form-group">
                            <label>Rating *</label>
                            <div class="star-rating-input">
                                <input type="radio" id="star5" name="rating" value="5" required>
                                <label for="star5">★</label>
                                <input type="radio" id="star4" name="rating" value="4">
                                <label for="star4">★</label>
                                <input type="radio" id="star3" name="rating" value="3">
                                <label for="star3">★</label>
                                <input type="radio" id="star2" name="rating" value="2">
                                <label for="star2">★</label>
                                <input type="radio" id="star1" name="rating" value="1">
                                <label for="star1">★</label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="reviewComment">Komentar *</label>
                            <textarea id="reviewComment" required placeholder="Bagikan pendapat Anda tentang buku ini..."></textarea>
                        </div>

                        <div class="form-group">
                            <label for="reviewTags">Tags (opsional)</label>
                            <input type="text" id="reviewTags" placeholder="Pisahkan dengan koma, contoh: menarik, inspiratif">
                            <small style="color: #999;">Tips: Gunakan koma untuk memisahkan tags</small>
                        </div>

                        <button type="submit" class="submit-btn">Kirim Ulasan</button>
                    </form>
                </div>

                <div class="reviews-list">
                    <div id="reviewsList">
                        ${renderReviews(reviews)}
                    </div>
                </div>
            </div>

            <div class="sidebar-section">
                <div class="related-books-widget">
                    <h3>📖 Buku Serupa</h3>
                    ${relatedBooks.map(relBook => `
                        <div class="related-book-item" onclick="loadBookDetails(${relBook.id})">
                            <div class="related-book-cover">
                                <svg fill="#8b7355" viewBox="0 0 24 24">
                                    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                                </svg>
                            </div>
                            <div class="related-book-info">
                                <div class="related-book-title">${relBook.title}</div>
                                <div class="related-book-author">${relBook.author}</div>
                                <div class="related-book-rating">
                                    ${generateStars(4 + Math.random())}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
    document.getElementById('bookSelect').value = book.id;
}

function renderReviews(reviews) {
    if (reviews.length === 0) {
        return '<div class="no-reviews">Belum ada ulasan untuk buku ini. Jadilah yang pertama memberikan ulasan!</div>';
    }

    return reviews.map((review, displayIndex) => {
        const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(review.reviewer)}`;
        const hasSpoiler = review.contains_spoiler || false;

        return `
            <div class="review-card">
                <div class="review-header">
                    <img src="${avatarUrl}" alt="${review.reviewer}" class="reviewer-avatar">
                    <div class="reviewer-info">
                        <div class="reviewer-name-row">
                            <span class="reviewer-name">${review.reviewer}</span>
                            ${review.isVerified ? '<span class="verified-badge">✓ Verified Reader</span>' : ''}
                        </div>
                        <div class="review-rating">${generateStars(review.rating)}</div>
                    </div>
                </div>

                ${hasSpoiler ? `
                    <div id="spoiler-overlay-${displayIndex}" class="spoiler-overlay">
                        <div class="spoiler-warning">⚠️ Peringatan: Review ini mengandung spoiler</div>
                        <button class="show-spoiler-btn" onclick="toggleSpoiler(${displayIndex})">
                            Klik untuk Melihat Review
                        </button>
                    </div>
                    <div id="review-comment-${displayIndex}" class="review-comment hidden">
                        ${formatReviewText(review.comment)}
                    </div>
                ` : `
                    <div class="review-comment">
                        ${formatReviewText(review.comment)}
                    </div>
                `}

                <div class="review-footer">
                    <div class="review-tags">
                        ${review.tags && review.tags.length > 0 ? 
                            review.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : 
                            '<span style="color: #999; font-size: 0.9rem;">Tidak ada tags</span>'
                        }
                    </div>
                    <button class="helpful-btn" 
                            data-review-index="${review.originalIndex}" 
                            onclick="toggleHelpful(${review.originalIndex})"
                            ${helpfulCounts[review.originalIndex]?.clicked ? 'class="helpful-btn active"' : ''}>
                        <span>👍</span>
                        <span>Membantu (<span class="helpful-count">${review.helpfulCount}</span>)</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function applySort(sortBy) {
    const sorted = sortReviews(currentReviews, sortBy);
    document.getElementById('reviewsList').innerHTML = renderReviews(sorted);
}

function updateBookshelfStatus(status) {
    currentBookshelfStatus = status;
    const statusNames = {
        'want-to-read': 'Want to Read',
        'currently-reading': 'Currently Reading',
        'read': 'Read'
    };
    console.log(`Status buku diubah menjadi: ${statusNames[status]}`);
}

async function submitReview(event) {
    event.preventDefault();

    if (!currentBookId) {
        showMessage('error', 'Error: Tidak ada buku yang dipilih.');
        return;
    }

    const submitBtn = event.target.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    const reviewer = document.getElementById('reviewerName').value.trim();
    const rating = parseFloat(document.querySelector('input[name="rating"]:checked').value);
    const comment = document.getElementById('reviewComment').value.trim();
    const tagsInput = document.getElementById('reviewTags').value.trim();
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const payload = {
        book_id: parseInt(currentBookId),
        reviewer: reviewer,
        rating: rating,
        comment: comment,
        contains_spoiler: false
    };

    try {
        const response = await fetch(POST_REVIEW_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'uas-api-key': API_KEY
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.status === "success") {
            showMessage('success', '✅ Ulasan berhasil dikirim! Terima kasih atas kontribusi Anda.');
            document.getElementById('reviewForm').reset();
            setTimeout(() => {
                loadBookDetails(currentBookId);
            }, 1500);
        } else {
            showMessage('error', `Gagal mengirim ulasan: ${result.message || 'Terjadi kesalahan'}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim Ulasan';
        }
    } catch (error) {
        console.error("Error submitting review:", error);
        showMessage('error', 'Gagal mengirim ulasan. Pastikan koneksi internet dan server aktif.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Ulasan';
    }
}

function showMessage(type, text) {
    const messageDiv = document.getElementById('reviewMessage');
    messageDiv.innerHTML = `<div class="message message-${type}">${text}</div>`;
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}

function closeModal(event) {
    if (event && event.target.classList.contains('modal-container')) {
        return;
    }
    document.getElementById('reviewModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

loadBookList();