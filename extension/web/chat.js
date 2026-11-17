const $ = (id) => document.getElementById(id);
const thread = $("thread");
const patchesEl = $("patches");

function add(who, text, steps) {
  const el = document.createElement("div");
  el.className = "msg " + who;
  el.innerHTML = `<div class="who">${who}</div>`;
  if (steps) steps.forEach((s) => {
    const p = document.createElement("pre");
    p.className = "step";
    p.textContent = `${s.tool}\n${(s.out || "").slice(0, 400)}`;
    el.appendChild(p);
  });
  const t = document.createElement("div");
  t.textContent = text;
  el.appendChild(t);
  thread.appendChild(el);
  thread.scrollTop = thread.scrollHeight;
}

function renderPatches(patches, runId) {
  patchesEl.innerHTML = "";
  if (!patches?.length) return;
  for (const p of patches) {
    const box = document.createElement("div");
    box.className = "patch";
    box.innerHTML = `<div>${p.path}</div><pre>${(p.diff || "").slice(0, 600)}</pre>`;
    const row = document.createElement("div");
    const ok = document.createElement("button");
    ok.textContent = "Accept";
    ok.onclick = () => vscode.postMessage({ type: "accept", patchId: p.id });
    const no = document.createElement("button");
    no.textContent = "Reject";
    no.style.marginLeft = "6px";
    no.onclick = () => vscode.postMessage({ type: "reject", patchId: p.id });
    row.append(ok, no);
    box.appendChild(row);
    patchesEl.appendChild(box);
  }
}

$("go").onclick = () => {
  const text = $("q").value.trim();
  if (!text) return;
  $("q").value = "";
  add("user", text);
  $("log").textContent = "…";
  vscode.postMessage({
    type: "chat",
    text,
    allowDangerousShell: $("danger").checked,
    reviewWrites: $("review").checked,
  });
};

window.addEventListener("message", (e) => {
  const m = e.data;
  if (m.type === "clear") {
    thread.innerHTML = "";
    patchesEl.innerHTML = "";
    $("log").textContent = "";
    return;
  }
  if (m.type === "error") {
    $("log").textContent = m.text;
    return;
  }
  if (m.type === "result") {
    add("assistant", m.text, m.steps);
    renderPatches(m.patches, m.runId);
    $("log").textContent = "";
  }
  if (m.type === "patchDone") {
    $("log").textContent = "补丁已处理";
  }
});

$("q").onkeydown = (ev) => {
  if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) $("go").click();
};
