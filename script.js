// ==========================================
// ส่วนที่ 1: ระบบแจ้งเตือน (Toast Notification)
// ==========================================
function showToast() {
    const toast = document.getElementById("toast");
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}

// ==========================================
// ส่วนที่ 2: ระบบคัดลอกข้อความ
// ==========================================
function copyPrompt(elementId, buttonElement) {
    const textToCopy = document.getElementById(elementId).innerText;
    
    navigator.clipboard.writeText(textToCopy).then(function() {
        showToast();
        
        const icon = buttonElement.querySelector('.icon');
        const text = buttonElement.querySelector('.text');
        
        const originalIconHTML = icon.innerHTML;
        const originalText = text.innerText;
        
        buttonElement.classList.add('copied');
        icon.innerHTML = '<i class="fas fa-check"></i>'; 
        text.innerText = "คัดลอกแล้ว";
        
        setTimeout(function() {
            buttonElement.classList.remove('copied');
            icon.innerHTML = originalIconHTML;
            text.innerText = originalText;
        }, 2000);

    }).catch(function(error) {
        console.error("เกิดข้อผิดพลาดในการคัดลอก: ", error);
        alert("ขออภัย ไม่สามารถคัดลอกได้ครับ");
    });
}

// ==========================================
// ส่วนที่ 3: ระบบกรองหมวดหมู่ (Filter)
// ==========================================
function filterCategory(category, button) {
    const filterButtons = document.querySelectorAll('.btn-filter');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    const cards = document.querySelectorAll('.prompt-card');
    
    // 🔥 เปลี่ยนมาใช้ข้อมูลหัวใจจาก Cloud (currentFavorites)
    const favorites = typeof currentFavorites !== 'undefined' ? currentFavorites : [];

    cards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        const cardId = card.getAttribute('data-id');

        if (category === 'all') {
            card.style.display = 'block';
        } else if (category === 'favorites') {
            card.style.display = favorites.includes(cardId) ? 'block' : 'none';
        } else {
            card.style.display = cardCategory === category ? 'block' : 'none';
        }
    });

    document.getElementById('searchInput').value = '';
}

// ==========================================
// ส่วนที่ 4: ระบบฐานข้อมูล (Fetch Data JSON)
// ==========================================
async function loadPrompts() {
    try {
        const response = await fetch('database.json');
        const promptsData = await response.json();
        const container = document.getElementById('prompt-container');
        container.innerHTML = ''; 

        promptsData.forEach(item => {
            // 🔥 เช็คว่าโหลดหัวใจมาจาก Cloud หรือยัง
            const isFavorited = typeof currentFavorites !== 'undefined' && currentFavorites.includes(item.id);
            const heartIconClass = isFavorited ? 'fas fa-heart favorited' : 'far fa-heart';
            const activeClass = isFavorited ? 'active' : '';

            const imageHTML = item.imageUrl 
                ? `<img src="${item.imageUrl}" alt="${item.title}" class="prompt-image">` 
                : '';

            const cardHTML = `
                <div class="prompt-card" data-category="${item.categoryId}" data-id="${item.id}">
                    <button class="btn-favorite ${activeClass}" onclick="toggleFavorite('${item.id}', this)">
                        <i class="${heartIconClass}"></i>
                    </button>
                    
                    ${imageHTML}
                    
                    <span class="badge ${item.badgeColor}">${item.categoryName}</span>
                    <h3>${item.title}</h3>
                    
                    ${item.description ? `<p class="prompt-description">${item.description}</p>` : ''}
                    
                    <div class="prompt-box-container">
                        <p class="prompt-box" id="${item.id}-text">${item.content}</p>
                    </div>
                    
                    <button onclick="copyPrompt('${item.id}-text', this)" class="btn-copy">
                        <span class="icon"><i class="fas fa-paste"></i></span> <span class="text">คัดลอกคำสั่ง</span>
                    </button>
                </div>
            `;
            container.innerHTML += cardHTML;
        });

        // เช็คและอัปเดตสีหัวใจอีกครั้งหลังจากวาดการ์ดเสร็จ
        if (typeof updateAllHeartsUI === "function") {
            updateAllHeartsUI();
        }

    } catch (error) {
        console.error("เกิดข้อผิดพลาด:", error);
    }
}

// ==========================================
// ส่วนที่ 5: ระบบค้นหาข้อความ (Search Bar)
// ==========================================
function searchPrompts() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.prompt-card');
    
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        const content = card.querySelector('.prompt-box').innerText.toLowerCase();
        if (title.includes(searchQuery) || content.includes(searchQuery)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ==========================================
// ส่วนที่ 6: ระบบสลับโหมดมืด (Dark Mode)
// ==========================================
function initTheme() {
    const themeToggleBtn = document.getElementById('themeToggle');
    const body = document.body;
    
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
    }
    
    themeToggleBtn.innerHTML = body.classList.contains('dark-mode') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    
    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
}

// ==========================================
// ส่วนที่ 7: ระบบปุ่มเลื่อนกลับขึ้นบนสุด (Back to Top)
// ==========================================
function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
    
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// =========================================
// ส่วนที่ 8: ระบบสลับหน้า GEMS/Prompt (Navigation)
// =========================================
function initNavigation() {
    const homeLink = document.getElementById('homeLink');
    const gemsLink = document.getElementById('gemsLink');
    const promptContainer = document.getElementById('prompt-container');
    const gemsPage = document.getElementById('gems-page');

    if(homeLink && gemsLink && promptContainer && gemsPage) {
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            promptContainer.style.display = 'grid'; 
            gemsPage.style.display = 'none'; 
        });

        gemsLink.addEventListener('click', (e) => {
            e.preventDefault();
            if(!currentUser) {
                openLoginModal();
                return; 
            }
            promptContainer.style.display = 'none'; 
            gemsPage.style.display = 'block'; 
        });
    }
}

// ==========================================
// ส่วนที่ 9: ระบบกดหัวใจลง Cloud (Favorites) 🔥
// ==========================================
async function toggleFavorite(promptId, btnElement) {
    // บังคับล็อกอินก่อนกดหัวใจ
    if (!currentUser) {
        openLoginModal();
        return;
    }

    const userRef = db.collection('users').doc(currentUser.uid);
    const index = currentFavorites.indexOf(promptId);

    if (index === -1) {
        // ยังไม่มี -> เพิ่มเข้า Cloud
        currentFavorites.push(promptId);
        btnElement.classList.add('active');
        btnElement.innerHTML = '<i class="fas fa-heart favorited"></i>';
        
        await userRef.update({
            favorites: firebase.firestore.FieldValue.arrayUnion(promptId)
        });
    } else {
        // มีแล้ว -> เอาออกจาก Cloud
        currentFavorites.splice(index, 1);
        btnElement.classList.remove('active');
        btnElement.innerHTML = '<i class="far fa-heart"></i>';
        
        await userRef.update({
            favorites: firebase.firestore.FieldValue.arrayRemove(promptId)
        });
    }

    // ซ่อนการ์ดทันทีถ้ากดหัวใจออก ขณะอยู่ในหมวดหมู่รายการโปรด
    const activeFilter = document.querySelector('.btn-filter.active');
    if (activeFilter && activeFilter.innerText.includes("รายการโปรด")) {
        filterCategory('favorites', activeFilter);
    }
}

// ฟังก์ชันเสริม: อัปเดตสีหัวใจทุกดวงให้ตรงกับ Cloud
function updateAllHeartsUI() {
    const cards = document.querySelectorAll('.prompt-card');
    cards.forEach(card => {
        const promptId = card.getAttribute('data-id');
        const btn = card.querySelector('.btn-favorite');
        if(btn) {
            if(currentFavorites.includes(promptId)) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fas fa-heart favorited"></i>';
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="far fa-heart"></i>';
            }
        }
    });
}

// =========================================
// ส่วนที่ 10: ระบบ Backend ของจริง (Firebase Auth & Firestore)
// =========================================
const firebaseConfig = {
    apiKey: "AIzaSyCr89ya9M0R2Skk5gmOHir8qCLCB_-RYgo",
    authDomain: "promptchom-app.firebaseapp.com",
    projectId: "promptchom-app",
    storageBucket: "promptchom-app.firebasestorage.app",
    messagingSenderId: "377624904710",
    appId: "1:377624904710:web:c43b1ecebd908d3a05ef87"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null; 
let currentFavorites = []; // 🔥 ตัวแปรเก็บหัวใจของยูสเซอร์คนปัจจุบันบน Cloud

function initAuth() {
    auth.onAuthStateChanged(async (user) => {
        const loginBtn = document.getElementById('loginBtn');
        const userProfile = document.getElementById('userProfile');
        
        if (user) {
            currentUser = user;
            const userPhoto = user.photoURL || 'fas fa-user-circle';
            const userName = user.displayName || 'User';
            
            if(loginBtn) loginBtn.style.display = 'none';
            if(userProfile) {
                userProfile.style.display = 'inline-flex';
                userProfile.innerHTML = `<img src="${userPhoto}" alt="Profile" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid #9333EA; margin-right: 8px;"> <span id="displayUsername">${userName}</span> <a href="#" onclick="logoutUser(); return false;" class="btn-logout" title="ออกจากระบบ"><i class="fas fa-sign-out-alt"></i></a>`;
            }

            const userRef = db.collection('users').doc(user.uid);
            const doc = await userRef.get();
            
            if (!doc.exists) {
                // ผู้ใช้ใหม่: สร้างคลังเก็บหัวใจว่างๆ ไว้ให้
                await userRef.set({
                    name: userName,
                    email: user.email,
                    gems: 50,
                    favorites: [], 
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                updateGemDisplay(50);
                currentFavorites = [];
            } else {
                // ผู้ใช้เก่า: ดึงแต้มและดึงหัวใจจาก Cloud ลงมาที่เครื่อง
                updateGemDisplay(doc.data().gems);
                currentFavorites = doc.data().favorites || []; 
            }
            
            // สั่งระบายสีหัวใจตามข้อมูลที่ดึงมาจาก Cloud
            updateAllHeartsUI();
            
        } else {
            currentUser = null;
            currentFavorites = []; // เคลียร์หัวใจเมื่อล็อกเอาต์ออก
            
            if(loginBtn) loginBtn.style.display = 'inline-flex';
            if(userProfile) userProfile.style.display = 'none';
            updateGemDisplay(0);
            
            updateAllHeartsUI(); // เปลี่ยนหัวใจเป็นโปร่งใสทั้งหมด
        }
    });
}

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const confirmBtn = document.getElementById('btnConfirmLogin');
    
    confirmBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> กำลังเชื่อมต่อบัญชี...';
    
    auth.signInWithPopup(provider).then((result) => {
        closeLoginModal();
        confirmBtn.innerHTML = '<i class="fab fa-google"></i> ล็อกอินด้วย Google';
    }).catch((error) => {
        alert("การล็อกอินขัดข้อง: " + error.message);
        confirmBtn.innerHTML = '<i class="fab fa-google"></i> ล็อกอินด้วย Google';
    });
}

function openLoginModal() {
    document.getElementById('loginModal').classList.add('show');
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('show');
}

function logoutUser() {
    if(confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
        auth.signOut().then(() => {
            document.getElementById('homeLink').click(); 
        });
    }
}

function updateGemDisplay(gemsAmount) {
    const gemDisplay = document.getElementById('gemCountDisplay');
    if(gemDisplay) {
        gemDisplay.innerHTML = `<i class="fas fa-gem" style="color: #60A5FA; font-size: 1.2rem;"></i> Gem ของฉัน: ${gemsAmount}`;
    }
}

// =========================================
// สตาร์ทระบบทั้งหมดทันทีที่โหลดไฟล์
// =========================================
loadPrompts();
initTheme();
initBackToTop();
initAuth();
initNavigation();