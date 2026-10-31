// ===== Lưu dữ liệu trong trình duyệt (localStorage) =====
const KEY = "studyhub-data";
// Ngày thi dự kiến. Tháng đếm từ 0 nên 5 = tháng 6. Sửa khi biết ngày chính xác
const EXAM_DATE = new Date(2027, 5, 1);
const STATUSES = ["Chưa học", "Đang học", "Đã học", "Cần ôn lại"];
const SEED = ["Toán", "Ngữ văn", "Tiếng Anh", "KHTN", "Lịch sử", "Địa lí", "GDCD",
  "GDĐP", "Công nghệ", "Tin học", "Giáo dục thể chất", "Mĩ thuật", "Âm nhạc", "HĐTN", "AI"];

const root = document.getElementById("app");
let state = load();
let view = { page: "home", subjectId: null };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // Lần đầu mở app: tạo sẵn các môn theo thời khoá biểu
  return { subjects: SEED.map(name => ({ id: uid(), name, chapters: [] })) };
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function esc(s) {
  // Chống chèn mã HTML lạ vào trang
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function ytId(url) {
  // Lấy mã video 11 ký tự từ link YouTube
  const m = /(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/.exec(url || "");
  return m ? m[1] : null;
}
function daysLeft() { return Math.ceil((EXAM_DATE - new Date()) / 86400000); }
function findSubject(id) { return state.subjects.find(s => s.id === id); }

// ===== Vẽ giao diện =====
function render() {
  root.innerHTML = view.page === "home" ? homeHtml() : subjectHtml();
}

function homeHtml() {
  const items = state.subjects.map(s => `
    <div class="item">
      <a href="#" data-act="open" data-id="${s.id}">${esc(s.name)}</a>
      <button data-act="del-subject" data-id="${s.id}">Xóa</button>
    </div>`).join("") || `<div class="empty">Chưa có môn nào. Hãy thêm môn đầu tiên!</div>`;
  return `<h1>StudyHub</h1>
    <p>⏳ Còn <b>${daysLeft()}</b> ngày đến kỳ thi vào lớp 10 (dự kiến tháng 6/2027)</p>
    <a href="tutor.html" style="display:block;margin-bottom:12px">🤖 Gia sư AI</a>
    <form class="add" data-form="add-subject">
      <input name="name" placeholder="Tên môn học (vd: Toán)" required>
      <button>Thêm</button>
    </form>${items}`;
}

function subjectHtml() {
  const s = findSubject(view.subjectId);
  if (!s) { view.page = "home"; return homeHtml(); }
  let total = 0, done = 0;
  const chapters = s.chapters.map(c => {
    const lessons = c.lessons.map(l => {
      total++;
      if (l.status === "Đã học") done++;
      const id = ytId(l.url);
      const video = id
        ? `<div class="video"><iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe></div>`
        : (l.url ? `<a href="${esc(l.url)}" target="_blank">Mở link</a>` : "");
      const opts = STATUSES.map(t => `<option ${t === l.status ? "selected" : ""}>${t}</option>`).join("");
      return `<div class="lesson">
        <div class="row"><span>${esc(l.title)}</span>
          <button data-act="del-lesson" data-id="${l.id}" data-cid="${c.id}">Xóa</button></div>
        <select data-act="status" data-id="${l.id}" data-cid="${c.id}">${opts}</select>
        ${video}</div>`;
    }).join("");
    return `<div class="chapter">
      <div class="row"><b>${esc(c.name)}</b>
        <button data-act="del-chapter" data-id="${c.id}">Xóa chương</button></div>
      ${lessons}
      <form class="lessonform" data-form="add-lesson" data-id="${c.id}">
        <input name="title" placeholder="Tên bài học" required>
        <input name="url" placeholder="Link YouTube (không bắt buộc)">
        <button>Thêm bài</button></form></div>`;
  }).join("") || `<div class="empty">Chưa có chương nào. Hãy thêm chương đầu tiên!</div>`;
  return `<a href="#" data-act="home">← Về trang chủ</a>
    <h1>${esc(s.name)}</h1><p>Đã học <b>${done}/${total}</b> bài</p>
    <form class="add" data-form="add-chapter">
      <input name="name" placeholder="Tên chương (vd: Chương 1)" required>
      <button>Thêm chương</button></form>${chapters}`;
}

// ===== Xử lý khi bấm nút =====
root.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el || el.tagName === "SELECT") return;
  const act = el.dataset.act, id = el.dataset.id;
  const s = findSubject(view.subjectId);
  if (act === "open") { e.preventDefault(); view = { page: "subject", subjectId: id }; }
  else if (act === "home") { e.preventDefault(); view = { page: "home", subjectId: null }; }
  else if (act === "del-subject") {
    if (!confirm("Xóa môn này và toàn bộ nội dung bên trong?")) return;
    state.subjects = state.subjects.filter(x => x.id !== id);
  } else if (act === "del-chapter") {
    if (!confirm("Xóa chương này và các bài trong đó?")) return;
    s.chapters = s.chapters.filter(c => c.id !== id);
  } else if (act === "del-lesson") {
    const c = s.chapters.find(c => c.id === el.dataset.cid);
    c.lessons = c.lessons.filter(l => l.id !== id);
  } else return;
  save(); render();
});

root.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.act !== "status") return;
  const c = findSubject(view.subjectId).chapters.find(c => c.id === el.dataset.cid);
  c.lessons.find(l => l.id === el.dataset.id).status = el.value;
  save(); render();
});

root.addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target, d = new FormData(f), kind = f.dataset.form;
  const s = findSubject(view.subjectId);
  if (kind === "add-subject") {
    state.subjects.push({ id: uid(), name: d.get("name").trim(), chapters: [] });
  } else if (kind === "add-chapter") {
    s.chapters.push({ id: uid(), name: d.get("name").trim(), lessons: [] });
  } else if (kind === "add-lesson") {
    s.chapters.find(c => c.id === f.dataset.id).lessons.push({
      id: uid(), title: d.get("title").trim(), url: d.get("url").trim(), status: "Chưa học" });
  }
  save(); render();
});

render();

// Đăng ký service worker để app chạy được khi không có mạng
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
