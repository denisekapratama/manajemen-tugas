const STORAGE_KEY = "studenthub-tasks";
const THEME_KEY = "studenthub-theme";
const $ = (id) => document.getElementById(id);
const PRIO = { tinggi: 0, sedang: 1, rendah: 2 };
const PRIO_LABEL = { tinggi: "Tinggi", sedang: "Sedang", rendah: "Rendah" };

const taskForm = $("taskForm"), taskInput = $("taskInput"), courseInput = $("courseInput");
const deadlineInput = $("deadlineInput"), prioritySelect = $("prioritySelect");
const submitBtn = $("submitBtn"), cancelEdit = $("cancelEdit");
const searchInput = $("searchInput"), filterStatus = $("filterStatus");
const taskList = $("taskList"), emptyMessage = $("emptyMessage");
const calendarGrid = $("calendarGrid"), monthLabel = $("monthLabel");
const themeToggle = $("themeToggle");

let tasks = loadTasks();
let editingId = null;
let viewDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

/* ---------- Tema ---------- */
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const dark = theme === "dark";
    $("themeText").textContent = dark ? "Gelap" : "Terang";
    themeToggle.setAttribute("aria-checked", dark);
    themeToggle.setAttribute("aria-label", dark ? "Aktifkan mode terang" : "Aktifkan mode gelap");
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}
themeToggle.addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
});

/* ---------- Helper ---------- */
const pad = (n) => String(n).padStart(2, "0");
const toKey = (y, m, d) => y + "-" + pad(m + 1) + "-" + pad(d);
function todayKey() { const d = new Date(); return toKey(d.getFullYear(), d.getMonth(), d.getDate()); }
function formatDate(key) {
    const p = key.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
function loadTasks() {
    try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(d) ? d : []; }
    catch (e) { return []; }
}
function sortedTasks() {
    return tasks.slice().sort((a, b) => {
        if (a.deadline !== b.deadline) {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return a.deadline < b.deadline ? -1 : 1;
        }
        const pa = PRIO[a.priority] ?? 1, pb = PRIO[b.priority] ?? 1;
        return pa !== pb ? pa - pb : a.id - b.id;
    });
}
function visibleTasks() {
    const q = searchInput.value.trim().toLowerCase();
    const status = filterStatus.value;
    return sortedTasks().filter((t) => {
        if (status === "belum" && t.completed) return false;
        if (status === "selesai" && !t.completed) return false;
        return q === "" || (t.name + " " + (t.course || "")).toLowerCase().includes(q);
    });
}
function refresh() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (e) {}
    renderTasks(); renderCalendar(); renderStats(); renderAlerts();
}

/* ---------- Tambah dan edit tugas ---------- */
function stopEditing() {
    editingId = null;
    taskInput.value = ""; courseInput.value = "";
    prioritySelect.value = "sedang";
    deadlineInput.value = todayKey();
    submitBtn.textContent = "Tambah";
    cancelEdit.hidden = true;
}
function startEditing(task) {
    editingId = task.id;
    taskInput.value = task.name;
    courseInput.value = task.course || "";
    deadlineInput.value = task.deadline;
    prioritySelect.value = task.priority || "sedang";
    submitBtn.textContent = "Simpan";
    cancelEdit.hidden = false;
    taskInput.focus();
}
cancelEdit.addEventListener("click", stopEditing);

taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = taskInput.value.trim(), deadline = deadlineInput.value;
    if (name === "" || deadline === "") return;

    const data = { name: name, course: courseInput.value.trim(), deadline: deadline, priority: prioritySelect.value };
    if (editingId !== null) {
        const t = tasks.find((x) => x.id === editingId);
        if (t) Object.assign(t, data);
        stopEditing();
    } else {
        tasks.push(Object.assign({ id: Date.now(), completed: false }, data));
        taskInput.value = ""; courseInput.value = "";
    }

    const p = deadline.split("-").map(Number);
    viewDate = new Date(p[0], p[1] - 1, 1);
    refresh();
});

searchInput.addEventListener("input", renderTasks);
filterStatus.addEventListener("change", renderTasks);

/* ---------- Daftar tugas ---------- */
function renderTasks() {
    taskList.innerHTML = "";
    const today = todayKey();
    const list = visibleTasks();

    list.forEach((task) => {
        const isLate = !task.completed && task.deadline < today;
        const prio = PRIO[task.priority] !== undefined ? task.priority : "sedang";

        const li = document.createElement("li");
        li.id = "task-" + task.id;
        if (task.completed) li.classList.add("done");

        const check = document.createElement("button");
        check.className = "check";
        check.textContent = "\u2713";
        check.setAttribute("aria-label", task.completed ? "Tandai belum selesai" : "Tandai selesai");
        check.addEventListener("click", () => { task.completed = !task.completed; refresh(); });

        const info = document.createElement("div");
        const name = document.createElement("div");
        name.className = "task-name";
        name.textContent = task.name;

        const meta = document.createElement("div");
        meta.className = "task-meta";
        if (task.course) {
            const tag = document.createElement("span");
            tag.className = "tag"; tag.textContent = task.course;
            meta.appendChild(tag);
        }
        const badge = document.createElement("span");
        badge.className = "prio prio-" + prio;
        badge.textContent = PRIO_LABEL[prio];
        meta.appendChild(badge);

        const date = document.createElement("span");
        date.textContent = "Tenggat " + formatDate(task.deadline);
        meta.appendChild(date);
        if (isLate) {
            const late = document.createElement("span");
            late.className = "late"; late.textContent = "Terlambat";
            meta.appendChild(late);
        }
        info.appendChild(name); info.appendChild(meta);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const edit = document.createElement("button");
        edit.className = "edit";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => {
            startEditing(task);
            taskForm.scrollIntoView({ behavior: "smooth", block: "center" });
        });

        const del = document.createElement("button");
        del.className = "del";
        del.textContent = "\u00d7";
        del.setAttribute("aria-label", "Hapus tugas");
        del.addEventListener("click", () => {
            if (editingId === task.id) stopEditing();
            tasks = tasks.filter((t) => t.id !== task.id);
            refresh();
        });

        actions.appendChild(edit); actions.appendChild(del);
        li.appendChild(check); li.appendChild(info); li.appendChild(actions);
        taskList.appendChild(li);
    });

    if (list.length === 0) {
        emptyMessage.textContent = tasks.length === 0
            ? "Belum ada tugas. Isi form di atas, atau klik tanggal di kalender."
            : "Tidak ada tugas yang cocok dengan pencarian atau filter.";
    }
    emptyMessage.style.display = list.length === 0 ? "block" : "none";
}

/* ---------- Statistik, ring, sapaan ---------- */
function renderStats() {
    const total = tasks.length;
    const done = tasks.filter((t) => t.completed).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    $("totalTasks").textContent = total;
    $("completedTasks").textContent = done;
    $("pendingTasks").textContent = total - done;
    $("percent").textContent = pct + "%";
    $("ringFg").style.strokeDashoffset = 326.73 * (1 - pct / 100);

    const today = todayKey();
    const dueToday = tasks.filter((t) => !t.completed && t.deadline === today).length;
    const late = tasks.filter((t) => !t.completed && t.deadline < today).length;
    let sub = dueToday > 0 ? "Ada " + dueToday + " tugas yang jatuh tempo hari ini." : "Tidak ada tenggat hari ini, santai dulu.";
    if (late > 0) sub += " " + late + " tugas sudah lewat tenggat.";
    $("greetingSub").textContent = sub;
}
function renderGreeting() {
    const h = new Date().getHours();
    const word = h < 4 ? "malam" : h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam";
    $("greeting").textContent = "Selamat " + word + "!";
    $("todayLabel").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/* ---------- Pengingat tenggat ---------- */
let alertsExpanded = false;

function renderAlerts() {
    const box = $("alerts");
    box.innerHTML = "";

    const today = todayKey();
    const t = new Date();
    t.setDate(t.getDate() + 1);
    const tomorrow = toKey(t.getFullYear(), t.getMonth(), t.getDate());

    const due = sortedTasks().filter((task) => !task.completed && task.deadline && task.deadline <= tomorrow);
    const LIMIT = 2;
    const shown = alertsExpanded ? due : due.slice(0, LIMIT);

    shown.forEach((task) => {
        const when = task.deadline < today ? "Terlambat" : task.deadline === today ? "Tenggat hari ini" : "Tenggat besok";

        const div = document.createElement("div");
        div.className = "alert" + (task.deadline <= today ? " urgent" : "");

        const text = document.createElement("p");
        const strong = document.createElement("strong");
        strong.textContent = when + ": ";
        text.appendChild(strong);
        text.appendChild(document.createTextNode(task.name));

        const btn = document.createElement("button");
        btn.textContent = "Tandai selesai";
        btn.addEventListener("click", () => { task.completed = true; refresh(); });

        div.appendChild(text);
        div.appendChild(btn);
        box.appendChild(div);
    });

    if (due.length > LIMIT) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "alerts-more";
        more.textContent = alertsExpanded ? "Ciutkan" : "Lihat " + (due.length - LIMIT) + " pengingat lainnya";
        more.addEventListener("click", () => { alertsExpanded = !alertsExpanded; renderAlerts(); });
        box.appendChild(more);
    }
}

/* ---------- Kalender ---------- */
function renderCalendar() {
    const year = viewDate.getFullYear(), month = viewDate.getMonth(), today = todayKey();
    monthLabel.textContent = viewDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    calendarGrid.innerHTML = "";

    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) calendarGrid.appendChild(document.createElement("div"));

    for (let day = 1; day <= daysInMonth; day++) {
        const key = toKey(year, month, day);
        const dayTasks = tasks.filter((t) => t.deadline === key);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "day" + (key === today ? " today" : "");
        if (dayTasks.length) btn.setAttribute("aria-label", day + ", " + dayTasks.length + " tugas");

        const num = document.createElement("span");
        num.textContent = day;
        const dots = document.createElement("span");
        dots.className = "dots";
        dayTasks.slice(0, 3).forEach((t) => {
            const dot = document.createElement("span");
            dot.className = "dot" + (t.completed ? " done" : "");
            dots.appendChild(dot);
        });
        btn.appendChild(num); btn.appendChild(dots);
        btn.addEventListener("click", () => onDayClick(key));
        calendarGrid.appendChild(btn);
    }
}
function onDayClick(key) {
    const dayTasks = sortedTasks().filter((t) => t.deadline === key);
    if (dayTasks.length === 0) { deadlineInput.value = key; taskInput.focus(); return; }

    if (dayTasks.some((t) => !$("task-" + t.id))) {
        searchInput.value = ""; filterStatus.value = "semua"; renderTasks();
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("task-" + dayTasks[0].id).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    dayTasks.forEach((t) => {
        const li = $("task-" + t.id);
        li.classList.add("highlight");
        setTimeout(() => li.classList.remove("highlight"), 2000);
    });
}
$("prevMonth").addEventListener("click", () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1); renderCalendar(); });
$("nextMonth").addEventListener("click", () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1); renderCalendar(); });

/* ---------- Ekspor dan impor ---------- */
$("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "studenthub-" + todayKey() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$("importBtn").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (!Array.isArray(data)) throw new Error("format");
            const clean = data
                .filter((t) => t && typeof t.name === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.deadline))
                .map((t, i) => ({
                    id: Number(t.id) || Date.now() + i,
                    name: t.name,
                    course: String(t.course || ""),
                    deadline: t.deadline,
                    priority: PRIO[t.priority] !== undefined ? t.priority : "sedang",
                    completed: Boolean(t.completed)
                }));
            if (!confirm("Ganti " + tasks.length + " tugas yang ada dengan " + clean.length + " tugas dari file ini?")) return;
            tasks = clean;
            stopEditing();
            refresh();
        } catch (err) {
            alert("File tidak bisa dibaca. Pastikan itu file hasil ekspor dari StudentHub.");
        }
    };
    reader.readAsText(file);
});

/* ---------- Timer fokus ---------- */
const BASE_TITLE = document.title;
let minutes = 25, remaining = 25 * 60, timer = null, endTime = 0, audioCtx = null;

function drawTimer() {
    const text = pad(Math.floor(remaining / 60)) + ":" + pad(remaining % 60);
    $("timerTime").textContent = text;
    $("timerStart").textContent = timer ? "Jeda" : "Mulai";
    document.title = timer ? text + " - Fokus" : BASE_TITLE;
}
function stopTimer() { clearInterval(timer); timer = null; }

function playAlarm() {
    if (!audioCtx) return;
    const start = () => {
        for (let i = 0; i < 3; i++) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "square";
            osc.frequency.value = 880;
            gain.gain.value = 0.15;
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            const t = audioCtx.currentTime + i * 0.5;
            osc.start(t);
            osc.stop(t + 0.3);
        }
    };
    audioCtx.resume().then(start).catch(start);
}

function tick() {
    remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    if (remaining === 0) {
        stopTimer();
        $("timerNote").textContent = "Selesai! Istirahat 5 menit dulu.";
        playAlarm();
        drawTimer();
        document.title = "Selesai! - " + BASE_TITLE;
        return;
    }
    drawTimer();
}

$("timerStart").addEventListener("click", () => {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) {}

    if (timer) {
        stopTimer();
        $("timerNote").textContent = "Dijeda.";
    } else {
        if (remaining === 0) remaining = minutes * 60;
        endTime = Date.now() + remaining * 1000;
        $("timerNote").textContent = "Fokus dulu sampai bunyi.";
        timer = setInterval(tick, 250);
    }
    drawTimer();
});

function changeMinutes(step) {
    if (timer) return;
    minutes = Math.min(60, Math.max(5, minutes + step));
    remaining = minutes * 60;
    drawTimer();
}
$("timerMinus").addEventListener("click", () => changeMinutes(-5));
$("timerPlus").addEventListener("click", () => changeMinutes(5));
$("timerReset").addEventListener("click", () => {
    stopTimer();
    remaining = minutes * 60;
    $("timerNote").textContent = "Satu sesi, satu tugas.";
    drawTimer();
});

/* ---------- Mulai ---------- */
let savedTheme = null;
try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
applyTheme(savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
deadlineInput.value = todayKey();
renderGreeting(); renderTasks(); renderCalendar(); renderStats(); renderAlerts(); drawTimer();
setInterval(renderAlerts, 60 * 1000);