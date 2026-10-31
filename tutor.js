// ===== Gia sư AI: gọi API trực tiếp từ trình duyệt, key lưu trong máy =====
const AI_KEY = "studyhub-ai";
const DEFAULTS = { groq: "llama-3.3-70b-versatile", gemini: "gemini-2.5-flash" };
const $ = id => document.getElementById(id);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
}

let cfg = readJson(AI_KEY, {});
const data = readJson("studyhub-data", { subjects: [] });
let history = [];  // lịch sử trò chuyện: {role: "user" | "assistant", text}

// --- Cài đặt ---
function fillSettings() {
  const p = $("provider").value, c = cfg[p] || {};
  $("key").value = c.key || "";
  $("model").value = c.model || DEFAULTS[p];
}
$("provider").value = cfg.provider || "groq";
fillSettings();
$("provider").onchange = fillSettings;
$("save").onclick = () => {
  const p = $("provider").value;
  cfg.provider = p;
  cfg[p] = { key: $("key").value.trim(), model: $("model").value.trim() || DEFAULTS[p] };
  localStorage.setItem(AI_KEY, JSON.stringify(cfg));
  $("saved").textContent = "Đã lưu ✔";
};
if (!(cfg[cfg.provider || "groq"] || {}).key) $("settings").open = true;

// --- Chọn môn để gia sư biết bạn đang học gì ---
$("subject").innerHTML = `<option value="">Môn đang hỏi: (không chọn)</option>` +
  data.subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("");

function systemPrompt() {
  let t = "Bạn là gia sư thân thiện cho học sinh lớp 9 ở Việt Nam, theo chương trình sách Kết nối tri thức và ôn thi vào lớp 10. " +
    "Giải thích từng bước, ngắn gọn, dễ hiểu. Với bài tập, hãy gợi ý từng bước và hỏi lại học sinh trước khi đưa đáp án cuối, " +
    "trừ khi học sinh xin đáp án. Viết công thức bằng chữ thường, ví dụ x^2, căn(x), a/b, không dùng LaTeX. " +
    "Trả lời bằng tiếng Việt. Nếu không chắc, hãy nói rõ là không chắc.";
  const s = data.subjects.find(x => x.id === $("subject").value);
  if (s) {
    const lessons = s.chapters.flatMap(c => c.lessons.map(l => `- ${l.title} (${l.status})`));
    t += `\nMôn đang học: ${s.name}.`;
    if (lessons.length) t += "\nCác bài học sinh đã lưu:\n" + lessons.join("\n");
  }
  return t;
}

// ===== Gọi AI =====
function apiError(status, j) {
  const m = (j.error && j.error.message) || "";
  const hint = status === 401 || status === 403 ? "Key sai hoặc chưa được cấp quyền."
    : status === 404 ? "Tên model không đúng, kiểm tra lại ở phần Cài đặt."
    : status === 429 ? "Hết lượt tạm thời. Đợi 1 phút rồi thử lại, hoặc đổi nhà cung cấp khác." : "";
  return new Error(`Lỗi ${status}. ${hint} ${m}`.trim());
}

async function callAI(sys, msgs) {
  const p = cfg.provider || "groq", c = cfg[p] || {};
  if (!c.key) throw new Error("Chưa có API key. Mở ⚙️ Cài đặt AI để dán key.");
  const model = c.model || DEFAULTS[p];
  if (p === "groq") {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + c.key },
      body: JSON.stringify({ model, temperature: 0.4,
        messages: [{ role: "system", content: sys }, ...msgs.map(m => ({ role: m.role, content: m.text }))] })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw apiError(r.status, j);
    return j.choices[0].message.content;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": c.key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] },
      contents: msgs.map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
      generationConfig: { temperature: 0.4 } })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw apiError(r.status, j);
  const parts = j.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("AI không trả lời được (có thể bị chặn nội dung). Thử hỏi lại.");
  return parts.map(x => x.text).join("");
}

// ===== Khung chat =====
function addMsg(cls, text) {
  const d = document.createElement("div");
  d.className = "msg " + cls;
  d.textContent = text;
  $("chat").appendChild(d);
  d.scrollIntoView({ block: "end" });
  return d;
}

async function ask(text) {
  addMsg("me", text);
  history.push({ role: "user", text });
  const wait = addMsg("ai", "Đang suy nghĩ...");
  try {
    // Chỉ gửi 11 tin gần nhất để tiết kiệm token
    const reply = await callAI(systemPrompt(), history.slice(-11));
    wait.textContent = reply;
    history.push({ role: "assistant", text: reply });
  } catch (e) {
    wait.textContent = e.message;
    wait.classList.add("err");
    history.pop();
  }
}

$("send").onsubmit = e => {
  e.preventDefault();
  const t = $("q").value.trim();
  if (!t) return;
  $("q").value = "";
  ask(t);
};
document.querySelectorAll(".quick button").forEach(b => {
  b.onclick = () => { $("q").value = b.dataset.p; $("q").focus(); };
});
