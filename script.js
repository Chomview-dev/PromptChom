// ==========================================
// ส่วนที่ 1: ระบบแจ้งเตือน และคัดลอก (Creator Economy)
// ==========================================
function showToast(message = "สำเร็จ!") {
    const toast = document.getElementById("toast");
    toast.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 8px;"></i>${message}`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

async function copyPrompt(elementId, buttonElement) {
    const textToCopy = document.getElementById(elementId).innerText;
    
    // หาการ์ดเพื่อดึง ID ข้อมูล
    const card = buttonElement.closest('.prompt-card');
    const promptId = card.getAttribute('data-id');
    const promptAuthorId = card.getAttribute('data-author-id'); // ดึง ID ของครีเอเตอร์

    try {
        await navigator.clipboard.writeText(textToCopy);
        
        const icon = buttonElement.querySelector('.icon');
        const text = buttonElement.querySelector('.text');
        const originalIconHTML = icon.innerHTML;
        const originalText = text.innerText;

        // ลอจิก Creator Economy: ถ้าล็อกอินอยู่ + เป็น Prompt ทางบ้าน + ไม่ใช่ของตัวเอง
        if (currentUser && promptAuthorId && promptAuthorId !== currentUser.uid) {
            const userRef = db.collection('users').doc(currentUser.uid);
            const userDoc = await userRef.get();
            const copiedPromptsHistory = userDoc.data().copiedPromptsHistory || [];

            // ตรวจสอบว่าเคยให้แต้ม Prompt นี้ไปหรือยัง? (ป้องกันสแปม)
            if (!copiedPromptsHistory.includes(promptId)) {
                // 1. บันทึกประวัติว่าผู้ใช้นี้ก๊อปปี้ไปแล้ว
                await userRef.update({
                    copiedPromptsHistory: firebase.firestore.FieldValue.arrayUnion(promptId)
                });

                // 2. ส่ง 50 Gem ไปเข้า "กล่องรอรับรางวัล" ของผู้สร้าง
                await db.collection('users').doc(promptAuthorId).update({
                    claimableGems: firebase.firestore.FieldValue.increment(50)
                });
            }
        }

        showToast("คัดลอกคำสั่งสำเร็จ!");
        
        // เอฟเฟกต์ปุ่มสีเขียว
        buttonElement.classList.add('copied');
        icon.innerHTML = '<i class="fas fa-check"></i>'; 
        text.innerText = "คัดลอกแล้ว";
        
        setTimeout(() => {
            buttonElement.classList.remove('copied');
            icon.innerHTML = originalIconHTML;
            text.innerText = originalText;
        }, 2000);

    } catch (e) { 
        alert("เบราว์เซอร์ของคุณไม่รองรับการคัดลอกอัตโนมัติครับ"); 
    }
}

// ==========================================
// ฟังก์ชันกดรับรางวัลสำหรับ Creator (Claim Rewards)
// ==========================================
async function claimCreatorRewards() {
    if (!currentUser) return;
    
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        const doc = await userRef.get();
        const gemsToClaim = doc.data().claimableGems || 0;

        if (gemsToClaim > 0) {
            // โอน Gem จากกล่องเข้ายอดหลัก และเคลียร์กล่องทิ้ง
            await userRef.update({
                gems: firebase.firestore.FieldValue.increment(gemsToClaim),
                claimableGems: 0
            });
            
            // อัปเดต UI หน้าจอ
            updateGemDisplay(doc.data().gems + gemsToClaim);
            document.getElementById('rewardBoxContainer').style.display = 'none';
            
            showToast(`🎉 สุดยอด! คุณได้รับโบนัสครีเอเตอร์ ${gemsToClaim} Gem เรียบร้อยแล้ว`);
        }
    } catch (error) {
        console.error("Claim error:", error);
        alert("เกิดข้อผิดพลาดในการรับรางวัลครับ");
    }
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
    
    loadPrompts(); // โหลดข้อมูลใหม่เพื่ออัปเดต UI
}

// ==========================================
// ส่วนที่ 3: โหลดข้อมูล และสร้างการ์ด Prompt (Real-time Firebase)
// ==========================================
function loadPrompts() {
    const container = document.getElementById('prompt-container');
    const profileFavContainer = document.getElementById('profile-favorites-grid'); 
    
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #64748B;"><i class="fas fa-circle-notch fa-spin fa-3x" style="color: #9333EA; margin-bottom: 16px;"></i><p>กำลังเชื่อมต่อฐานข้อมูลคำสั่ง AI...</p></div>';
    if (profileFavContainer) profileFavContainer.innerHTML = ''; 

    db.collection('prompts').onSnapshot(snapshot => {
        container.innerHTML = '';
        let favCount = 0;

        if (snapshot.empty) {
            container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #64748B;"><i class="fas fa-box-open fa-3x" style="margin-bottom: 16px;"></i><p>ยังไม่มีข้อมูล Prompt ในระบบ</p></div>';
            return;
        }

        snapshot.forEach(doc => {
            const item = doc.data();
            item.id = doc.id; 

            const isFavorited = currentFavorites.includes(item.id);
            const isUnlocked = unlockedPrompts.includes(item.id);
            const isPremium = item.isPremium || false;
            
            const imageHTML = item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" class="prompt-image">` : '';
            const badgeHTML = item.categoryName ? `<span class="badge ${item.badgeColor}">${item.categoryName}</span>` : '';
            const descHTML = item.description ? `<p class="prompt-description">${item.description}</p>` : '';
            const authorHTML = item.authorName ? `<div class="prompt-author"><i class="fas fa-user-edit"></i> แชร์โดย: ${item.authorName}</div>` : '';

            // ⚠️ เพิ่ม data-author-id สำหรับระบบแจก Gem
            const cardHTML = `
                <div class="prompt-card ${isPremium && !isUnlocked ? 'premium' : ''}" data-category="${item.categoryId}" data-id="${item.id}" data-author-id="${item.authorId || ''}">
                    
                    <button class="btn-favorite ${isFavorited ? 'active' : ''}" onclick="toggleFavorite('${item.id}', this)">
                        <i class="${isFavorited ? 'fas fa-heart favorited' : 'far fa-heart'}"></i>
                    </button>
                    
                    ${imageHTML}
                    ${badgeHTML}
                    <h3>${item.title}</h3>
                    ${authorHTML}
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
    }, error => {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล Prompt:", error);
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #EF4444;"><i class="fas fa-exclamation-triangle fa-2x" style="margin-bottom: 12px;"></i><p>ไม่สามารถเชื่อมต่อฐานข้อมูลได้</p></div>';
    });
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
// ส่วนที่ 5: ตั้งค่า Firebase & ตัวแปร Global
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

// ==========================================
// ส่วนที่ 6: ระบบจัดการสมาชิก (Auth & Profile)
// ==========================================
function initAuth() {
    auth.onAuthStateChanged(async (user) => {
        const loginBtn = document.getElementById('loginBtn');
        const userProfile = document.getElementById('userProfile');
        const headerGemContainer = document.getElementById('headerGemContainer');
        const adminLink = document.getElementById('adminLink');

        const profileNameBig = document.getElementById('profileNameBig');
        const profileEmailBig = document.getElementById('profileEmailBig');
        const profileAvatarBig = document.getElementById('profileAvatarBig');
        const rewardBox = document.getElementById('rewardBoxContainer'); // กล่องของขวัญ

        if (user) {
            currentUser = user;
            const doc = await db.collection('users').doc(user.uid).get();
            
            if (!doc.exists) {
                // สมัครใหม่ เซ็ตค่าพื้นฐานทั้งหมด
                await db.collection('users').doc(user.uid).set({ 
                    gems: 100, 
                    favorites: [], 
                    unlockedPrompts: [],
                    copiedPromptsHistory: [],
                    claimableGems: 0
                });
                updateGemDisplay(100);
                if(rewardBox) rewardBox.style.display = 'none';
            } else {
                const userData = doc.data();
                updateGemDisplay(userData.gems);
                currentFavorites = userData.favorites || [];
                unlockedPrompts = userData.unlockedPrompts || [];
                
                // ตรวจสอบกล่องของขวัญว่ามี Gem ค้างอยู่ไหม
                const claimableGems = userData.claimableGems || 0;
                if (claimableGems > 0 && rewardBox) {
                    rewardBox.style.display = 'block';
                    const pendingEl = document.getElementById('pendingGemsCount');
                    if(pendingEl) pendingEl.innerText = claimableGems;
                } else if (rewardBox) {
                    rewardBox.style.display = 'none';
                }

                let userNameDisplay = user.displayName || 'User';
                
                // ตรวจสอบสิทธิ์ Admin
                if (userData.role === 'admin') {
                    userNameDisplay = "Admin 👑";
                    if(adminLink) adminLink.style.display = 'inline-flex';
                    loadAdminTopups();
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
            if (rewardBox) rewardBox.style.display = 'none';

            if(loginBtn) loginBtn.style.display = 'inline-flex';
            if(headerGemContainer) headerGemContainer.style.display = 'none';
            if(userProfile) userProfile.style.display = 'none';
            if(adminLink) adminLink.style.display = 'none';
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
            document.getElementById('homeLink').click(); 
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
    const adminLink = document.getElementById('adminLink');
    const logoLink = document.querySelector('.logo'); 
    
    const promptContainer = document.getElementById('prompt-container');
    const gemsPage = document.getElementById('gems-page');
    const contactPage = document.getElementById('contact-page');
    const spinPage = document.getElementById('spin-page'); 
    const adminPage = document.getElementById('admin-page');
    
    const hideAllPages = () => {
        promptContainer.style.display = 'none'; 
        gemsPage.style.display = 'none'; 
        contactPage.style.display = 'none'; 
        if (spinPage) spinPage.style.display = 'none';
        if (adminPage) adminPage.style.display = 'none';
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
            loadSpinHistory(); 
        });
    }

    if (gemsLink) {
        gemsLink.addEventListener('click', (e) => {
            e.preventDefault();
            if(!currentUser) return openLoginModal();
            hideAllPages();
            gemsPage.style.display = 'block'; 
            loadUserTopupHistory(); // โหลดประวัติเติมเงินด้วย
        });
    }

    if (contactLink) {
        contactLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllPages();
            contactPage.style.display = 'block'; 
        });
    }

    if (adminLink) {
        adminLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllPages();
            if (adminPage) adminPage.style.display = 'block'; 
            loadAdminTopups();
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

let spinHistoryUnsubscribe = null;

function loadSpinHistory() {
    if (!currentUser) return;
    const listContainer = document.getElementById('spinHistoryList');

    if (spinHistoryUnsubscribe) spinHistoryUnsubscribe();

    spinHistoryUnsubscribe = db.collection('spin_history')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                listContainer.innerHTML = '<li class="history-empty">ยังไม่มีประวัติการสุ่ม เริ่มหมุนตู้แรกเลย!</li>';
                return;
            }

            let historyData = [];
            snapshot.forEach(doc => historyData.push(doc.data()));
            
            historyData.sort((a, b) => {
                const timeA = a.timestamp ? a.timestamp.toDate().getTime() : Date.now();
                const timeB = b.timestamp ? b.timestamp.toDate().getTime() : Date.now();
                return timeB - timeA;
            });

            historyData = historyData.slice(0, 10);
            listContainer.innerHTML = ''; 
            
            historyData.forEach(data => {
                const dateStr = data.timestamp ? data.timestamp.toDate().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : 'เมื่อสักครู่';

                listContainer.innerHTML += `
                    <li class="spin-history-item">
                        <div class="history-reward ${data.rewardType}">
                            <i class="${data.icon}"></i> ${data.rewardName}
                        </div>
                        <div class="history-date">${dateStr}</div>
                    </li>
                `;
            });
        }, error => console.error("เกิดข้อผิดพลาดในการดึงประวัติ:", error));
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
            
            await db.collection('spin_history').add({
                userId: currentUser.uid,
                rewardName: winningReward.name,
                rewardValue: winningReward.value,
                rewardType: winningReward.type,
                icon: winningReward.icon,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (winningReward.type === 'legendary') alert(`👑 แจ็คพอตแตก!! ยินดีด้วยคุณได้รับ ${winningReward.name} Gem!`);
            else if (winningReward.type === 'normal') showToast(`เกลือรึเปล่า? ได้มา ${winningReward.value} Gem 😅`);
            else showToast(`🎉 ยินดีด้วย! คุณได้รับ ${winningReward.value} Gem`);

            isSpinning = false;
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play"></i> เริ่มสุ่มอีกครั้ง (20 Gem)';
        }, 5200);
    }, 50);
}

// ==========================================
// ส่วนที่ 11: ระบบเติม Gem และประวัติการทำรายการ
// ==========================================
let pendingTopup = { gems: 0, price: 0 }; 

function openTopupModal() { 
    if (!currentUser) return openLoginModal();
    document.getElementById('topupModal').classList.add('show'); 
}
function closeTopupModal() { document.getElementById('topupModal').classList.remove('show'); }

function processTopup(gemAmount, price) {
    if (!currentUser) return;
    pendingTopup.gems = gemAmount;
    pendingTopup.price = price;
    
    document.getElementById('slipPayAmount').innerText = price;
    document.getElementById('slipGemAmount').innerText = gemAmount;
    
    closeTopupModal();
    document.getElementById('slipModal').classList.add('show');
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('slipProcessing').style.display = 'none';
    document.getElementById('slipFileInput').value = '';
}

function closeSlipModal() { document.getElementById('slipModal').classList.remove('show'); }

function handleSlipUpload(event) {
    const file = event.target.files[0];
    if (!file) return; 

    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('slipProcessing').style.display = 'block';

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = async function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600; 
            let scaleSize = 1;
            
            if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
            
            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            try {
                await db.collection('topup_requests').add({
                    userId: currentUser.uid,
                    userName: currentUser.displayName || 'User',
                    userEmail: currentUser.email,
                    gemsRequested: pendingTopup.gems,
                    amountPaid: pendingTopup.price,
                    slipImage: compressedBase64, 
                    status: 'pending', 
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                closeSlipModal();
                showToast(`⏳ อัปโหลดสลิปสำเร็จ! กรุณารอแอดมินตรวจสอบครับ`);

            } catch (error) {
                console.error("Error saving to Firebase:", error);
                alert("❌ เกิดข้อผิดพลาดในการส่งสลิป (รูปอาจจะยังใหญ่เกินไป)");
                closeSlipModal();
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

let userTopupUnsubscribe = null;

function loadUserTopupHistory() {
    if (!currentUser) return;
    const container = document.getElementById('user-topup-history-list');
    
    if (userTopupUnsubscribe) userTopupUnsubscribe();
    container.innerHTML = '<p class="history-empty"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</p>';

    userTopupUnsubscribe = db.collection('topup_requests')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                container.innerHTML = '<p class="history-empty">คุณยังไม่เคยทำรายการเติมเงินครับ</p>';
                return;
            }

            let txData = [];
            snapshot.forEach(doc => txData.push(doc.data()));

            txData.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.toDate().getTime() : Date.now();
                const timeB = b.createdAt ? b.createdAt.toDate().getTime() : Date.now();
                return timeB - timeA;
            });

            container.innerHTML = '';
            txData.forEach(data => {
                const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleString('th-TH') : 'กำลังดำเนินการ...';
                
                let statusConfig = { class: 'status-pending', icon: 'fa-clock', text: 'รอตรวจสอบ' };
                if (data.status === 'approved') statusConfig = { class: 'status-approved', icon: 'fa-check-circle', text: 'อนุมัติสำเร็จ' };
                else if (data.status === 'rejected') statusConfig = { class: 'status-rejected', icon: 'fa-times-circle', text: 'รายการถูกปฏิเสธ' };

                container.innerHTML += `
                    <div class="transaction-item">
                        <div class="tx-info">
                            <span class="tx-title">คำขอเติม ${data.gemsRequested} Gem</span>
                            <span class="tx-date">ยอดชำระ: ฿${data.amountPaid} | ${dateStr}</span>
                        </div>
                        <div class="tx-status ${statusConfig.class}">
                            <i class="fas ${statusConfig.icon}"></i> ${statusConfig.text}
                        </div>
                    </div>
                `;
            });
        }, error => {
            console.error("เกิดข้อผิดพลาดในการดึงประวัติเติมเงิน:", error);
            container.innerHTML = '<p class="history-empty" style="color: #EF4444;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
        });
}

// ==========================================
// ส่วนที่ 12: ระบบจัดการของแอดมิน (Admin Dashboard)
// ==========================================
function loadAdminTopups() {
    const listContainer = document.getElementById('admin-topup-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<p style="color: #64748B;">กำลังโหลดข้อมูล...</p>';

    db.collection('topup_requests').where('status', '==', 'pending').onSnapshot(snapshot => {
        listContainer.innerHTML = '';
        if (snapshot.empty) {
            listContainer.innerHTML = '<p style="color: #10B981; font-weight: 700;"><i class="fas fa-check-circle"></i> ไม่มีรายการค้างตรวจสอบครับ</p>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            listContainer.innerHTML += `
                <div class="topup-request-card" id="req-${doc.id}">
                    <a href="${data.slipImage}" target="_blank" title="คลิกเพื่อดูรูปใหญ่">
                        <img src="${data.slipImage}" class="slip-thumbnail" alt="สลิปโอนเงิน">
                    </a>
                    <div class="request-info">
                        <h4>ขอเติม ${data.gemsRequested} Gem (ยอดโอน ฿${data.amountPaid})</h4>
                        <p><b>ผู้ใช้:</b> ${data.userName} (${data.userEmail})</p>
                        <p><b>เวลา:</b> ${data.createdAt ? data.createdAt.toDate().toLocaleString('th-TH') : 'เพิ่งส่ง'}</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-reject" onclick="processAdminAction('${doc.id}', '${data.userId}', 0, 'rejected')"><i class="fas fa-times"></i> ปฏิเสธ</button>
                        <button class="btn-approve" onclick="processAdminAction('${doc.id}', '${data.userId}', ${data.gemsRequested}, 'approved')"><i class="fas fa-check"></i> อนุมัติ</button>
                    </div>
                </div>
            `;
        });
    });
}

async function processAdminAction(requestId, userId, gemsToAdd, action) {
    if (!confirm(`คุณต้องการ ${action === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} รายการนี้ใช่หรือไม่?`)) return;

    try {
        const reqRef = db.collection('topup_requests').doc(requestId);
        const userRef = db.collection('users').doc(userId);

        if (action === 'approved') {
            await userRef.update({ gems: firebase.firestore.FieldValue.increment(gemsToAdd) });
        }
        
        await reqRef.update({ status: action });
        showToast(action === 'approved' ? "✅ อนุมัติและเติม Gem สำเร็จ!" : "❌ ปฏิเสธรายการสำเร็จ");

    } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาดในการประมวลผล");
    }
}

async function submitNewPrompt(event) {
    event.preventDefault(); 
    
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึกข้อมูล...';
    btn.disabled = true;

    const categoryMap = {
        'marketing': { name: 'การตลาด', color: 'badge-marketing' },
        'education': { name: 'การเรียน', color: 'badge-education' },
        'coding': { name: 'การเขียนโค้ด', color: 'badge-coding' },
        'creative': { name: 'งานสร้างสรรค์', color: 'badge-creative' },
        'productivity': { name: 'การทำงาน', color: 'badge-productivity' },
        'image-gen': { name: 'สร้างภาพ AI', color: 'badge-creative' } 
    };

    const catId = document.getElementById('pCategory').value;
    const isPremium = document.getElementById('pIsPremium').checked;
    
    const newPrompt = {
        title: document.getElementById('pTitle').value.trim(),
        categoryId: catId,
        categoryName: categoryMap[catId].name,
        badgeColor: categoryMap[catId].color,
        description: document.getElementById('pDesc').value.trim(),
        content: document.getElementById('pContent').value.trim(),
        imageUrl: document.getElementById('pImageUrl').value.trim(),
        isPremium: isPremium,
        unlockPrice: isPremium ? parseInt(document.getElementById('pPrice').value || 0) : 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    Object.keys(newPrompt).forEach(key => {
        if (newPrompt[key] === "" || newPrompt[key] === undefined) delete newPrompt[key];
    });

    try {
        await db.collection('prompts').add(newPrompt);
        showToast("✅ เผยแพร่ Prompt ใหม่ขึ้นหน้าเว็บสำเร็จ!");
        event.target.reset();
        document.getElementById('priceZone').style.display = 'none';
    } catch (error) {
        console.error("Error adding prompt: ", error);
        alert("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลครับ");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ==========================================
// ส่วนที่ 13: ระบบ Community (แชร์ Prompt จากผู้ใช้งาน)
// ==========================================
function openShareModal() {
    if (!currentUser) return openLoginModal(); 
    document.getElementById('sharePromptModal').classList.add('show');
}

function closeShareModal() {
    document.getElementById('sharePromptModal').classList.remove('show');
    document.getElementById('userShareForm').reset();
}

async function submitCommunityPrompt(event) {
    event.preventDefault();
    if (!currentUser) return;

    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังส่ง...';
    btn.disabled = true;

    try {
        const newPrompt = {
            title: document.getElementById('shareTitle').value.trim(),
            content: document.getElementById('shareContent').value.trim(),
            categoryId: 'community',
            categoryName: 'จากทางบ้าน',
            badgeColor: 'badge-community',
            isPremium: false,
            unlockPrice: 0,
            authorName: currentUser.displayName || 'ผู้ใช้ไม่ระบุนาม',
            authorId: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('prompts').add(newPrompt);

        // แจกรางวัล 10 Gem ให้คนแชร์ตอนโพสต์สำเร็จ
        await db.collection('users').doc(currentUser.uid).update({ 
            gems: firebase.firestore.FieldValue.increment(10) 
        });
        
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        updateGemDisplay(userDoc.data().gems);

        showToast("🎉 แชร์สำเร็จ! คุณได้รับ 10 Gem");
        closeShareModal();

    } catch (error) {
        console.error("Error sharing prompt:", error);
        alert("❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// เรียกใช้งานฟังก์ชันเริ่มต้น
initAuth();
initTheme();
initNavigation();