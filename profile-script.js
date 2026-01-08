const AUTH_BASE_URL = "http://localhost:8004/auth";
const PROFILE_BASE_URL = "http://localhost:8004/user";

let currentUser = null;
let authMode = 'login';

function initAuth() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
        try {
            currentUser = JSON.parse(userData);
            updateAuthUI();
            loadProfile();
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            showErrorState();
        }
    } else {
        showErrorState();
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
    } else {
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'block';
        userInfo.style.display = 'none';
    }
}

async function loadProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showErrorState();
            return;
        }

        const response = await fetch(PROFILE_BASE_URL + '/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load profile');
        }

        const result = await response.json();
        
        if (result.status === 'success') {
            displayProfile(result.data);
        } else {
            showErrorState();
        }

    } catch (error) {
        console.error('Error loading profile:', error);
        showErrorState();
    }
}

function displayProfile(profileData) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('profileContent').style.display = 'block';
    
    document.getElementById('profileAvatar').src = profileData.avatar_url;
    document.getElementById('profileUsername').textContent = profileData.username;
    
    const joinDate = new Date(profileData.join_date);
    document.getElementById('joinDate').textContent = joinDate.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('statTotalRead').textContent = profileData.stats.total_read;
    document.getElementById('statTotalReviews').textContent = profileData.stats.total_reviews;
    document.getElementById('statCurrentlyReading').textContent = profileData.stats.currently_reading;
    
    displayReadBooks(profileData.read_books);
}

function displayReadBooks(books) {
    const container = document.getElementById('readBooksContainer');
    
    if (!books || books.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📖</div>
                <h3>Belum ada buku yang selesai dibaca</h3>
                <p>Mulai baca dan tandai buku sebagai "Read" untuk melihatnya di sini.</p>
                <a href="index.html" class="btn-primary">Jelajahi Buku</a>
            </div>
        `;
        return;
    }
    
    const booksHTML = books.map(book => `
        <div class="book-card" onclick="window.location.href='index.html?book=${book.id}'">
            <div class="book-cover">
                📚
            </div>
            <div class="book-info">
                <div class="book-title">${book.title}</div>
                <div class="book-author">${book.author}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `<div class="books-grid">${booksHTML}</div>`;
}

function showErrorState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('profileContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
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
    const submitBtn = document.getElementById('authSubmitBtn');
    
    errorDiv.style.display = 'none';
    
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
            
            closeAuthModal();
            updateAuthUI();
            window.location.reload();
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
        window.location.href = 'index.html';
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAuthModal();
    }
});

initAuth();


