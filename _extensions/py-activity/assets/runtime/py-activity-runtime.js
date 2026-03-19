class b {
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
class f {
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
const y = ["choice", "text", "code"];
function E(n) {
  return n !== null && y.includes(n);
}
class m {
  el;
  ai;
  settings;
  storage;
  chatHistory = [];
  feedbackIndex = -1;
  // default: show latest
  // some constants
  autoSave = !0;
  maxHistoryLength = 4;
  constructor(t) {
    this.el = t.el, this.ai = t.ai, this.settings = t.settings, this.storage = t.storage;
  }
  /**
   * Init logic that needs to run after constructor is finished
   */
  async init() {
    this.ui.submitBtn.addEventListener("click", () => this.submit()), this.ui.feedbackBtn.addEventListener("click", () => this.getFdbk()), this.ui.clearHistBtn.addEventListener("click", () => this.clearHistory()), await this.loadState();
  }
  getPageId() {
    return this.el.ownerDocument.URL;
  }
  /**
   * Load the activity state from storage service
   */
  async loadState() {
    const t = await this.storage.load(this.getPageId(), this.meta.id);
    t && (console.log("LOADED STATE", t), this.chatHistory = t.chatHistory, this.feedbackIndex = -1, this.chatHistory && this.refreshFeedbackUI());
  }
  /**
   * Save the activity state to storage service
   */
  async persistState(t) {
    await this.storage.save(this.getPageId(), this.meta.id, {
      chatHistory: this.chatHistory,
      status: t ?? "in-progress",
      updatedAt: Date.now()
    }), console.log(`SAVED STATE:${this.chatHistory.length} chats`);
  }
  // --- logic for feedback below ---
  /**
   * Get only feedback from history
   */
  assistantHistory() {
    return this.chatHistory.filter((t) => t.role === "assistant");
  }
  /**
   * Get a feeback to show
   */
  currentFeedback() {
    const t = this.assistantHistory();
    return t.length === 0 ? null : (this.feedbackIndex === -1 && (this.feedbackIndex = t.length - 1), t[this.feedbackIndex]);
  }
  stepFeedback(t) {
    const e = this.assistantHistory();
    return e.length === 0 ? null : (this.feedbackIndex = Math.max(
      0,
      Math.min(e.length - 1, this.feedbackIndex + t)
    ), e[this.feedbackIndex]);
  }
  refreshFeedbackUI() {
    const t = this.assistantHistory();
    t.length == 0 && this.ui.removeFdbk();
    const e = this.currentFeedback();
    e && this.ui.showFeedbackTurn(
      e,
      this.feedbackIndex,
      t.length,
      () => {
        this.stepFeedback(-1) && this.refreshFeedbackUI();
      },
      () => {
        this.stepFeedback(1) && this.refreshFeedbackUI();
      }
    );
  }
  clearHistory() {
    confirm("clear history?") && (this.chatHistory.length = 0, this.feedbackIndex = -1, this.refreshFeedbackUI(), this.persistState());
  }
}
class u {
  constructor(t) {
    this.raw = t;
  }
  render(t) {
    const e = /* @__PURE__ */ new Set();
    return this.raw.replace(/{{\s*(\w+)\s*}}/g, (o, i) => {
      if (!(i in t))
        throw new Error(`Missing fill value for "${i}"`);
      return e.add(i), t[i];
    });
  }
}
const k = (n) => {
  const t = document.createElement("div");
  if (t.className = "activity-feedback", n.causedBy) {
    const a = document.createElement("div");
    a.className = "feedback-cause", a.textContent = `${n.causedBy}`, t.append(a);
  }
  const e = document.createElement("div");
  e.className = "feedback-body", e.textContent = n.text, t.append(e);
  const s = document.createElement("div");
  s.className = "feedback-nav";
  const o = document.createElement("button");
  o.textContent = "←", o.disabled = !n.onPrev, n.onPrev && (o.onclick = n.onPrev);
  const i = document.createElement("button");
  i.textContent = "→", i.disabled = !n.onNext, n.onNext && (i.onclick = n.onNext);
  const r = document.createElement("span");
  return r.className = "feedback-counter", r.textContent = `${n.index + 1}/${n.count}`, s.append(o, i, r), t.append(s), t;
};
class g {
  constructor(t) {
    this.root = t, this.toolbar = this.ensureToolbar(), this.submitBtn = this.createButton("Submit"), this.feedbackBtn = this.createButton("Feedback"), this.clearHistBtn = this.createButton("Clear history"), this.debugBtn = this.createButton("(debug)"), this.enableFdbkBtn(!1), this.toolbar.append(
      this.submitBtn,
      this.feedbackBtn,
      this.clearHistBtn,
      this.debugBtn
    );
  }
  toolbar;
  submitBtn;
  feedbackBtn;
  debugBtn;
  clearHistBtn;
  // Created when needed
  feedbackEl = null;
  debugEl = null;
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
  showFeedbackLoading() {
    this.feedbackEl || (this.feedbackEl = document.createElement("div"), this.feedbackEl.className = "activity-feedback loading", this.toolbar.after(this.feedbackEl)), this.feedbackEl.textContent = "Thinking…", this.feedbackEl.hidden = !1, this.enableFdbkBtn(!1);
  }
  enableFdbkBtn(t) {
    this.feedbackBtn.disabled = !t;
  }
  /* ---------------- Debug Help ---------------- */
  toggleDebug(t) {
    this.debugEl ? (this.debugEl.remove(), this.debugEl = null) : (this.debugEl = document.createElement("pre"), this.debugEl.className = "activity-debug-info", this.toolbar.after(this.debugEl), this.debugEl.textContent = JSON.stringify(t, void 0, 2));
  }
  /**
   * Show a feedback message
   * @param turn A chat message from the assistant
   * @param index number in history
   * @param total number of available feedback messages
   * @param onPrev step callback
   * @param onNext step callback
   */
  showFeedbackTurn(t, e, s, o, i) {
    const r = k({
      text: t.content,
      causedBy: t.causedBy,
      index: e,
      count: s,
      onPrev: e > 0 ? o : null,
      onNext: e < s - 1 ? i : null
    });
    this.feedbackEl ? this.feedbackEl.replaceWith(r) : this.toolbar.after(r), this.feedbackEl = r, this.feedbackEl.hidden = !1, this.enableFdbkBtn(!1);
  }
  removeFdbk() {
    this.feedbackEl?.remove(), this.feedbackEl = null;
  }
}
class w extends g {
  question;
  constructor(t) {
    super(t), this.question = this.captureQuestionOptions();
  }
  /* ---------------- hydration ---------------- */
  captureQuestionOptions() {
    const t = this.root.querySelector("ul");
    if (!t) throw new Error("Choice activity missing <ul>");
    const e = [];
    return t.querySelectorAll("li").forEach((s, o) => {
      const i = s.querySelector(
        "input[type=checkbox]"
      );
      if (!i) throw new Error("Option missing checkbox");
      e.push({
        index: o,
        input: i
      });
    }), { options: e };
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
}
class v extends m {
  constructor(t, e, s) {
    if (super(t), this.meta = e, this.template = new u(s), this.ui = new w(this.el), this.ui.question.options.length !== this.meta.options_md.length)
      throw new Error("Choice: option count mismatch");
    this.ui.debugBtn.addEventListener("click", () => {
      this.ui.toggleDebug({
        meta: e,
        template: s,
        historyLength: this.chatHistory.length
      });
    });
  }
  ui;
  template;
  async submit() {
    const t = this.ui.getAnswer(), e = t.length === this.meta.correct.length && t.every((s) => this.meta.correct.includes(s));
    e && this.ui.disable(), this.ui.showResult(e);
  }
  idsToOptMd(t) {
    return t.map((e) => this.meta.options_md[e]).join(", ");
  }
  async getFdbk() {
    const t = this.ui.getAnswer(), e = this.meta.correct, s = this.idsToOptMd(t), o = this.template.render({
      QUESTION: this.meta.question_md,
      OPTIONS: this.meta.options_md.join(", "),
      CORRECT: this.idsToOptMd(e),
      ANSWER: s
    }), i = this.settings.load();
    if (!i) throw new Error("No ai credentials stored");
    this.ui.showFeedbackLoading();
    const r = this.chatHistory.slice(-this.maxHistoryLength), a = await this.ai.generate(
      o,
      i,
      r,
      this.meta.learningGoals,
      void 0
    );
    this.meta.useChatHistory && this.chatHistory.push(
      { role: "user", content: o },
      { role: "assistant", content: a.summary, causedBy: s }
    ), this.autoSave && this.persistState(), this.feedbackIndex = -1, this.refreshFeedbackUI();
  }
}
class S extends g {
  inputEl;
  constructor(t) {
    super(t), this.inputEl = this.getTextInput();
  }
  getTextInput() {
    const t = this.root.querySelector('[name="text-input"]');
    if (!t) throw new Error("missing text-input element");
    return t;
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
  /* ---------------- Debug Help ---------------- */
  toggleDebug(t) {
    this.debugEl ? (this.debugEl.remove(), this.debugEl = null) : (this.debugEl = document.createElement("pre"), this.debugEl.className = "activity-debug-info", this.toolbar.after(this.debugEl), this.debugEl.textContent = JSON.stringify(t, void 0, 2));
  }
}
class x extends m {
  constructor(t, e, s, o) {
    super(t), this.meta = e, this.template = new u(s), this.gradingTemplate = o ? new u(o) : null, this.ui = new S(this.el), this.ui.debugBtn.addEventListener("click", () => {
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
      this.ui.showFeedbackLoading();
      const s = this.gradingTemplate;
      if (!s) throw new Error("missing grading template");
      const o = s.render(this.getFdbkContext()), i = await this.askAi(o);
      console.log("AI GRADING:", i.summary), e = i.summary.toLowerCase().trim() == "correct";
    } else this.meta.grading == "normalized-exact" && (e = this.meta.correct?.toLowerCase() === t.trim().toLowerCase());
    e && this.ui.disable(), this.ui.showResult(e);
  }
  /**
   * Ask ai and update history etc
   * @param msg
   */
  async askAi(t, e) {
    const s = this.settings.load();
    if (!s) throw new Error("No ai credentials stored");
    const o = this.chatHistory.slice(-this.maxHistoryLength), i = await this.ai.generate(
      t,
      s,
      o,
      this.meta.learningGoals,
      void 0
    );
    return this.meta.useChatHistory && this.chatHistory.push(
      { role: "user", content: t },
      { role: "assistant", content: i.summary, causedBy: e }
    ), i;
  }
  async getFdbk() {
    const t = this.getFdbkContext(), e = this.template.render(t);
    this.ui.showFeedbackLoading(), await this.askAi(e, t.ANSWER), this.autoSave && this.persistState(), this.feedbackIndex = -1, this.refreshFeedbackUI();
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
function I(n) {
  const t = n.id, e = n.type;
  if (!t) throw new Error("missing actId");
  if (!E(e))
    throw new Error(`Activity ${t}: bad activity type: '${e}'`);
  if (e == "choice") {
    if (!n.correct) throw new Error("Choice meta missing correct");
    if (!n.options_md) throw new Error("Choice meta missing options_md");
  } else if (e == "text") {
    if (!n.grading) throw new Error("Text meta missing 'grading'");
    if (n.grading != "ai" && !n.correct)
      throw new Error("Text: non-ai grading needs 'correct'");
    if (n.grading == "ai" && !n.prompt_key_grading)
      throw new Error("Text: ai grading needs 'prompt_key_grading'");
  }
  return {
    id: t,
    type: e,
    prompt_key: n?.prompt_key ?? e,
    question_md: n.question_md,
    useChatHistory: n.use_chat_history ?? !0,
    // activity specific:
    options_md: n.options_md,
    correct: n.correct,
    grading: n.grading,
    prompt_key_grading: n.prompt_key_grading
  };
}
function A(n, t, e, s, o) {
  const i = [];
  for (const r of n)
    try {
      const a = r.querySelector(
        "script.activity-meta"
      );
      if (!a) throw new Error("Missing script.activity-meta");
      const l = I(JSON.parse(a.textContent)), d = T(
        {
          el: r,
          ai: t,
          settings: e,
          storage: s,
          rawPrompts: o
        },
        l
      );
      d.init(), i.push({
        meta: l,
        controller: d
      });
    } catch (a) {
      console.error(a), r.classList.add("debug-error");
    }
  return {
    activitities: i
  };
}
function T(n, t) {
  const e = n.rawPrompts[t.prompt_key];
  if (!e)
    throw new Error("prompt template not found:" + t.prompt_key);
  switch (t.type) {
    case "choice":
      return new v(n, t, e);
    case "text":
      const s = n.rawPrompts[t.prompt_key_grading ?? ""] ?? null;
      return new x(n, t, e, s);
    default:
      throw new Error(`unsupported activity type: ${t.type}`);
  }
}
const B = ({ activities: n, rawPrompts: t }) => {
  const e = n.length;
  console.log("making debug widget for: " + e);
  const s = document.createElement("div");
  s.id = "activity-debug";
  const o = document.createElement("div");
  o.textContent = `🐞 ${e} activit${e === 1 ? "y" : "ies"}`, o.addEventListener("click", () => {
    n.length ? alert(
      `Activities:
` + n.map((a) => `${a.id}: ${a.type}`).join(`
`)
    ) : alert("No activities detected");
  });
  const i = document.createElement("div"), r = Object.keys(t).length;
  return i.textContent = `${r} prompts`, i.addEventListener("click", () => {
    alert(
      r ? `Prompts:
` + Object.keys(t).map((a) => `${a}: ${t[a]}`).join(`

`) : "No prompts detected"
    );
  }), s.replaceChildren(o, i), s;
};
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
class N {
  constructor(t) {
    this.system_prompt = t;
  }
  /**
   * Build messages and request a response based on certain data.
   */
  async generate(t, e, s = [], o, i) {
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
    }, d = [
      a,
      ...s,
      l
    ];
    console.log(
      `sending to ai (plus ${s.length} history):`,
      l
    ), i && d.push({
      role: "user",
      content: i
    });
    const p = {
      messages: d,
      model: e.model
    }, h = (await (await fetch(r, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${e.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(p)
    })).json()).choices[0].message.content;
    if (typeof h != "string")
      throw new Error("weird message content: " + typeof h);
    return { summary: h };
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
    return (await s.json()).data;
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
    }, i = await fetch(e, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t.apiKey}`
      },
      body: JSON.stringify(o)
    }), r = await i.json();
    if (!i.ok)
      throw new Error("message" in r ? r.message : JSON.stringify(r));
    return r.choices[0].message.content;
  }
}
const F = ({ title: n, subtitle: t = "This may take a few seconds..." }) => {
  const e = document.createElement("div");
  e.className = "spinner";
  const s = document.createElement("h1");
  s.textContent = n;
  const o = document.createElement("p");
  o.textContent = t;
  const i = document.createElement("div");
  i.className = "loader", i.replaceChildren(e, s, o);
  const r = document.createElement("div");
  return r.replaceChildren(i), r.className = "loading-fullscreen", r;
};
function H(n, t, e, s) {
  n.addEventListener("click", async () => {
    console.log("pinging AI...");
    const o = F({ title: "pinging AI" });
    document.body.appendChild(o);
    const i = e.load();
    if (!i) {
      alert("Please enter AI credentials!");
      return;
    }
    try {
      const r = await s.ping(i);
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
      const i = await s.models(o);
      console.log(i);
    } catch (i) {
      alert(i instanceof c ? i.message : i);
    }
  });
}
class L {
  key = "activity-state-v1";
  async load(t, e) {
    const s = localStorage.getItem(this.key);
    return s ? JSON.parse(s)?.[t]?.[e] ?? null : null;
  }
  async save(t, e, s) {
    const o = localStorage.getItem(this.key), i = o ? JSON.parse(o) : {};
    i[t] ??= {}, i[t][e] = s, localStorage.setItem(this.key, JSON.stringify(i));
  }
}
function O() {
  console.log("HELLO MAIN");
  const n = C();
  console.log("global options", n);
  const t = n.prompts.system;
  t || console.error("No system prompt!");
  const e = new N(t ?? "system prompt"), s = document.querySelector("#btn-ping"), o = document.querySelector("#btn-models"), i = new b(), r = document.querySelector("#settings-form");
  if (!r) throw new Error("missing settings form");
  new f(r, i);
  const a = new L();
  s && o ? H(s, o, i, e) : console.warn("Some debugging button is missing");
  const l = A(
    document.querySelectorAll(".activity"),
    e,
    i,
    a,
    n.prompts
  );
  document.body.appendChild(
    B({
      activities: l.activitities.map((d) => d.meta),
      rawPrompts: n.prompts
    })
  );
}
document.addEventListener("DOMContentLoaded", O);
