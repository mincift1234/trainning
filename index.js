// ✅ Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCxzx_DCSUPD1kTmnnnMEUuZYBhg0yPZak",
  authDomain: "aimlab-6012e.firebaseapp.com",
  projectId: "aimlab-6012e",
  storageBucket: "aimlab-6012e.firebasestorage.app",
  messagingSenderId: "343012235494",
  appId: "1:343012235494:web:737ead8ba0924ff497c327",
  measurementId: "G-GX9M2QWP8F"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// ✅ 로그인 상태 확인
auth.onAuthStateChanged((user) => {
  const userName = document.getElementById("user-name");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const startBtn = document.getElementById("start-plan");

  if (user) {
    currentUser = user;
    userName.textContent = `${user.displayName}님`;
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    startBtn.disabled = false;
    loadUserPlans();
  } else {
    userName.textContent = "";
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    startBtn.disabled = true;

    // 🔄 로그아웃 후 자동 새로고침
    if (currentUser !== null) {
      // 로그아웃이 발생했을 때만 새로고침
      window.location.reload();
    }
    currentUser = null;
  }
});

// ✅ 로그인
document.getElementById("login-btn").addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch((err) => {
    alert("로그인 실패: " + err.message);
  });
});

// ✅ 로그아웃 (→ 자동 새로고침은 onAuthStateChanged에서 처리)
document.getElementById("logout-btn").addEventListener("click", () => {
  auth.signOut();
});

// ✅ 캐러셀
const cards = document.querySelectorAll(".card");
let currentIndex = 1;

function updateCards() {
  cards.forEach((card, idx) => {
    card.classList.remove("active");
    if (idx === currentIndex) card.classList.add("active");
  });
}

document.getElementById("left-btn").addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + cards.length) % cards.length;
  updateCards();
});

document.getElementById("right-btn").addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % cards.length;
  updateCards();
});

updateCards();

// ✅ 플랜 만들기 버튼
document.getElementById("start-plan").addEventListener("click", () => {
  const selected = cards[currentIndex].textContent;
  let type = "accuracy";
  if (selected.includes("트래킹")) type = "tracking";
  else if (selected.includes("플릭샷")) type = "flick";

  localStorage.setItem("selectedPlan", type);
  alert(`${selected} 선택됨! 대시보드로 이동합니다.`);
  window.location.href = "/dashboard/dashboard.html";
});

// ✅ 내가 만든 플랜 불러오기 (카드형 UI로 개선)
function loadUserPlans() {
  if (!currentUser) return;

  db.collection("users")
    .doc(currentUser.uid)
    .collection("plans")
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) return;

      document.querySelector(".user-plans-container").classList.remove("hidden");
      const list = document.getElementById("user-plans-list");
      list.classList.add("plan-list");
      list.innerHTML = "";

      querySnapshot.forEach((doc) => {
        const planType = doc.id; // accuracy, tracking, flick
        const data = doc.data();

        const card = document.createElement("div");
        card.className = "plan-card";
        card.innerHTML = `
          <div class="plan-title">${data.title}</div>
          <div class="plan-type">(${planType})</div>
        `;

        card.addEventListener("click", () => {
          localStorage.setItem("selectedPlan", planType);
          window.location.href = "/dashboard/dashboard.html";
        });

        list.appendChild(card);
      });
    });
}
