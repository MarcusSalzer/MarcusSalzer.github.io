class h {
  STORAGE_KEY = "settings.ai";
  load() {
    const t = localStorage.getItem(this.STORAGE_KEY);
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  save(t) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(t));
  }
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
class m {
  constructor(t, e) {
    this.root = t, this.store = e, this.prefill(), this.bind();
  }
  bind() {
    this.root.addEventListener("submit", (t) => {
      t.preventDefault(), this.saveFromForm();
    });
  }
  prefill() {
    const t = this.store.load();
    t && (this.setValue("apiKey", t.apiKey), this.setValue("baseUrl", t.baseUrl), this.setValue("model", t.model));
  }
  /**
   * Read form data.
   */
  saveFromForm() {
    const t = new FormData(this.root);
    this.store.save({
      apiKey: t.get("apiKey"),
      baseUrl: t.get("baseUrl"),
      model: t.get("model")
    });
  }
  setValue(t, e) {
    const s = this.root.elements.namedItem(t);
    s && e !== void 0 && (s.value = e);
  }
}
class c extends Error {
  constructor(t, e, s) {
    super(t), this.cause = e, this.kind = s, this.name = "AIInteractionError";
  }
  static classifyNetworkError(t, e) {
    return e.startsWith("https://") ? new c(
      "Could not connect to the AI server. If this is a local server, try using http:// instead of https://.",
      t,
      "ssl"
    ) : new c(
      "Could not connect to the AI server. Please check the server URL and your network connection.",
      t,
      "network"
    );
  }
  static classifyHttpError(t) {
    switch (t.status) {
      case 401:
        return new c(
          "Authentication failed. Please check your API key.",
          t,
          "auth"
        );
      case 403:
        return new c(
          "The API key does not have access to this resource.",
          t,
          "auth"
        );
      default:
        return new c(
          `AI server returned ${t.status} ${t.statusText}.`,
          t,
          "server"
        );
    }
  }
}
class p {
  constructor(t) {
    this.system_prompt = t, console.log("created ai provider with system prompt:", t);
  }
  /**
   */
  async generate(t, e, s) {
    s.model || console.warn("TODO default model choice?");
    const o = `${s.baseUrl}/chat/completions`, n = {
      messages: [
        {
          role: "system",
          content: this.system_prompt + t ? `
Here the learning goals are ${t?.join(", ")}` : ""
        },
        {
          role: "user",
          content: e
        }
      ],
      model: s.model ?? "TODO default model"
    }, a = (await (await fetch(o, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${s.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(n)
    })).json()).choices[0].message.content;
    if (typeof a != "string")
      throw new Error("weird message content: " + typeof a);
    return { summary: a };
  }
  isAvailable() {
    throw new Error("Method not implemented.");
  }
  /**
   * Check which models are available
   * @returns Array of model metadata
   */
  async models(t) {
    const e = `${t.baseUrl}/models`;
    let s;
    try {
      s = await fetch(e, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${t.apiKey}`,
          "Content-Type": "application/json"
        }
      });
    } catch (o) {
      throw c.classifyNetworkError(o, t.baseUrl);
    }
    if (!s.ok)
      throw c.classifyHttpError(s);
    return await s.json();
  }
  /**
   * Send a test message to the AI
   */
  async ping(t) {
    const e = `${t.baseUrl}/chat/completions`, s = t.model;
    if (!s) throw new Error("Choose a model!");
    const o = {
      messages: [
        {
          role: "system",
          content: "You are a programming teacher, giving short answers."
        },
        {
          role: "user",
          content: "Answer in 2 sentences: Who are you?"
        }
      ],
      model: s
    }, n = await fetch(e, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t.apiKey}`
      },
      body: JSON.stringify(o)
    }), i = await n.json();
    if (!n.ok)
      throw new Error("message" in i ? i.message : JSON.stringify(i));
    return i.choices[0].message.content;
  }
}
class b {
  constructor(t) {
    this.raw = t, console.log("template:", t);
  }
  render(t) {
    const e = /* @__PURE__ */ new Set(), s = this.raw.replace(/{{\s*(\w+)\s*}}/g, (o, n) => {
      if (!(n in t))
        throw new Error(`Missing fill value for "${n}"`);
      return e.add(n), t[n];
    });
    for (const o of Object.keys(t))
      if (!e.has(o))
        throw new Error(`Unused fill value "${o}"`);
    return s;
  }
}
class g {
  constructor(t) {
    this.root = t, this.question = this.captureQuestion(), this.toolbar = this.ensureToolbar(), this.submitBtn = this.createButton("Submit"), this.feedbackBtn = this.createButton("Feedback"), this.debugBtn = this.createButton("(debug)"), this.enableFdbkBtn(!1), this.toolbar.append(this.submitBtn, this.feedbackBtn, this.debugBtn);
  }
  question;
  toolbar;
  submitBtn;
  feedbackBtn;
  debugBtn;
  // Created when needed
  feedbackEl;
  debugEl;
  /* ---------------- hydration ---------------- */
  captureQuestion() {
    const t = this.root.querySelector("p");
    if (!t) throw new Error("Choice activity missing <p> question");
    const e = this.root.querySelector("ul");
    if (!e) throw new Error("Choice activity missing <ul>");
    const s = [];
    return e.querySelectorAll("li").forEach((o, n) => {
      const i = o.querySelector(
        "input[type=checkbox]"
      );
      if (!i) throw new Error("Option missing checkbox");
      const a = o.textContent?.trim() ?? "", l = document.createElement("label");
      l.append(i.cloneNode(!0), " ", a), o.replaceChildren(l), s.push({
        index: n,
        text: a,
        input: l.querySelector("input")
      });
    }), { text: t.innerHTML, options: s };
  }
  ensureToolbar() {
    let t = this.root.querySelector(".activity-toolbar");
    return t || (t = document.createElement("div"), t.className = "activity-toolbar", this.root.appendChild(t)), t;
  }
  createButton(t) {
    const e = document.createElement("button");
    return e.type = "button", e.textContent = t, e;
  }
  /* ---------------- interaction helpers ---------------- */
  enableFdbkBtn(t) {
    this.feedbackBtn.disabled = !t;
  }
  getAnswer() {
    return this.question.options.filter((t) => t.input.checked).map((t) => t.index);
  }
  disable() {
    this.question.options.forEach((t) => t.input.disabled = !0), this.submitBtn.disabled = !0;
  }
  showResult(t) {
    this.root.classList.toggle("correct", t), this.root.classList.toggle("incorrect", !t), this.enableFdbkBtn(!0);
  }
  showFeedback(t) {
    this.feedbackEl || (console.log("create fdbk el"), this.feedbackEl = document.createElement("div"), this.feedbackEl.className = "activity-feedback", this.toolbar.after(this.feedbackEl)), this.feedbackEl.textContent = t, this.feedbackEl.hidden = !1, this.enableFdbkBtn(!1);
  }
  showFeedbackLoading() {
    this.feedbackEl || (this.feedbackEl = document.createElement("div"), this.feedbackEl.className = "activity-feedback loading", this.toolbar.after(this.feedbackEl)), this.feedbackEl.textContent = "Thinking…", this.feedbackEl.hidden = !1, this.enableFdbkBtn(!1);
  }
  /* ---------------- Debug Help ---------------- */
  showDebug(t) {
    this.debugEl || (this.debugEl = document.createElement("pre"), this.debugEl.className = "activity-debug-info", this.toolbar.after(this.debugEl)), this.debugEl.textContent = JSON.stringify(t, void 0, 2);
  }
}
class f {
  constructor(t, e, s, o, n) {
    this.meta = e, this.ai = s, this.settings = o, this.ui = new g(t), this.template = new b(n), this.ui.submitBtn.addEventListener("click", () => this.submit()), this.ui.feedbackBtn.addEventListener("click", () => this.getFdbk()), this.ui.debugBtn.addEventListener("click", () => {
      this.ui.showDebug({ meta: e, template: n });
    });
  }
  ui;
  template;
  async submit() {
    const t = this.ui.getAnswer(), e = t.length === this.meta.correct.length && t.every((s) => this.meta.correct.includes(s));
    e && this.ui.disable(), this.ui.showResult(e);
  }
  idsToOptNames(t) {
    return t.map((e) => {
      const s = this.ui.question.options[e];
      if (!s)
        throw new Error(`Invalid option id: ${e}`);
      return s.text;
    }).join(", ");
  }
  async getFdbk() {
    const t = this.ui.getAnswer(), e = this.meta.correct, s = this.template.render({
      QUESTION: this.meta.question_md,
      OPTIONS: this.meta.options_md.join(", "),
      CORRECT: this.idsToOptNames(e),
      ANSWER: this.idsToOptNames(t)
    }), o = this.settings.load();
    if (!o) throw new Error("No ai credentials stored");
    console.log("sending to ai:", s), this.ui.showFeedbackLoading();
    const n = await this.ai.generate(
      this.meta.learningGoals,
      s,
      o
    );
    this.ui.showFeedback(n.summary);
  }
}
const d = {
  // code: CodeActivityController,
  choice: f
  //   cloze: ClozeActivityController,
};
function u(r) {
  return r !== null && r in d;
}
function y(r, t, e, s, o) {
  if (!u(t.type))
    throw new Error(`unsupported activity type: ${t.type}`);
  const n = d[t.type];
  return new n(r, t, e, s, o);
}
function w() {
  const r = document.querySelector("#global-options");
  if (!r)
    throw new Error("Could not find global-options element");
  const t = JSON.parse(r.textContent);
  if (!t.prompts)
    throw new Error("prompts missing from global options");
  return t;
}
function E(r) {
  const t = r.getAttribute("data-act-id"), e = r.getAttribute("data-act-type");
  if (!t) throw new Error("missing activity id");
  if (!u(e))
    throw new Error("unsupported activity type: " + e);
  const s = r.querySelector("script.activity-meta");
  if (!s) throw new Error("Missing script.activity-meta");
  const o = JSON.parse(s.textContent);
  return {
    id: Number(t),
    type: e,
    correct: o.correct,
    question_md: o.question_md,
    options_md: o.options_md
  };
}
function v(r, t, e, s) {
  const o = [];
  for (const n of r)
    try {
      const i = E(n), a = s[i.type];
      if (!a)
        throw new Error("prompt template not found:" + i.type);
      o.push({
        meta: i,
        controller: y(n, i, t, e, a)
      });
    } catch (i) {
      console.error(i), n.classList.add("debug-error");
    }
  return {
    activitities: o
  };
}
const k = ({ activities: r, rawPrompts: t }) => {
  const e = r.length;
  console.log("making debug widget for: " + e);
  const s = document.createElement("div");
  s.id = "activity-debug";
  const o = document.createElement("div");
  o.textContent = `🐞 ${e} activit${e === 1 ? "y" : "ies"}`, o.addEventListener("click", () => {
    r.length ? alert(
      `Activities:
` + r.map((a) => `${a.id}: ${a.type}`).join(`
`)
    ) : alert("No activities detected");
  });
  const n = document.createElement("div"), i = Object.keys(t).length;
  return n.textContent = `${i} prompts`, n.addEventListener("click", () => {
    alert(
      i ? `Prompts:
` + Object.keys(t).map((a) => `${a}: ${t[a]}`).join(`

`) : "No prompts detected"
    );
  }), s.replaceChildren(o, n), s;
}, S = ({ title: r, subtitle: t = "This may take a few seconds..." }) => {
  const e = document.createElement("div");
  e.className = "spinner";
  const s = document.createElement("h1");
  s.textContent = r;
  const o = document.createElement("p");
  o.textContent = t;
  const n = document.createElement("div");
  n.className = "loader", n.replaceChildren(e, s, o);
  const i = document.createElement("div");
  return i.replaceChildren(n), i.className = "loading-fullscreen", i;
};
function C(r, t, e, s) {
  r.addEventListener("click", async () => {
    console.log("pinging AI...");
    const o = S({ title: "pinging AI" });
    document.body.appendChild(o);
    const n = e.load();
    if (!n) {
      alert("Please enter AI credentials!");
      return;
    }
    try {
      const i = await s.ping(n);
      console.log(i);
    } catch (i) {
      alert(i instanceof c ? i.message : i);
    }
    o.remove();
  }), t.addEventListener("click", async () => {
    const o = e.load();
    if (!o) {
      alert("Please enter AI credentials!");
      return;
    }
    console.log("asking for models...");
    try {
      const n = await s.models(o);
      console.log(n);
    } catch (n) {
      alert(n instanceof c ? n.message : n);
    }
  });
}
function O() {
  const r = w();
  console.log("global options", r);
  const t = r.prompts.system;
  t || console.error("No system prompt!");
  const e = new p(t ?? "system prompt"), s = document.querySelector("#btn-ping"), o = document.querySelector("#btn-models"), n = new h(), i = document.querySelector("#settings-form");
  if (!i) throw new Error("missing settings form");
  new m(i, n), s && o ? C(s, o, n, e) : console.warn("Some debugging button is missing");
  const a = v(
    document.querySelectorAll(".activity"),
    e,
    n,
    r.prompts
  );
  document.body.appendChild(
    k({
      activities: a.activitities.map((l) => l.meta),
      rawPrompts: r.prompts
    })
  );
}
document.addEventListener("DOMContentLoaded", O);
