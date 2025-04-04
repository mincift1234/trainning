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

const selectedPlanId = localStorage.getItem("selectedPlanId");

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let scoreChart = null;

// ⭐ 플랜 항목 별 표시
document.addEventListener("DOMContentLoaded", () => {
    const selected = localStorage.getItem("selectedPlan");
    if (selected) {
        document.querySelectorAll("#training-list li").forEach((li) => {
            const type = li.dataset.type;
            const star = li.querySelector(".star");
            if (star) {
                star.textContent = type === selected ? "⭐" : "";
            }
        });
    }
});

// 로그인 확인
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadScoresAndDrawChart();
    } else {
        alert("로그인이 필요합니다.");
        window.location.href = "index.html";
    }
});

// 달력 렌더링
document.addEventListener("DOMContentLoaded", function () {
    const calendarEl = document.getElementById("calendar");
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        selectable: true,
        height: "auto",
        dateClick: function (info) {
            openPopup(info.dateStr);
        }
    });
    calendar.render();
});

// 점수 팝업 열기
function openPopup(date) {
    const popup = document.getElementById("popup");
    popup.classList.remove("hidden");
    popup.dataset.date = date;

    document.getElementById("accuracy").value = "";
    document.getElementById("tracking").value = "";
    document.getElementById("flick").value = "";

    if (!currentUser || !selectedPlanId) return;

    db.collection("users")
        .doc(currentUser.uid)
        .collection("plans")
        .doc(selectedPlanId)
        .collection("scores")
        .doc(date)
        .get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById("accuracy").value = data.accuracy;
                document.getElementById("tracking").value = data.tracking;
                document.getElementById("flick").value = data.flick;
            }
        })
        .catch((err) => {
            console.error("점수 로딩 오류", err);
        });
}

// 점수 팝업 닫기
document.getElementById("close-popup").addEventListener("click", () => {
    document.getElementById("popup").classList.add("hidden");
});

// 점수 저장
document.getElementById("save-score").addEventListener("click", () => {
    const date = document.getElementById("popup").dataset.date;
    const accuracy = parseInt(document.getElementById("accuracy").value);
    const tracking = parseInt(document.getElementById("tracking").value);
    const flick = parseInt(document.getElementById("flick").value);

    if (!currentUser || !selectedPlanId) return alert("로그인이 필요합니다.");

    db.collection("users")
        .doc(currentUser.uid)
        .collection("plans")
        .doc(selectedPlanId)
        .collection("scores")
        .doc(date)
        .set({ date, accuracy, tracking, flick })
        .then(() => {
            alert("✅ 점수 저장 완료!");
            document.getElementById("popup").classList.add("hidden");
            loadScoresAndDrawChart(); // ← 아래도 수정 필요
        })
        .catch((err) => {
            console.error("❌ 저장 실패", err);
            alert("저장 중 오류가 발생했습니다.");
        });
});

// 드롭다운 변경 시 그래프 갱신
document.getElementById("mode-select").addEventListener("change", () => {
    loadScoresAndDrawChart();
});

// 점수 불러와서 그래프 그리기
function loadScoresAndDrawChart() {
    if (!currentUser) return;

    db.collection("users")
        .doc(currentUser.uid)
        .collection("scores")
        .orderBy("date")
        .get()
        .then((querySnapshot) => {
            const dates = [];
            const accuracyData = [];
            const trackingData = [];
            const flickData = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                dates.push(data.date);
                accuracyData.push(data.accuracy);
                trackingData.push(data.tracking);
                flickData.push(data.flick);
            });

            const mode = document.getElementById("mode-select").value;
            drawSingleBarChart(dates, accuracyData, trackingData, flickData, mode);
            analyzeRoutine(accuracyData, trackingData, flickData);
        });
}

// 평균선 Plugin
const averageLinePlugin = {
    id: "annotationLine",
    beforeDraw: (chart, args, options) => {
        const { average } = options;
        if (!average) return;

        const yScale = chart.scales.y;
        const yValue = yScale.getPixelForValue(average);
        const ctx = chart.ctx;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(chart.chartArea.left, yValue);
        ctx.lineTo(chart.chartArea.right, yValue);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.fillStyle = "red";
        ctx.fillText(`평균: ${Math.round(average)}`, chart.chartArea.left + 10, yValue - 6);
        ctx.restore();
    }
};

// 그래프 그리기
function drawSingleBarChart(labels, accuracy, tracking, flick, mode) {
    const ctx = document.getElementById("scoreChart").getContext("2d");
    if (scoreChart) scoreChart.destroy();

    let data = [],
        label = "",
        color = "";
    if (mode === "accuracy") {
        data = accuracy;
        label = "정확도";
        color = "rgba(0,123,255,0.7)";
    } else if (mode === "tracking") {
        data = tracking;
        label = "트래킹";
        color = "rgba(40,167,69,0.7)";
    } else if (mode === "flick") {
        data = flick;
        label = "플릭샷";
        color = "rgba(220,53,69,0.7)";
    }

    const average = data.reduce((a, b) => a + b, 0) / data.length;

    scoreChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{ label, data, backgroundColor: color }]
        },
        scales: {
            y: {
                beginAtZero: false,
                min: 10000,
                max: 150000,
                ticks: {
                    stepSize: 20000,
                    callback: function (value) {
                        return value.toLocaleString();
                    }
                }
            }
        },
        plugins: [averageLinePlugin]
    });
}

// AI 루틴 분석
function analyzeRoutine(accuracy, tracking, flick) {
    const routineBox = document.getElementById("ai-routine");
    if (accuracy.length < 2) return;

    const diff = (arr) => arr[arr.length - 1] - arr[0];
    const suggestions = [];

    if (diff(accuracy) < 0) suggestions.push("정확도가 감소했어요. 정확도 훈련에 더 집중하세요.");
    if (diff(tracking) < 0) suggestions.push("트래킹이 떨어졌어요. 움직이는 타겟을 연습해보세요.");
    if (diff(flick) < 0) suggestions.push("플릭샷이 낮아졌어요. 빠른 반응 훈련이 필요해요.");

    routineBox.innerHTML = suggestions.length
        ? `<ul>${suggestions.map((s) => `<li>${s}</li>`).join("")}</ul>`
        : `<p>👍 모든 영역이 안정적으로 향상되고 있어요!</p>`;
}

// 🟨 각 항목 클릭 시 AimLab 트레이닝 입력 팝업
let currentTrainingType = "";

document.querySelectorAll("#training-list li").forEach((li) => {
    li.addEventListener("click", () => {
        currentTrainingType = li.dataset.type;
        openTrainingPopup(currentTrainingType);
    });
});

function openTrainingPopup(type) {
    document.getElementById("training-popup").classList.remove("hidden");
    document.getElementById("popup-title").textContent = `훈련 설정 - ${type}`;
    currentTrainingType = type;

    if (!currentUser) return;

    db.collection("users")
        .doc(currentUser.uid)
        .collection("plans")
        .doc(selectedPlanId) // ⬅ 이걸로 수정
        .get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById("aimlab-time").value = data.time || "";
                trainingTitlesByType[type] = data.titles || [];
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

document.getElementById("save-training").addEventListener("click", () => {
    const time = parseInt(document.getElementById("aimlab-time").value);
    const titles = trainingTitlesByType[currentTrainingType] || [];

    if (!currentUser || !currentTrainingType) return;

    db.collection("users")
        .doc(currentUser.uid)
        .collection("plans")
        .doc(selectedPlanId) // ⬅ 이걸로 수정
        .set({ titles, time })
        .then(() => {
            alert("훈련 저장 완료!");
            closeTrainingPopup();
        });
});

function goHome() {
    window.location.href = "/index.html";
}

let trainingTitlesByType = {
    accuracy: [],
    tracking: [],
    flick: []
};

function addTrainingTitle() {
    const input = document.getElementById("aimlab-title-input");
    const value = input.value.trim();
    if (!value || !currentTrainingType) return;

    trainingTitlesByType[currentTrainingType].push(value);
    input.value = "";
    renderTrainingTitles();
}

function removeTrainingTitle(index) {
    trainingTitlesByType[currentTrainingType].splice(index, 1);
    renderTrainingTitles();
}

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
