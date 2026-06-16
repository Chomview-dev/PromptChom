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
// ส่วนที่ 2: ระบบคัดลอกข้อความ + เปลี่ยนไอคอนปุ่ม (✅ อัปเดตไอคอน FontAwesome)
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
        icon.innerHTML = '<i class="fas fa-check"></i>'; // ไอคอนติ๊กถูก
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
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

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
// ส่วนที่ 4: ระบบฐานข้อมูล (Fetch Data JSON) (✅ อัปเดตไอคอนหัวใจและคัดลอก)
// ==========================================
async function loadPrompts() {
    try {
        const response = await fetch('database.json');
        const promptsData = await response.json();
        const container = document.getElementById('prompt-container');
        container.innerHTML = ''; 

        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

        promptsData.forEach(item => {
            const isFavorited = favorites.includes(item.id);
            // เลือกไอคอนหัวใจ (ทึบ หรือ โปร่ง)
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
// ส่วนที่ 6: ระบบสลับโหมดมืด (Dark Mode) (✅ อัปเดตไอคอนพระอาทิตย์/พระจันทร์)
// ==========================================
function initTheme() {
    const themeToggleBtn = document.getElementById('themeToggle');
    const body = document.body;
    
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
    }
    
    // ตั้งค่าไอคอนเริ่มต้น
    themeToggleBtn.innerHTML = body.classList.contains('dark-mode') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    
    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        // สลับไอคอนเมื่อกดคลิก
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
gemsLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 🔥 ตรวจสอบการล็อกอินก่อนเข้าหน้า Gem
            const username = localStorage.getItem('promptchom_user');
            if(!username) {
                openLoginModal(); // ถ้ายังไม่ล็อกอิน ให้เปิดหน้าต่างล็อกอิน
                return; // สั่งหยุด ไม่ให้เปิดหน้า Gem
            }
            
            // ถ้าล็อกอินแล้ว ให้เปิดหน้า Gem ได้
            promptContainer.style.display = 'none'; 
            gemsPage.style.display = 'block'; 
            updateGemDisplay(); // อัปเดตตัวเลข Gem ให้เป็นปัจจุบัน
        });

// ==========================================
// ส่วนที่ 9: ระบบกดหัวใจรายการโปรด (Favorites) (✅ อัปเดตไอคอนหัวใจตอนกดสลับ)
// ==========================================
function toggleFavorite(promptId, btnElement) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const index = favorites.indexOf(promptId);

    if (index === -1) {
        favorites.push(promptId);
        btnElement.classList.add('active');
        btnElement.innerHTML = '<i class="fas fa-heart favorited"></i>'; // เปลี่ยนเป็นหัวใจทึบ
    } else {
        favorites.splice(index, 1);
        btnElement.classList.remove('active');
        btnElement.innerHTML = '<i class="far fa-heart"></i>'; // เปลี่ยนเป็นหัวใจโปร่ง
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// =========================================
// ส่วนที่ 10: ระบบจำลองการล็อกอิน (Auth System)
// =========================================
function initAuth() {
    checkLoginStatus();
}

// เช็คว่าเคยล็อกอินไว้ไหม
function checkLoginStatus() {
    const username = localStorage.getItem('promptchom_user');
    const loginBtn = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfile');
    const displayUsername = document.getElementById('displayUsername');

    if (username) {
        // ถ้าล็อกอินแล้ว ซ่อนปุ่มโชว์โปรไฟล์
        if(loginBtn) loginBtn.style.display = 'none';
        if(userProfile) {
            userProfile.style.display = 'inline-flex';
            displayUsername.innerText = username;
        }
    } else {
        // ถ้ายัง ซ่อนโปรไฟล์โชว์ปุ่มล็อกอิน
        if(loginBtn) loginBtn.style.display = 'inline-flex';
        if(userProfile) userProfile.style.display = 'none';
    }
}

function openLoginModal() {
    document.getElementById('loginModal').classList.add('show');
    document.getElementById('usernameInput').focus();
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('show');
}

// กดปุ่มเข้าสู่ระบบ
function loginUser() {
    const username = document.getElementById('usernameInput').value.trim();
    if (username.length > 0) {
        localStorage.setItem('promptchom_user', username);
        
        // แจก Gem ให้ 50 หากล็อกอินครั้งแรก
        if(!localStorage.getItem('user_gems')) {
            localStorage.setItem('user_gems', '50');
        }
        
        closeLoginModal();
        checkLoginStatus();
        updateGemDisplay();
        
        // เด้งไปหน้า Gem ทันทีที่ล็อกอินเสร็จ
        document.getElementById('gemsLink').click();
    } else {
        alert('กรุณาตั้งชื่อของคุณด้วยครับ!');
    }
}

// กดปุ่มออกจากระบบ
function logoutUser() {
    if(confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
        localStorage.removeItem('promptchom_user');
        checkLoginStatus();
        document.getElementById('homeLink').click(); // เด้งกลับหน้าแรก
    }
}

// อัปเดตตัวเลข Gem ในหน้า Gems Page
function updateGemDisplay() {
    const gemDisplay = document.getElementById('gemCountDisplay');
    const userGems = localStorage.getItem('user_gems') || '0';
    if(gemDisplay) {
        gemDisplay.innerHTML = `<i class="fas fa-gem" style="color: #60A5FA; font-size: 1.2rem;"></i> Gem ของฉัน: ${userGems}`;
    }
}

// สตาร์ทระบบทั้งหมดทันทีที่โหลดไฟล์
loadPrompts();
initTheme();
initBackToTop();
initNavigation();