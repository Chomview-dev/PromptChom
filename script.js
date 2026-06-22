// ==========================================
// ส่วนที่ 1: ระบบแจ้งเตือน และคัดลอก (Copy)
// ==========================================
function showToast(message = "คัดลอกสำเร็จ!") {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}

async function copyPrompt(elementId, buttonElement) {
    const textToCopy = document.getElementById(elementId).innerText;
    const promptId = elementId.replace('-text', '');
    try {
        await navigator.clipboard.writeText(textToCopy);
        
        const icon = buttonElement.querySelector('.icon');
        const text = buttonElement.querySelector('.text');
        const originalIconHTML = icon.innerHTML;
        const originalText = text.innerText;
        let buttonFeedbackText = "คัดลอกแล้ว";

        if (currentUser && !rewardedPrompts.has(promptId)) {
            await db.collection('users').doc(currentUser.uid).update({ gems: firebase.firestore.FieldValue.increment(5) });
            rewardedPrompts.add(promptId);
            const doc = await db.collection('users').doc(currentUser.uid).get();
            updateGemDisplay(doc.data().gems);
            buttonFeedbackText = `+5 Gem 💎`;
            showToast(`คัดลอกสำเร็จ! ได้รับ 5 Gem 💎`);
        } else {
            showToast("คัดลอกสำเร็จ!");
        }

        buttonElement.classList.add('copied');
        icon.innerHTML = '<i class="fas fa-check"></i>'; 
        text.innerText = buttonFeedbackText;
        setTimeout(() => {
            buttonElement.classList.remove('copied');
            icon.innerHTML = originalIconHTML;
            text.innerText = originalText;
        }, 2000);

    } catch (e) { alert("คัดลอกไม่ได้ครับ"); }
}

// ==========================================
// ส่วนที่ 2: ระบบกรองหมวดหมู่ และรายการโปรด
// ==========================================
function filterCategory(category, button) {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    document.querySelectorAll('#prompt-container .prompt-card').forEach(card => {
        const cat = card.getAttribute('data-category');
        const id = card.getAttribute('data-id');
        if (category === 'all') card.style.display = 'block';
        else if (category === 'favorites') card.style.display = currentFavorites.includes(id) ? 'block' : 'none';
        else card.style.display = cat === category ? 'block' : 'none';
    });
}

async function toggleFavorite(promptId, btnElement) {
    if (!currentUser) return openLoginModal();
    const userRef = db.collection('users').doc(currentUser.uid);
    const index = currentFavorites.indexOf(promptId);

    if (index === -1) {
        currentFavorites.push(promptId);
        await userRef.update({ favorites: firebase.firestore.FieldValue.arrayUnion(promptId) });
    } else {
        currentFavorites.splice(index, 1);
        await userRef.update({ favorites: firebase.firestore.FieldValue.arrayRemove(promptId) });
    }
    
    loadPrompts();
}

// ==========================================
// ส่วนที่ 3: โหลดข้อมูล และสร้างการ์ด Prompt
// ==========================================
async function loadPrompts() {
    const response = await fetch('database.json');
    const promptsData = await response.json();
    const container = document.getElementById('prompt-container');
    const profileFavContainer = document.getElementById('profile-favorites-grid'); 
    
    container.innerHTML = '';
    if (profileFavContainer) profileFavContainer.innerHTML = ''; 
    let favCount = 0;

    promptsData.forEach(item => {
        const isFavorited = currentFavorites.includes(item.id);
        const isUnlocked = unlockedPrompts.includes(item.id);
        const isPremium = item.isPremium;
        
        const imageHTML = item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" class="prompt-image">` : '';
        const badgeHTML = item.categoryName ? `<span class="badge ${item.badgeColor}">${item.categoryName}</span>` : '';
        const descHTML = item.description ? `<p class="prompt-description">${item.description}</p>` : '';

        const cardHTML = `
            <div class="prompt-card ${isPremium && !isUnlocked ? 'premium' : ''}" data-category="${item.categoryId}" data-id="${item.id}">
                
                <button class="btn-favorite ${isFavorited ? 'active' : ''}" onclick="toggleFavorite('${item.id}', this)">
                    <i class="${isFavorited ? 'fas fa-heart favorited' : 'far fa-heart'}"></i>
                </button>
                
                ${imageHTML}
                ${badgeHTML}
                <h3>${item.title}</h3>
                ${descHTML}
                
                <div style="position: relative;">
                    ${(isPremium && !isUnlocked) ? `
                    <div class="lock-overlay" style="border-radius: 8px;">
                        <i class="fas fa-lock premium-lock-icon" style="font-size: 2rem;"></i>
                        <button class="btn-unlock-premium" onclick="unlockPrompt('${item.id}', ${item.unlockPrice})" style="padding: 10px 24px; font-size: 1rem;">
                            ปลดล็อก ${item.unlockPrice} Gem 💎
                        </button>
                    </div>` : ''}
                    
                    <div class="prompt-box-container ${(isPremium && !isUnlocked) ? 'premium-blur' : ''}">
                        <p class="prompt-box" id="${item.id}-text">${(isPremium && !isUnlocked) ? '🔒 เนื้อหานี้เป็นความลับระดับพรีเมียม... กรุณาปลดล็อกเพื่อดูข้อความคำสั่งทั้งหมด' : item.content}</p>
                    </div>
                </div>
                
                ${(isPremium && !isUnlocked) ? `
                <button class="btn-copy" style="opacity: 0.5; filter: grayscale(100%); cursor: not-allowed;" onclick="return false;">
                    <span class="icon"><i class="fas fa-lock"></i></span> <span class="text">ปลดล็อกเพื่อคัดลอก</span>
                </button>
                ` : `
                <button onclick="copyPrompt('${item.id}-text', this)" class="btn-copy">
                    <span class="icon"><i class="fas fa-paste"></i></span> <span class="text">คัดลอกคำสั่ง</span>
                </button>
                `}
            </div>
        `;
        
        container.innerHTML += cardHTML;
        
        if (isFavorited && profileFavContainer) {
            profileFavContainer.innerHTML += cardHTML;
            favCount++;
        }
    });

    if (profileFavContainer && favCount === 0) {
        profileFavContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #64748B;"><i class="far fa-folder-open" style="font-size: 3rem; margin-bottom: 16px; color: #CBD5E1;"></i><p>คุณยังไม่มี Prompt รายการโปรด<br>ลองกดหัวใจให้ Prompt ที่หน้าแรกดูสิ!</p></div>';
    }
}

// ==========================================
// ส่วนที่ 4: ระบบค้นหา และธีมมืด (Dark Mode)
// ==========================================
function searchPrompts() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('#prompt-container .prompt-card').forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        const content = card.querySelector('.prompt-box').innerText.toLowerCase();
        card.style.display = (title.includes(searchQuery) || content.includes(searchQuery)) ? 'block' : 'none';
    });
}

function initTheme() {
    const btn = document.getElementById('themeToggle');
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');
    
    if (currentTheme === 'dark' || currentTheme === null) {
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark'); 
    } else {
        body.classList.remove('dark-mode'); 
    }
    
    btn.innerHTML = body.classList.contains('dark-mode') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    
    btn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
}

// ==========================================
// ส่วนที่ 5: ตั้งค่า Firebase
// ==========================================
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
let currentFavorites = [];
let unlockedPrompts = [];
let rewardedPrompts = new Set();

// ==========================================
// ส่วนที่ 6: ระบบจัดการสมาชิก (Auth & Profile)
// ==========================================
function initAuth() {
    auth.onAuthStateChanged(async (user) => {
        const loginBtn = document.getElementById('loginBtn');
        const userProfile = document.getElementById('userProfile');
        const headerGemContainer = document.getElementById('headerGemContainer');

        const profileNameBig = document.getElementById('profileNameBig');
        const profileEmailBig = document.getElementById('profileEmailBig');
        const profileAvatarBig = document.getElementById('profileAvatarBig');

        if (user) {
            currentUser = user;
            const doc = await db.collection('users').doc(user.uid).get();
            
            if (!doc.exists) {
                await db.collection('users').doc(user.uid).set({ gems: 100, favorites: [], unlockedPrompts: [] });
                updateGemDisplay(100);
            } else {
                const userData = doc.data();
                updateGemDisplay(userData.gems);
                currentFavorites = userData.favorites || [];
                unlockedPrompts = userData.unlockedPrompts || [];

                let userNameDisplay = user.displayName || 'User';
                if (userData.role === 'admin') {
                    userNameDisplay = "Admin 👑";
                    showToast("ล็อกอินสำเร็จ! ยินดีต้อนรับท่าน Admin 👑");
                }
                
                if (profileNameBig) profileNameBig.innerText = userNameDisplay;
                if (profileEmailBig) profileEmailBig.innerText = user.email || 'ไม่ได้ระบุอีเมล';
                
                const defaultAvatarEncoded = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%239333EA'/%3E%3Ctext x='50' y='65' font-family='Arial' font-size='40' fill='white' text-anchor='middle'%3EU%3C/text%3E%3C/svg%3E";
                const userPhoto = user.photoURL || defaultAvatarEncoded;
                
                if (profileAvatarBig) profileAvatarBig.innerHTML = `<img src="${userPhoto}" style="width: 100%; height: 100%; object-fit: cover;">`;
                
                if(loginBtn) loginBtn.style.display = 'none';
                if(headerGemContainer) headerGemContainer.style.display = 'inline-flex';
                if(userProfile) {
                    userProfile.style.display = 'inline-flex';
                    userProfile.innerHTML = `<img src="${userPhoto}" alt="Profile" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid #9333EA; margin-right: 8px;"> <span id="displayUsername">${userNameDisplay}</span> <a href="#" onclick="logoutUser(); return false;" class="btn-logout" title="ออกจากระบบ"><i class="fas fa-sign-out-alt"></i></a>`;
                }
            }
        } else {
            currentUser = null;
            currentFavorites = [];
            unlockedPrompts = [];
            updateGemDisplay(0);
            
            if (profileNameBig) profileNameBig.innerText = "กรุณาล็อกอิน";
            if (profileEmailBig) profileEmailBig.innerText = "-";
            if (profileAvatarBig) profileAvatarBig.innerHTML = "👤";

            if(loginBtn) loginBtn.style.display = 'inline-flex';
            if(headerGemContainer) headerGemContainer.style.display = 'none';
            if(userProfile) userProfile.style.display = 'none';
        }
        loadPrompts();
    });
}

function updateGemDisplay(gems) {
    const elProfile = document.getElementById('gemCountDisplay');
    const elHeader = document.getElementById('headerGemCount'); 
    
    if(elProfile) elProfile.innerText = gems;
    if(elHeader) elHeader.innerText = gems;
}

async function unlockPrompt(promptId, price) {
    const userRef = db.collection('users').doc(currentUser.uid);
    const doc = await userRef.get();
    if (doc.data().gems < price) return alert("Gem ไม่พอครับ!");
    
    await userRef.update({
        gems: firebase.firestore.FieldValue.increment(-price),
        unlockedPrompts: firebase.firestore.FieldValue.arrayUnion(promptId)
    });
    unlockedPrompts.push(promptId);
    updateGemDisplay(doc.data().gems - price);
    loadPrompts();
    showToast("ปลดล็อกสำเร็จ! 🔓");
}

// ==========================================
// ส่วนที่ 7: ควบคุมป๊อปอัป และการเข้าสู่ระบบ
// ==========================================
function openLoginModal() { document.getElementById('loginModal').classList.add('show'); }
function closeLoginModal() { document.getElementById('loginModal').classList.remove('show'); }

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(() => {
        closeLoginModal();
    }).catch((error) => alert("การล็อกอินขัดข้อง: " + error.message));
}

function logoutUser() {
    if(confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
        auth.signOut().then(() => document.getElementById('homeLink').click());
    }
}

function loginAsAdmin() {
    const email = prompt("🔒 ประตูลับ Admin\nกรุณากรอก Email:");
    if (!email) return;
    const password = prompt("🔑 กรุณากรอกรหัสผ่าน:");
    if (!password) return;
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            closeLoginModal();
            document.getElementById('gemsLink').click(); 
        })
        .catch(() => alert("❌ ล็อกอินล้มเหลว: รหัสผ่านผิด หรืออีเมลไม่ถูกต้อง"));
}

// ==========================================
// ส่วนที่ 8: ระบบสลับหน้าเว็บ (Navigation)
// ==========================================
function initNavigation() {
    const homeLink = document.getElementById('homeLink');
    const spinLink = document.getElementById('spinLink'); 
    const gemsLink = document.getElementById('gemsLink'); 
    const contactLink = document.getElementById('contactLink');
    const logoLink = document.querySelector('.logo'); 
    
    const promptContainer = document.getElementById('prompt-container');
    const gemsPage = document.getElementById('gems-page');
    const contactPage = document.getElementById('contact-page');
    const spinPage = document.getElementById('spin-page'); 
    
    const hideAllPages = () => {
        promptContainer.style.display = 'none'; 
        gemsPage.style.display = 'none'; 
        contactPage.style.display = 'none'; 
        if (spinPage) spinPage.style.display = 'none';
        document.querySelector('.search-container').style.display = 'none';
        document.querySelector('.ai-links-container').style.display = 'none';
    };

    const goHomeAndReset = (e) => {
        e.preventDefault();
        hideAllPages();
        promptContainer.style.display = 'grid'; 
        document.querySelector('.search-container').style.display = 'block';
        document.querySelector('.ai-links-container').style.display = 'flex';

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = ''; 
            searchPrompts(); 
        }

        const allCategoryBtn = document.querySelector('.dropdown-content .btn-filter');
        if (allCategoryBtn) filterCategory('all', allCategoryBtn);
    };

    if (homeLink) homeLink.addEventListener('click', goHomeAndReset);
    if (logoLink) logoLink.addEventListener('click', goHomeAndReset);
    
    if (spinLink) {
        spinLink.addEventListener('click', (e) => {
            e.preventDefault();
            if(!currentUser) return openLoginModal(); 
            hideAllPages();
            spinPage.style.display = 'block'; 
        });
    }

    if (gemsLink) {
        gemsLink.addEventListener('click', (e) => {
            e.preventDefault();
            if(!currentUser) return openLoginModal();
            hideAllPages();
            gemsPage.style.display = 'block'; 
        });
    }

    if (contactLink) {
        contactLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllPages();
            contactPage.style.display = 'block'; 
        });
    }
}

// ==========================================
// ส่วนที่ 9: ระบบส่งข้อความ (Contact Form)
// ==========================================
async function submitContactForm(event) {
    event.preventDefault(); 
    
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังส่งข้อความ...';
    submitBtn.disabled = true;

    try {
        await db.collection('messages').add({
            name: name,
            email: email,
            subject: subject,
            message: message,
            userId: currentUser ? currentUser.uid : 'guest_user', 
            createdAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
        
        showToast("ส่งข้อความสำเร็จ! ทีมงานจะรีบติดต่อกลับครับ 💌");
        event.target.reset(); 
        
    } catch (error) {
        console.error("Error sending message: ", error);
        alert("เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้งครับ");
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// ==========================================
// ส่วนที่ 10: ระบบมินิเกม (Lucky Spin)
// ==========================================
const spinCost = 20; 
let isSpinning = false;

const rewardsPool = [
    { type: "normal", name: "เกลือ (+1)", value: 1, icon: "fas fa-coins", weight: 50 },      
    { type: "rare", name: "+10 Gem", value: 10, icon: "fas fa-gem", weight: 30 },            
    { type: "epic", name: "+50 Gem", value: 50, icon: "fas fa-sack-dollar", weight: 15 },    
    { type: "legendary", name: "แจ็คพอต 500!", value: 500, icon: "fas fa-crown", weight: 5 } 
];

function getRandomReward() {
    const totalWeight = rewardsPool.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < rewardsPool.length; i++) {
        if (random < rewardsPool[i].weight) return rewardsPool[i];
        random -= rewardsPool[i].weight;
    }
    return rewardsPool[0]; 
}

async function startSpin() {
    if (!currentUser) return openLoginModal();
    if (isSpinning) return;

    const userRef = db.collection('users').doc(currentUser.uid);
    const doc = await userRef.get();
    
    if (doc.data().gems < spinCost) {
        alert(`❌ คุณมี Gem ไม่พอ! ต้องใช้ ${spinCost} Gem ในการสุ่มครับ`);
        return;
    }

    isSpinning = true;
    await userRef.update({ gems: firebase.firestore.FieldValue.increment(-spinCost) });
    updateGemDisplay(doc.data().gems - spinCost);

    const track = document.getElementById('rouletteTrack');
    const btn = document.getElementById('btnSpin');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังหมุน...';

    track.innerHTML = '';
    track.style.transition = 'none'; 
    track.style.transform = 'translateX(0)';

    const itemWidth = 110; 
    const winningIndex = 40; 
    
    const winningReward = getRandomReward();

    for (let i = 0; i < 50; i++) {
        let r = (i === winningIndex) ? winningReward : getRandomReward();
        track.innerHTML += `
            <div class="roulette-item ${r.type}">
                <i class="${r.icon}"></i>
                <span>${r.name}</span>
            </div>
        `;
    }

    setTimeout(() => {
        const windowWidth = document.querySelector('.roulette-window').offsetWidth;
        const stopPosition = -(winningIndex * itemWidth) + (windowWidth / 2) - (itemWidth / 2);
        const randomOffset = Math.floor(Math.random() * 80) - 40; 
        const finalPosition = stopPosition + randomOffset;

        track.style.transition = 'transform 5s cubic-bezier(0.15, 0.9, 0.2, 1)';
        track.style.transform = `translateX(${finalPosition}px)`;

        setTimeout(async () => {
            await userRef.update({ gems: firebase.firestore.FieldValue.increment(winningReward.value) });
            const newDoc = await userRef.get();
            updateGemDisplay(newDoc.data().gems); 
            
            if (winningReward.type === 'legendary') {
                alert(`👑 แจ็คพอตแตก!! ยินดีด้วยคุณได้รับ ${winningReward.name} Gem!`);
            } else if (winningReward.type === 'normal') {
                showToast(`เกลือรึเปล่า? ได้มา ${winningReward.value} Gem 😅`);
            } else {
                showToast(`🎉 ยินดีด้วย! คุณได้รับ ${winningReward.value} Gem`);
            }

            isSpinning = false;
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play"></i> เริ่มสุ่มอีกครั้ง (20 Gem)';
        }, 5200);

    }, 50);
}

// ==========================================
// ส่วนที่ 11: ระบบเติม Gem (Top-up Store - Mock Payment)
// ==========================================
function openTopupModal() { 
    if (!currentUser) return openLoginModal();
    document.getElementById('topupModal').classList.add('show'); 
}
function closeTopupModal() { 
    document.getElementById('topupModal').classList.remove('show'); 
}

async function processTopup(gemAmount, price) {
    if (!currentUser) return;

    const originalContent = document.querySelector('#topupModal .modal-content').innerHTML;
    document.querySelector('#topupModal .modal-content').innerHTML = `
        <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #10B981; margin-bottom: 16px;"></i>
        <h2>กำลังประมวลผล...</h2>
        <p>กรุณารอสักครู่ ระบบกำลังยืนยันการชำระเงิน ฿${price}</p>
    `;

    setTimeout(async () => {
        try {
            const userRef = db.collection('users').doc(currentUser.uid);
            await userRef.update({ gems: firebase.firestore.FieldValue.increment(gemAmount) });
            
            const newDoc = await userRef.get();
            updateGemDisplay(newDoc.data().gems);
            
            document.querySelector('#topupModal .modal-content').innerHTML = `
                <i class="fas fa-check-circle" style="font-size: 4rem; color: #10B981; margin-bottom: 16px;"></i>
                <h2 style="color: #10B981;">ชำระเงินสำเร็จ!</h2>
                <p>คุณได้รับ <b style="color:#60A5FA;">${gemAmount} Gem</b> เรียบร้อยแล้ว</p>
                <button onclick="closeTopupModal(); setTimeout(() => document.querySelector('#topupModal .modal-content').innerHTML = originalContent, 300);" class="btn-confirm" style="width: 100%; margin-top: 16px; background: #10B981;">กลับสู่หน้าโปรไฟล์</button>
            `;
            
            showToast(`🎉 เติมเงินสำเร็จ! ได้รับ ${gemAmount} Gem`);

        } catch (error) {
            alert("เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่อีกครั้ง");
            closeTopupModal();
            document.querySelector('#topupModal .modal-content').innerHTML = originalContent; 
        }
    }, 1500); 
}

// เรียกใช้งานฟังก์ชันเริ่มต้น
initAuth();
initTheme();
initNavigation();