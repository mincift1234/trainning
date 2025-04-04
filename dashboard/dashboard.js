// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyCxzx_DCSUPD1kTmnnnMEUuZYBhg0yPZak",
    authDomain: "aimlab-6012e.firebaseapp.com",
    projectId: "aimlab-6012e",
    storageBucket: "aimlab-6012e.appspot.com",
    messagingSenderId: "343012235494",
    appId: "1:343012235494:web:737ead8ba0924ff497c327",
    measurementId: "G-GX9M2QWP8F"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ 전역 변수
let currentUser = null;
let currentTrainingType = "";
let chart = null;
let trainingTitlesByType = {
    accuracy: [],
    tracking: [],
    flick: []
};
const selectedPlanId = localStorage.getItem("selectedPlanId");

// ✅ 로그인 상태 확인
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        initDashboard();
    } else {
        alert("로그인이 필요합니다.");
        window.location.href = "/index/index.html";
    }
});

// ✅ 초기화 함수
function initDashboard() {
    renderStarOnSidebar();
    setupSidebarClick();
    loadPlanSettings();
    loadScoresAndDrawGraph();
}

// ✅ 선택된 플랜에 ⭐ 표시
function renderStarOnSidebar() {
    const selected = localStorage.getItem("selectedPlanId");
    if (!selected) return;
    // 별표는 유형이 아닌 카드 내에서 구현했으므로 생략 가능
}

// ✅ 사이드바 항목 클릭 시 팝업
function setupSidebarClick() {
    document.querySelectorAll("#training-list li").forEach((li) => {
        li.addEventListener("click", () => {
            openTrainingPopup(li.dataset.type);
        });
    });
}

// ✅ 훈련 설정 팝업 열기
function openTrainingPopup(type) {
    document.getElementById("training-popup").classList.remove("hidden");
    document.getElementById("popup-title").textContent = `훈련 설정 - ${type}`;
    currentTrainingType = type;

    db.collection("users")
        .doc(currentUser.uid)
        .collection("plans")
        .doc(selectedPlanId)
        .get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                trainingTitlesByType[type] = data.titles?.[type] || [];
                document.getElementById("aimlab-time").value = data.time?.[type] || "";
            } else {
                trainingTitlesByType[type] = [];
                document.getElementById("aimlab-time").value = "";
            }
            renderTrainingTitles();
        });
}

function closeTrainingPopup() {
    document.getElementById("training-popup").classList.add("hidden");
}

// ✅ 훈련 제목 추가
function addTrainingTitle() {
    const input = document.getElementById("aimlab-title-input");
    const value = input.value.trim();
    if (!value || !currentTrainingType) return;

    trainingTitlesByType[currentTrainingType].push(value);
    input.value = "";
    renderTrainingTitles();
}

// ✅ 훈련 제목 삭제
function removeTrainingTitle(index) {
    trainingTitlesByType[currentTrainingType].splice(index, 1);
    renderTrainingTitles();
}

// ✅ 훈련 제목 리스트 렌더링
function renderTrainingTitles() {
    const list = document.getElementById("aimlab-title-list");
    list.innerHTML = "";
    const titles = trainingTitlesByType[currentTrainingType] || [];

    titles.forEach((title, i) => {
        const li = document.createElement("li");
        li.innerHTML = `
      <span>${title}</span>
      <button class="remove-title-btn" onclick="removeTrainingTitle(${i})">❌</button>
    `;
        list.appendChild(li);
    });
}

// ✅ 훈련 저장
document.getElementById("save-training").addEventListener("click", () => {
    const time = parseInt(document.getElementById("aimlab-time").value);
    const titles = trainingTitlesByType[currentTrainingType] || [];

    const updateData = {
        [`titles.${currentTrainingType}`]: titles,
        [`time.${currentTrainingType}`]: time
    };

    db.collection("users")
        .doc(currentUser.uid)
        .collection("plans")
        .doc(selectedPlanId)
        .set(updateData, { merge: true })
        .then(() => {
            alert("훈련 저장 완료!");
            closeTrainingPopup();
        });
});

// ✅ 점수 불러오기 + 그래프 그리기
function loadScoresAndDrawGraph() {
    db.collection("users")
        .doc(currentUser.uid)
        .collection("plans")
        .doc(selectedPlanId)
        .collection("scores")
        .orderBy("date")
        .get()
        .then((querySnapshot) => {
            const labels = [];
            const data = [];

            querySnapshot.forEach((doc) => {
                const scoreData = doc.data();
                const date = scoreData.date?.toDate();
                const label = date ? date.toLocaleDateString("ko-KR") : "날짜 없음";
                labels.push(label);
                data.push(scoreData.score);
            });

            drawChart(labels, data);
        });
}

// ✅ 그래프 그리기
function drawChart(labels, data) {
    const ctx = document.getElementById("scoreChart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "점수",
                    data: data,
                    backgroundColor: "rgba(54, 162, 235, 0.6)"
                }
            ]
        },
        options: {
            scales: {
                y: {
                    min: 10000,
                    max: 150000,
                    ticks: {
                        stepSize: 20000
                    }
                }
            }
        }
    });
}

// ✅ 홈으로 이동
function goHome() {
    window.location.href = "/index.html";
}

function saveScore(score) {
    db.collection("users")
        .doc(currentUser.uid)
        .collection("plans")
        .doc(selectedPlanId)
        .collection("scores")
        .add({
            score: score,
            date: firebase.firestore.Timestamp.now()
        })
        .then(() => {
            alert("점수 저장 완료");
            loadScoresAndDrawGraph(); // 그래프 다시 그림
        });
}
