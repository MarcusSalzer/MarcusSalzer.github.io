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
class p {
  constructor(t) {
    this.raw = t;
  }
  render(t) {
    const e = /* @__PURE__ */ new Set();
    return this.raw.replace(/{{\s*(\w+)\s*}}/g, (n, o) => {
      if (!(o in t))
        throw new Error(`Missing fill value for "${o}"`);
      return e.add(o), t[o];
    });
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
  debugEl = null;
  /* ---------------- hydration ---------------- */
  captureQuestion() {
    const t = this.root.querySelector("ul");
    if (!t) throw new Error("Choice activity missing <ul>");
    const e = [];
    return t.querySelectorAll("li").forEach((s, n) => {
      const o = s.querySelector(
        "input[type=checkbox]"
      );
      if (!o) throw new Error("Option missing checkbox");
      e.push({
        index: n,
        input: o
      });
    }), { options: e };
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
class b {
  constructor(t, e, s, n, o) {
    this.meta = e, this.ai = s, this.settings = n, this.ui = new g(t), this.template = new p(o), this.ui.submitBtn.addEventListener("click", () => this.submit()), this.ui.feedbackBtn.addEventListener("click", () => this.getFdbk()), this.ui.debugBtn.addEventListener("click", () => {
      this.ui.toggleDebug({ meta: e, template: o });
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
    const t = this.ui.getAnswer(), e = this.meta.correct, s = this.template.render({
      QUESTION: this.meta.question_md,
      OPTIONS: this.meta.options_md.join(", "),
      CORRECT: this.idsToOptMd(e),
      ANSWER: this.idsToOptMd(t)
    }), n = this.settings.load();
    if (!n) throw new Error("No ai credentials stored");
    console.log("sending to ai:", s), this.ui.showFeedbackLoading();
    const o = await this.ai.generate(
      this.meta.learningGoals,
      s,
      n
    );
    this.ui.showFeedback(o.summary);
  }
}
const l = {
  // code: CodeActivityController,
  choice: b
  //   cloze: ClozeActivityController,
};
function d(r) {
  return r !== null && r in l;
}
function f(r, t, e, s, n) {
  if (!d(t.type))
    throw new Error(`unsupported activity type: ${t.type}`);
  const o = l[t.type];
  return new o(r, t, e, s, n);
}
function y() {
  const r = document.querySelector("#global-options");
  if (!r)
    throw new Error("Could not find global-options element");
  const t = JSON.parse(r.textContent);
  if (!t.prompts)
    throw new Error("prompts missing from global options");
  return t;
}
function w(r) {
  const t = r.querySelector("script.activity-meta");
  if (!t) throw new Error("Missing script.activity-meta");
  const e = JSON.parse(t.textContent), s = e.type;
  if (!d(s))
    throw new Error("unsupported activity type: " + s);
  return {
    id: Number(e.id),
    type: s,
    prompt_key: e?.prompt_key ?? s,
    correct: e.correct,
    question_md: e.question_md,
    options_md: e.options_md
  };
}
function E(r, t, e, s) {
  const n = [];
  for (const o of r)
    try {
      const i = w(o), a = s[i.prompt_key];
      if (!a)
        throw new Error("prompt template not found:" + i.prompt_key);
      n.push({
        meta: i,
        controller: f(o, i, t, e, a)
      });
    } catch (i) {
      console.error(i), o.classList.add("debug-error");
    }
  return {
    activitities: n
  };
}
const k = ({ activities: r, rawPrompts: t }) => {
  const e = r.length;
  console.log("making debug widget for: " + e);
  const s = document.createElement("div");
  s.id = "activity-debug";
  const n = document.createElement("div");
  n.textContent = `🐞 ${e} activit${e === 1 ? "y" : "ies"}`, n.addEventListener("click", () => {
    r.length ? alert(
      `Activities:
` + r.map((a) => `${a.id}: ${a.type}`).join(`
`)
    ) : alert("No activities detected");
  });
  const o = document.createElement("div"), i = Object.keys(t).length;
  return o.textContent = `${i} prompts`, o.addEventListener("click", () => {
    alert(
      i ? `Prompts:
` + Object.keys(t).map((a) => `${a}: ${t[a]}`).join(`

`) : "No prompts detected"
    );
  }), s.replaceChildren(n, o), s;
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
class v {
  constructor(t) {
    this.system_prompt = t;
  }
  /**
   */
  async generate(t, e, s) {
    s.model || console.warn("TODO default model choice?");
    const n = `${s.baseUrl}/chat/completions`, o = {
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
    }, a = (await (await fetch(n, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${s.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(o)
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
    } catch (n) {
      throw c.classifyNetworkError(n, t.baseUrl);
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
    const n = {
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
    }, o = await fetch(e, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${t.apiKey}`
      },
      body: JSON.stringify(n)
    }), i = await o.json();
    if (!o.ok)
      throw new Error("message" in i ? i.message : JSON.stringify(i));
    return i.choices[0].message.content;
  }
}
const S = ({ title: r, subtitle: t = "This may take a few seconds..." }) => {
  const e = document.createElement("div");
  e.className = "spinner";
  const s = document.createElement("h1");
  s.textContent = r;
  const n = document.createElement("p");
  n.textContent = t;
  const o = document.createElement("div");
  o.className = "loader", o.replaceChildren(e, s, n);
  const i = document.createElement("div");
  return i.replaceChildren(o), i.className = "loading-fullscreen", i;
};
function C(r, t, e, s) {
  r.addEventListener("click", async () => {
    console.log("pinging AI...");
    const n = S({ title: "pinging AI" });
    document.body.appendChild(n);
    const o = e.load();
    if (!o) {
      alert("Please enter AI credentials!");
      return;
    }
    try {
      const i = await s.ping(o);
      console.log(i);
    } catch (i) {
      alert(i instanceof c ? i.message : i);
    }
    n.remove();
  }), t.addEventListener("click", async () => {
    const n = e.load();
    if (!n) {
      alert("Please enter AI credentials!");
      return;
    }
    console.log("asking for models...");
    try {
      const o = await s.models(n);
      console.log(o);
    } catch (o) {
      alert(o instanceof c ? o.message : o);
    }
  });
}
function O() {
  const r = y();
  console.log("global options", r);
  const t = r.prompts.system;
  t || console.error("No system prompt!");
  const e = new v(t ?? "system prompt"), s = document.querySelector("#btn-ping"), n = document.querySelector("#btn-models"), o = new h(), i = document.querySelector("#settings-form");
  if (!i) throw new Error("missing settings form");
  new m(i, o), s && n ? C(s, n, o, e) : console.warn("Some debugging button is missing");
  const a = E(
    document.querySelectorAll(".activity"),
    e,
    o,
    r.prompts
  );
  document.body.appendChild(
    k({
      activities: a.activitities.map((u) => u.meta),
      rawPrompts: r.prompts
    })
  );
}
document.addEventListener("DOMContentLoaded", O);
