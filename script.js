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
// ส่วนที่ 2: ระบบคัดลอกข้อความ + เปลี่ยนไอคอนปุ่ม
// ==========================================
function copyPrompt(elementId, buttonElement) {
    const textToCopy = document.getElementById(elementId).innerText;
    
    // ก๊อปปี้ลงคลิปบอร์ด
    navigator.clipboard.writeText(textToCopy).then(function() {
        // 1. โชว์ Toast แจ้งเตือนมุมจอ
        showToast();
        
        // 2. ดึง element ของไอคอนและข้อความในปุ่มนั้นมา
        const icon = buttonElement.querySelector('.icon');
        const text = buttonElement.querySelector('.text');
        
        // จำค่าเดิมไว้ก่อน
        const originalIcon = icon.innerText;
        const originalText = text.innerText;
        
        // 3. เปลี่ยนสีปุ่ม เปลี่ยนไอคอน และข้อความ
        buttonElement.classList.add('copied');
        icon.innerText = "✅";
        text.innerText = "คัดลอกแล้ว";
        
        // 4. ตั้งเวลา 2 วินาทีให้กลับมาเป็นสภาพเดิม
        setTimeout(function() {
            buttonElement.classList.remove('copied');
            icon.innerText = originalIcon;
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
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]'); // ดึงข้อมูลหัวใจ

    cards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        const cardId = card.getAttribute('data-id');

        // เงื่อนไขการโชว์การ์ด
        if (category === 'all') {
            card.style.display = 'block';
        } else if (category === 'favorites') {
            // โชว์เฉพาะอันที่ id อยู่ในรายการโปรด
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

        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

        promptsData.forEach(item => {
            const isFavorited = favorites.includes(item.id);
            const heartIcon = isFavorited ? '❤️' : '🤍';
            const activeClass = isFavorited ? 'active' : '';

            // 🔥 เช็คว่าข้อมูลมีรูปภาพไหม ถ้ามีให้สร้างแท็ก <img> ถ้าไม่มีให้ว่างไว้
            const imageHTML = item.imageUrl 
                ? `<img src="${item.imageUrl}" alt="${item.title}" class="prompt-image">` 
                : '';

            const cardHTML = `
                <div class="prompt-card" data-category="${item.categoryId}" data-id="${item.id}">
                    <button class="btn-favorite ${activeClass}" onclick="toggleFavorite('${item.id}', this)">${heartIcon}</button>
                    
                    ${imageHTML}
                    
                    <span class="badge ${item.badgeColor}">${item.categoryName}</span>
                    <h3>${item.title}</h3>
                    
                    ${item.description ? `<p class="prompt-description">${item.description}</p>` : ''}
                    
                    <div class="prompt-box-container">
                        <p class="prompt-box" id="${item.id}-text">${item.content}</p>
                    </div>
                    
                    <button onclick="copyPrompt('${item.id}-text', this)" class="btn-copy">
                        <span class="icon">📋</span> <span class="text">คัดลอกคำสั่ง</span>
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
    let hasVisibleCard = false;
    
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        const content = card.querySelector('.prompt-box').innerText.toLowerCase();
        if (title.includes(searchQuery) || content.includes(searchQuery)) {
            card.style.display = 'block';
            hasVisibleCard = true;
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
        themeToggleBtn.innerText = '☀️';
    }
    
    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggleBtn.innerText = isDark ? '☀️' : '🌙';
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


// สตาร์ทระบบทั้งหมดทันทีที่โหลดไฟล์
loadPrompts();
initTheme();
initBackToTop();

// =========================================
// ส่วนที่ 8: ระบบสลับหน้า GEMS/Prompt (Navigation)
// =========================================
function initNavigation() {
    const homeLink = document.getElementById('homeLink');
    const gemsLink = document.getElementById('gemsLink');
    
    const promptContainer = document.getElementById('prompt-container');
    const gemsPage = document.getElementById('gems-page');

    // 1. กดเมนู หน้าแรก
    homeLink.addEventListener('click', (e) => {
        e.preventDefault(); // ป้องกันลิงก์โหลดหน้าใหม่
        promptContainer.style.display = 'grid'; // โชว์ Prompt
        gemsPage.style.display = 'none'; // ซ่อน Gems
    });

    // 2. กดเมนู Gems
    gemsLink.addEventListener('click', (e) => {
        e.preventDefault();
        promptContainer.style.display = 'none'; // ซ่อน Prompt
        gemsPage.style.display = 'block'; // โชว์ Gems
    });
}

// 🔥 สตาร์ทระบบ Nav ทันทีที่โหลดไฟล์ 🔥
initNavigation();

// ==========================================
// ส่วนที่ 9: ระบบกดหัวใจรายการโปรด (Favorites)
// ==========================================
function toggleFavorite(promptId, btnElement) {
    // 1. ดึงข้อมูลหัวใจเดิมจาก LocalStorage (ถ้าไม่มีให้เป็น Array ว่าง)
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const index = favorites.indexOf(promptId);

    if (index === -1) {
        // ถ้ายังไม่มีในรายการโปรด -> ให้เพิ่มเข้าไป
        favorites.push(promptId);
        btnElement.classList.add('active');
        btnElement.innerText = '❤️'; // เปลี่ยนเป็นหัวใจสีแดง
    } else {
        // ถ้ามีอยู่แล้ว (กดซ้ำ) -> ให้เอาออก
        favorites.splice(index, 1);
        btnElement.classList.remove('active');
        btnElement.innerText = '🤍'; // กลับเป็นหัวใจสีขาว
    }

    // 2. เซฟกลับลงไปในเครื่อง
    localStorage.setItem('favorites', JSON.stringify(favorites));
}