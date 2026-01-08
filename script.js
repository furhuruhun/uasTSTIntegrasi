const API_KEY = "uas-sukses-tst";
const BASE_CATALOG_URL = "https://darryl.tugastst.my.id/books";
const BASE_REVIEW_URL = "https://farhan.tugastst.my.id/reviews/book";
const POST_REVIEW_URL = "http://localhost:8004/pustakawarga/review";
const AUTH_BASE_URL = "http://localhost:8004/auth";
const SHELF_BASE_URL = "http://localhost:8004/user/shelf";

let currentBookId = null;
let currentReviews = [];
let allBooks = [];
let currentBookshelfStatus = 'want-to-read';
let helpfulCounts = {};
let currentUser = null;
let authMode = 'login';

function initAuth() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            updateAuthUI();
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    } else {
        updateAuthUI();
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userInfo = document.getElementById('userInfo');
    const username = document.getElementById('username');
    const userAvatar = document.getElementById('userAvatar');

    if (currentUser) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        username.textContent = currentUser.username;
        userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        
        username.style.cursor = 'pointer';
        username.onclick = () => window.location.href = 'profile.html';
        username.title = 'Lihat Profil';
    } else {
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'block';
        userInfo.style.display = 'none';
    }
}

function showAuthModal(mode) {
    authMode = mode;
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authModalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const toggleText = document.getElementById('authToggleText');
    const toggleLink = document.getElementById('authToggleLink');
    const emailField = document.getElementById('emailField');
    
    modal.style.display = 'flex';
    document.getElementById('authForm').reset();
    document.getElementById('authError').style.display = 'none';
    document.getElementById('authSuccess').style.display = 'none';
    
    if (mode === 'login') {
        title.textContent = '🔐 Masuk';
        submitBtn.textContent = 'Masuk';
        toggleText.textContent = 'Belum punya akun?';
        toggleLink.textContent = 'Daftar';
        emailField.style.display = 'none';
    } else {
        title.textContent = '📝 Daftar Akun';
        submitBtn.textContent = 'Daftar';
        toggleText.textContent = 'Sudah punya akun?';
        toggleLink.textContent = 'Masuk';
        emailField.style.display = 'block';
    }
}

function closeAuthModal(event) {
    if (event && event.target.classList.contains('modal-container')) {
        return;
    }
    document.getElementById('authModal').style.display = 'none';
}

function toggleAuthMode(event) {
    event.preventDefault();
    showAuthModal(authMode === 'login' ? 'register' : 'login');
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    const email = document.getElementById('authEmail').value.trim();
    const errorDiv = document.getElementById('authError');
    const successDiv = document.getElementById('authSuccess');
    const submitBtn = document.getElementById('authSubmitBtn');
    
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    submitBtn.disabled = true;
    submitBtn.textContent = authMode === 'login' ? 'Memproses...' : 'Mendaftar...';
    
    const endpoint = authMode === 'login' ? '/login' : '/register';
    const payload = { username, password };
    if (authMode === 'register') {
        payload.email = email;
    }
    
    try {
        const response = await fetch(AUTH_BASE_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            localStorage.setItem('token', result.data.token);
            localStorage.setItem('user', JSON.stringify(result.data.user));
            currentUser = result.data.user;
            
            successDiv.textContent = result.message;
            successDiv.style.display = 'block';
            
            setTimeout(() => {
                closeAuthModal();
                updateAuthUI();
                if (currentBookId) {
                    loadBookDetails(currentBookId);
                }
            }, 1000);
        } else {
            errorDiv.textContent = result.message || 'Terjadi kesalahan';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = authMode === 'login' ? 'Masuk' : 'Daftar';
        }
    } catch (error) {
        console.error('Auth error:', error);
        errorDiv.textContent = 'Gagal terhubung ke server';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = authMode === 'login' ? 'Masuk' : 'Daftar';
    }
}

function logout() {
    if (confirm('Yakin ingin keluar?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        currentUser = null;
        updateAuthUI();
        if (currentBookId) {
            loadBookDetails(currentBookId);
        }
    }
}

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
                    ${currentUser ? `
                        <div style="padding: 12px; background: #e8f5e9; border: 1px solid #81c784; border-radius: 8px; margin-bottom: 20px; color: #2e7d32;">
                            <strong>Posting sebagai:</strong> ${currentUser.username}
                        </div>
                        <form id="reviewForm" onsubmit="submitReview(event)">
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
                    ` : `
                        <div style="padding: 30px; text-align: center; background: #fff3e0; border: 2px dashed #ffb74d; border-radius: 12px;">
                            <div style="font-size: 48px; margin-bottom: 15px;">🔒</div>
                            <h4 style="margin-bottom: 10px; color: #2D2D2D;">Login untuk Menulis Ulasan</h4>
                            <p style="color: #595959; margin-bottom: 20px;">Anda harus login terlebih dahulu untuk dapat memberikan ulasan pada buku ini.</p>
                            <button onclick="showAuthModal('login')" class="submit-btn" style="background: #377458;">Masuk Sekarang</button>
                        </div>
                    `}
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
    
    if (currentUser) {
        loadBookshelfStatus(book.id);
    }
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

async function updateBookshelfStatus(status) {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu untuk menyimpan status buku.');
        return;
    }

    if (!currentBookId) {
        console.error('No book ID');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Token tidak ditemukan. Silakan login ulang.');
        return;
    }

    currentBookshelfStatus = status;
    const statusNames = {
        'want-to-read': 'Want to Read',
        'currently-reading': 'Currently Reading',
        'read': 'Read'
    };

    try {
        const response = await fetch(SHELF_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                book_id: parseInt(currentBookId),
                status: status
            })
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            console.log(`Status buku diubah menjadi: ${statusNames[status]}`);
            
            const dropdown = document.getElementById('bookshelfStatus');
            if (dropdown) {
                dropdown.style.background = '#e8f5e9';
                dropdown.style.borderColor = '#4caf50';
                setTimeout(() => {
                    dropdown.style.background = '';
                    dropdown.style.borderColor = '';
                }, 1000);
            }
        } else {
            console.error('Failed to update shelf status:', result.message);
            alert('Gagal menyimpan status buku. ' + (result.message || ''));
        }
    } catch (error) {
        console.error('Error updating shelf status:', error);
        alert('Terjadi kesalahan saat menyimpan status buku.');
    }
}

async function loadBookshelfStatus(bookId) {
    if (!currentUser) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        return;
    }

    try {
        const response = await fetch(`${SHELF_BASE_URL}/${bookId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok && result.status === 'success' && result.data.status) {
            const dropdown = document.getElementById('bookshelfStatus');
            if (dropdown) {
                dropdown.value = result.data.status;
                currentBookshelfStatus = result.data.status;
            }
        }
    } catch (error) {
        console.error('Error loading shelf status:', error);
    }
}

async function submitReview(event) {
    event.preventDefault();

    if (!currentUser) {
        showMessage('error', 'Anda harus login terlebih dahulu.');
        return;
    }

    if (!currentBookId) {
        showMessage('error', 'Error: Tidak ada buku yang dipilih.');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('error', 'Token tidak ditemukan. Silakan login ulang.');
        return;
    }

    const submitBtn = event.target.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    const rating = parseFloat(document.querySelector('input[name="rating"]:checked').value);
    const comment = document.getElementById('reviewComment').value.trim();
    const tagsInput = document.getElementById('reviewTags').value.trim();
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const payload = {
        book_id: parseInt(currentBookId),
        rating: rating,
        comment: comment,
        contains_spoiler: false,
        tags: tags
    };

    try {
        const response = await fetch(POST_REVIEW_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
            if (response.status === 401 || response.status === 403) {
                showMessage('error', 'Sesi Anda telah berakhir. Silakan login ulang.');
                logout();
            } else {
                showMessage('error', `Gagal mengirim ulasan: ${result.message || 'Terjadi kesalahan'}`);
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim Ulasan';
        }
    } catch (error) {
        console.error("Error submitting review:", error);
        showMessage('error', 'Gagal mengirim ulasan. Pastikan server integrasi (localhost:8004) aktif.');
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
        closeAuthModal();
    }
});

initAuth();
loadBookList();