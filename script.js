// ==========================================
// ส่วนที่ 1-3: ระบบแจ้งเตือน, คัดลอก, กรองหมวดหมู่
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
        if (currentUser && !rewardedPrompts.has(promptId)) {
            await db.collection('users').doc(currentUser.uid).update({ gems: firebase.firestore.FieldValue.increment(5) });
            rewardedPrompts.add(promptId);
            showToast(`คัดลอกสำเร็จ! ได้รับ 5 Gem 💎`);
        } else {
            showToast("คัดลอกสำเร็จ!");
        }
    } catch (e) { alert("คัดลอกไม่ได้ครับ"); }
}

function filterCategory(category, button) {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    document.querySelectorAll('.prompt-card').forEach(card => {
        const cat = card.getAttribute('data-category');
        const id = card.getAttribute('data-id');
        if (category === 'all') card.style.display = 'block';
        else if (category === 'favorites') card.style.display = currentFavorites.includes(id) ? 'block' : 'none';
        else card.style.display = cat === category ? 'block' : 'none';
    });
}

// ==========================================
// ส่วนที่ 4-7: โหลดข้อมูล, ค้นหา, ธีม, ปุ่มกลับบนสุด
// ==========================================
async function loadPrompts() {
    const response = await fetch('database.json');
    const promptsData = await response.json();
    const container = document.getElementById('prompt-container');
    container.innerHTML = '';
    promptsData.forEach(item => {
        const isFavorited = currentFavorites.includes(item.id);
        const isUnlocked = unlockedPrompts.includes(item.id);
        const isPremium = item.isPremium;
        
        const cardHTML = `
            <div class="prompt-card ${isPremium && !isUnlocked ? 'premium' : ''}" data-category="${item.categoryId}" data-id="${item.id}">
                ${(isPremium && !isUnlocked) ? `<div class="lock-overlay"><i class="fas fa-lock"></i><button class="btn-confirm" onclick="unlockPrompt('${item.id}', ${item.unlockPrice})">ปลดล็อก ${item.unlockPrice} Gem</button></div>` : ''}
                <button class="btn-favorite ${isFavorited ? 'active' : ''}" onclick="toggleFavorite('${item.id}', this)"><i class="${isFavorited ? 'fas fa-heart' : 'far fa-heart'}"></i></button>
                <div class="${(isPremium && !isUnlocked) ? 'premium-blur' : ''}">
                    <h3>${item.title}</h3>
                    <p class="prompt-box" id="${item.id}-text">${item.content}</p>
                </div>
                <button onclick="copyPrompt('${item.id}-text', this)" class="btn-copy">คัดลอกคำสั่ง</button>
            </div>
        `;
        container.innerHTML += cardHTML;
    });
}

function initTheme() {
    const btn = document.getElementById('themeToggle');
    btn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });
}

// ==========================================
// ส่วนที่ 8-10: Backend (Firebase) & ระบบปลดล็อก
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

function initAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            const doc = await db.collection('users').doc(user.uid).get();
            
            if (!doc.exists) {
                // กรณีผู้ใช้ใหม่
                await db.collection('users').doc(user.uid).set({ gems: 100, favorites: [], unlockedPrompts: [] });
                updateGemDisplay(100);
            } else {
                // กรณีผู้ใช้เก่าที่มีข้อมูลอยู่แล้ว
                const userData = doc.data();
                updateGemDisplay(userData.gems);
                currentFavorites = userData.favorites || [];
                unlockedPrompts = userData.unlockedPrompts || [];

                // ==========================================
                // 👑 สเตปเสริม: เช็คสิทธิ์และโชว์มงกุฎให้แอดมิน วางตรงนี้ครับ!
                // ==========================================
                if (userData.role === 'admin') {
                    // 1. โชว์แจ้งเตือนให้แอดมินรู้ตัวว่าล็อกอินสำเร็จด้วยสิทธิ์พิเศษ
                    showToast("ล็อกอินสำเร็จ! ยินดีต้อนรับท่าน Admin 👑");
                    
                    // 2. หากในอนาคตคุณมีปุ่มโชว์ชื่อผู้ใช้บนแถบเมนู (Navbar) 
                    // คุณสามารถสั่งให้เติมมงกุฎต่อท้ายชื่อได้ด้วยโค้ดแบบนี้ครับ:
                    // document.getElementById('userNameDisplay').innerText = "Admin 👑";
                }
                // ==========================================
            }
            document.getElementById('loginBtn').style.display = 'none';
        } else {
            currentUser = null;
            updateGemDisplay(0);
        }
        loadPrompts();
    });
}

function updateGemDisplay(gems) {
    const el = document.getElementById('gemCountDisplay');
    if(el) el.innerHTML = `<i class="fas fa-gem"></i> Gem ของฉัน: ${gems}`;
}

// เรียกใช้งานระบบ
initAuth();
initTheme();
loadPrompts();

// ==========================================
// ประตูลับสำหรับ Admin (ล็อกอินด้วย Email/Password)
// ==========================================
function loginAsAdmin() {
    const email = prompt("🔒 ประตูลับ Admin\nกรุณากรอก Email:");
    if (!email) return; // ถ้ายกเลิกให้หยุดทำงาน
    
    const password = prompt("🔑 กรุณากรอกรหัสผ่าน:");
    if (!password) return; // ถ้ายกเลิกให้หยุดทำงาน

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("✅ ยินดีต้อนรับท่าน Admin!");
            closeLoginModal();
            // เด้งไปหน้า Gem เพื่อดูแต้ม 9999 ทันที
            document.getElementById('gemsLink').click(); 
        })
        .catch((error) => {
            alert("❌ ล็อกอินล้มเหลว: รหัสผ่านผิด หรืออีเมลไม่ถูกต้อง");
            console.error(error);
        });
}