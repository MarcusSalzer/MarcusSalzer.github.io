class g {
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
class b {
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
    const i = this.root.elements.namedItem(t);
    i && e !== void 0 && (i.value = e);
  }
}
const p = ["choice", "text", "code"];
function f(n) {
  return n !== null && p.includes(n);
}
class h {
  constructor(t) {
    this.raw = t;
  }
  render(t) {
    const e = /* @__PURE__ */ new Set();
    return this.raw.replace(/{{\s*(\w+)\s*}}/g, (o, s) => {
      if (!(s in t))
        throw new Error(`Missing fill value for "${s}"`);
      return e.add(s), t[s];
    });
  }
}
class y {
  constructor(t) {
    this.root = t, this.question = this.captureQuestionOptions(), this.toolbar = this.ensureToolbar(), this.submitBtn = this.createButton("Submit"), this.feedbackBtn = this.createButton("Feedback"), this.debugBtn = this.createButton("(debug)"), this.enableFdbkBtn(!1), this.toolbar.append(this.submitBtn, this.feedbackBtn, this.debugBtn);
  }
  question;
  toolbar;
  submitBtn;
  feedbackBtn;
  debugBtn;
  // Created when needed
  feedbackEl;
  debugEl = null;
  /* ---------------- hydration ---------------- */
  captureQuestionOptions() {
    const t = this.root.querySelector("ul");
    if (!t) throw new Error("Choice activity missing <ul>");
    const e = [];
    return t.querySelectorAll("li").forEach((i, o) => {
      const s = i.querySelector(
        "input[type=checkbox]"
      );
      if (!s) throw new Error("Option missing checkbox");
      e.push({
        index: o,
        input: s
      });
    }), { options: e };
  }
  ensureToolbar() {
    let t = this.root.querySelector(".activity-toolbar");
    return t || (t = document.createElement("div"), t.className = "activity-toolbar", this.root.appendChild(t)), t;
  }
  /**
   * Convenience for making buttons
   * @param label
   * @returns
   */
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
    this.feedbackEl || (this.feedbackEl = document.createElement("div"), this.feedbackEl.className = "activity-feedback", this.toolbar.after(this.feedbackEl)), this.feedbackEl.textContent = t, this.feedbackEl.hidden = !1, this.enableFdbkBtn(!1);
  }
  showFeedbackLoading() {
    this.feedbackEl || (this.feedbackEl = document.createElement("div"), this.feedbackEl.className = "activity-feedback loading", this.toolbar.after(this.feedbackEl)), this.feedbackEl.textContent = "Thinking…", this.feedbackEl.hidden = !1, this.enableFdbkBtn(!1);
  }
  /* ---------------- Debug Help ---------------- */
  toggleDebug(t) {
    this.debugEl ? (this.debugEl.remove(), this.debugEl = null) : (this.debugEl = document.createElement("pre"), this.debugEl.className = "activity-debug-info", this.toolbar.after(this.debugEl), this.debugEl.textContent = JSON.stringify(t, void 0, 2));
  }
}
class E {
  constructor(t, e, i, o, s) {
    if (this.meta = e, this.ai = i, this.settings = o, this.template = new h(s), this.ui = new y(t), this.ui.question.options.length !== this.meta.options_md.length)
      throw new Error("Choice: option count mismatch");
    this.ui.submitBtn.addEventListener("click", () => this.submit()), this.ui.feedbackBtn.addEventListener("click", () => this.getFdbk()), this.ui.debugBtn.addEventListener("click", () => {
      this.ui.toggleDebug({
        meta: e,
        template: s,
        historyLength: this.chatHistory.length
      });
    });
  }
  ui;
  template;
  chatHistory = [];
  async submit() {
    const t = this.ui.getAnswer(), e = t.length === this.meta.correct.length && t.every((i) => this.meta.correct.includes(i));
    e && this.ui.disable(), this.ui.showResult(e);
  }
  idsToOptMd(t) {
    return t.map((e) => this.meta.options_md[e]).join(", ");
  }
  async getFdbk() {
    const t = this.ui.getAnswer(), e = this.meta.correct, i = this.template.render({
      QUESTION: this.meta.question_md,
      OPTIONS: this.meta.options_md.join(", "),
      CORRECT: this.idsToOptMd(e),
      ANSWER: this.idsToOptMd(t)
    }), o = this.settings.load();
    if (!o) throw new Error("No ai credentials stored");
    console.log("sending to ai:", i), this.ui.showFeedbackLoading();
    const s = await this.ai.generate(
      i,
      o,
      this.chatHistory,
      this.meta.learningGoals,
      void 0
    );
    this.meta.useChatHistory && this.chatHistory.push(
      { role: "user", content: i },
      { role: "assistant", content: s.summary }
    ), this.ui.showFeedback(s.summary);
  }
}
class k {
  constructor(t) {
    this.root = t, this.toolbar = this.ensureToolbar(), this.inputEl = this.getTextInput(), this.submitBtn = this.createButton("Submit"), this.feedbackBtn = this.createButton("Feedback"), this.debugBtn = this.createButton("(debug)"), this.enableFdbkBtn(!1), this.toolbar.append(this.submitBtn, this.feedbackBtn, this.debugBtn);
  }
  toolbar;
  submitBtn;
  feedbackBtn;
  debugBtn;
  inputEl;
  // Created when needed
  feedbackEl;
  debugEl = null;
  /* ---------------- hydration ---------------- */
  ensureToolbar() {
    let t = this.root.querySelector(".activity-toolbar");
    return t || (t = document.createElement("div"), t.className = "activity-toolbar", this.root.appendChild(t)), t;
  }
  getTextInput() {
    const t = this.root.querySelector('[name="text-input"]');
    if (!t) throw new Error("missing text-input element");
    return t;
  }
  /**
   * Convenience for making buttons
   * @param label
   * @returns
   */
  createButton(t) {
    const e = document.createElement("button");
    return e.type = "button", e.textContent = t, e;
  }
  /* ---------------- interaction helpers ---------------- */
  enableFdbkBtn(t) {
    this.feedbackBtn.disabled = !t;
  }
  getAnswer() {
    return this.inputEl instanceof HTMLInputElement ? this.inputEl.value : this.inputEl.textContent;
  }
  disable() {
    this.submitBtn.disabled = !0;
  }
  showResult(t) {
    this.root.classList.toggle("correct", t), this.root.classList.toggle("incorrect", !t), this.enableFdbkBtn(!0);
  }
  showFeedback(t) {
    this.feedbackEl || (this.feedbackEl = document.createElement("div"), this.feedbackEl.className = "activity-feedback", this.toolbar.after(this.feedbackEl)), this.feedbackEl.textContent = t, this.feedbackEl.hidden = !1, this.enableFdbkBtn(!1);
  }
  showFeedbackLoading() {
    this.feedbackEl || (this.feedbackEl = document.createElement("div"), this.feedbackEl.className = "activity-feedback loading", this.toolbar.after(this.feedbackEl)), this.feedbackEl.textContent = "Thinking…", this.feedbackEl.hidden = !1, this.enableFdbkBtn(!1);
  }
  /* ---------------- Debug Help ---------------- */
  toggleDebug(t) {
    this.debugEl ? (this.debugEl.remove(), this.debugEl = null) : (this.debugEl = document.createElement("pre"), this.debugEl.className = "activity-debug-info", this.toolbar.after(this.debugEl), this.debugEl.textContent = JSON.stringify(t, void 0, 2));
  }
}
class w {
  constructor(t, e, i, o, s, r) {
    this.meta = e, this.ai = i, this.settings = o, this.template = new h(s), this.gradingTemplate = r ? new h(r) : null, this.ui = new k(t), this.ui.submitBtn.addEventListener("click", () => this.submit()), this.ui.feedbackBtn.addEventListener("click", () => this.getFdbk()), this.ui.debugBtn.addEventListener("click", () => {
      this.ui.toggleDebug({
        meta: e,
        template: s,
        historyLength: this.chatHistory.length
      });
    });
  }
  ui;
  template;
  gradingTemplate;
  chatHistory = [];
  getFdbkContext() {
    return {
      QUESTION: this.meta.question_md,
      ANSWER: this.ui.getAnswer()
    };
  }
  async submit() {
    const t = this.ui.getAnswer();
    let e = !1;
    if (this.meta.grading == "ai") {
      const i = this.gradingTemplate;
      if (!i) throw new Error("missing grading template");
      const o = i.render(this.getFdbkContext()), s = await this.askAi(o);
      console.log("AI GRADING:", s.summary), e = s.summary.toLowerCase().trim() == "correct";
    } else this.meta.grading == "normalized-exact" && (e = this.meta.correct?.toLowerCase() === t.trim().toLowerCase());
    e && this.ui.disable(), this.ui.showResult(e);
  }
  /**
   * Ask ai and update history etc
   * @param msg
   */
  async askAi(t) {
    const e = this.settings.load();
    if (!e) throw new Error("No ai credentials stored");
    const i = await this.ai.generate(
      t,
      e,
      this.chatHistory,
      this.meta.learningGoals,
      void 0
    );
    return this.meta.useChatHistory && this.chatHistory.push(
      { role: "user", content: t },
      { role: "assistant", content: i.summary }
    ), i;
  }
  async getFdbk() {
    const t = this.template.render(this.getFdbkContext());
    console.log("sending to ai:", t), this.ui.showFeedbackLoading();
    const e = await this.askAi(t);
    this.ui.showFeedback(e.summary);
  }
}
function v(n, t, e, i, o) {
  const s = o[t.prompt_key];
  if (!s)
    throw new Error("prompt template not found:" + t.prompt_key);
  switch (t.type) {
    case "choice":
      return new E(n, t, e, i, s);
    case "text":
      const r = t.prompt_key_grading ? o[t.prompt_key_grading] : null;
      return new w(
        n,
        t,
        e,
        i,
        s,
        r ?? null
      );
    default:
      throw new Error(`unsupported activity type: ${t.type}`);
  }
}
function C() {
  const n = document.querySelector("#global-options");
  if (!n)
    throw new Error("Could not find global-options element");
  const t = JSON.parse(n.textContent);
  if (!t.prompts)
    throw new Error("prompts missing from global options");
  return t;
}
function B(n) {
  const t = n.type;
  if (!f(t))
    throw new Error("unsupported activity type: " + t);
  if (t == "choice") {
    if (!n.correct) throw new Error("Choice meta missing correct");
    if (!n.options_md) throw new Error("Choice meta missing options_md");
  } else if (t == "text") {
    if (!n.grading) throw new Error("Text meta missing 'grading'");
    if (n.grading != "ai" && !n.correct)
      throw new Error("Text: non-ai grading needs 'correct'");
    if (n.grading == "ai" && !n.prompt_key_grading)
      throw new Error("Text: ai grading needs 'prompt_key_grading'");
  }
  return {
    id: Number(n.id),
    type: t,
    prompt_key: n?.prompt_key ?? t,
    question_md: n.question_md,
    useChatHistory: n.use_chat_history ?? !0,
    // activity specific:
    options_md: n.options_md,
    correct: n.correct,
    grading: n.grading,
    prompt_key_grading: n.prompt_key_grading
  };
}
function S(n, t, e, i) {
  const o = [];
  for (const s of n)
    try {
      const r = s.querySelector(
        "script.activity-meta"
      );
      if (!r) throw new Error("Missing script.activity-meta");
      const a = B(JSON.parse(r.textContent));
      o.push({
        meta: a,
        controller: v(s, a, t, e, i)
      });
    } catch (r) {
      console.error(r), s.classList.add("debug-error");
    }
  return {
    activitities: o
  };
}
const T = ({ activities: n, rawPrompts: t }) => {
  const e = n.length;
  console.log("making debug widget for: " + e);
  const i = document.createElement("div");
  i.id = "activity-debug";
  const o = document.createElement("div");
  o.textContent = `🐞 ${e} activit${e === 1 ? "y" : "ies"}`, o.addEventListener("click", () => {
    n.length ? alert(
      `Activities:
` + n.map((a) => `${a.id}: ${a.type}`).join(`
`)
    ) : alert("No activities detected");
  });
  const s = document.createElement("div"), r = Object.keys(t).length;
  return s.textContent = `${r} prompts`, s.addEventListener("click", () => {
    alert(
      r ? `Prompts:
` + Object.keys(t).map((a) => `${a}: ${t[a]}`).join(`

`) : "No prompts detected"
    );
  }), i.replaceChildren(o, s), i;
};
class c extends Error {
  constructor(t, e, i) {
    super(t), this.cause = e, this.kind = i, this.name = "AIInteractionError";
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
class A {
  constructor(t) {
    this.system_prompt = t;
  }
  /**
   * Build messages and request a response based on certain data.
   */
  async generate(t, e, i = [], o, s) {
    if (!e.model)
      throw new Error("Please choose a model first.");
    const r = `${e.baseUrl}/chat/completions`, a = {
      role: "system",
      content: this.system_prompt
    };
    o && o.length > 0 && (a.content += `
Learning goals: ${o.join(", ")}`);
    const l = {
      role: "user",
      content: t
    }, u = [
      a,
      ...i,
      l
    ];
    s && u.push({
      role: "user",
      content: s
    });
    const m = {
      messages: u,
      model: e.model
    }, d = (await (await fetch(r, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${e.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(m)
    })).json()).choices[0].message.content;
    if (typeof d != "string")
      throw new Error("weird message content: " + typeof d);
    return { summary: d };
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
    let i;
    try {
      i = await fetch(e, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${t.apiKey}`,
          "Content-Type": "application/json"
        }
      });
    } catch (o) {
      throw c.classifyNetworkError(o, t.baseUrl);
    }
    if (!i.ok)
      throw c.classifyHttpError(i);
    return (await i.json()).data;
  }
  /**
   * Send a test message to the AI
   */
  async ping(t) {
    const e = `${t.baseUrl}/chat/completions`, i = t.model;
    if (!i) throw new Error("Choose a model!");
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
      model: i
    }, s = await fetch(e, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t.apiKey}`
      },
      body: JSON.stringify(o)
    }), r = await s.json();
    if (!s.ok)
      throw new Error("message" in r ? r.message : JSON.stringify(r));
    return r.choices[0].message.content;
  }
}
const x = ({ title: n, subtitle: t = "This may take a few seconds..." }) => {
  const e = document.createElement("div");
  e.className = "spinner";
  const i = document.createElement("h1");
  i.textContent = n;
  const o = document.createElement("p");
  o.textContent = t;
  const s = document.createElement("div");
  s.className = "loader", s.replaceChildren(e, i, o);
  const r = document.createElement("div");
  return r.replaceChildren(s), r.className = "loading-fullscreen", r;
};
function N(n, t, e, i) {
  n.addEventListener("click", async () => {
    console.log("pinging AI...");
    const o = x({ title: "pinging AI" });
    document.body.appendChild(o);
    const s = e.load();
    if (!s) {
      alert("Please enter AI credentials!");
      return;
    }
    try {
      const r = await i.ping(s);
      console.log(r);
    } catch (r) {
      alert(r instanceof c ? r.message : r);
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
      const s = await i.models(o);
      console.log(s);
    } catch (s) {
      alert(s instanceof c ? s.message : s);
    }
  });
}
function F() {
  const n = C();
  console.log("global options", n);
  const t = n.prompts.system;
  t || console.error("No system prompt!");
  const e = new A(t ?? "system prompt"), i = document.querySelector("#btn-ping"), o = document.querySelector("#btn-models"), s = new g(), r = document.querySelector("#settings-form");
  if (!r) throw new Error("missing settings form");
  new b(r, s), i && o ? N(i, o, s, e) : console.warn("Some debugging button is missing");
  const a = S(
    document.querySelectorAll(".activity"),
    e,
    s,
    n.prompts
  );
  document.body.appendChild(
    T({
      activities: a.activitities.map((l) => l.meta),
      rawPrompts: n.prompts
    })
  );
}
document.addEventListener("DOMContentLoaded", F);
