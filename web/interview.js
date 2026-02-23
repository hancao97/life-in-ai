(() => {
  const KEY = "LIFE_IN_AI_INTERVIEW_CONTEXT";
  const contextRaw = sessionStorage.getItem(KEY);

  const el = {
    meta: document.getElementById("meta"),
    backBtn: document.getElementById("back-btn"),
    chat: document.getElementById("chat"),
    status: document.getElementById("status"),
    input: document.getElementById("question-input"),
    regenBtn: document.getElementById("regen-btn"),
    sendBtn: document.getElementById("send-btn")
  };

  let context = null;
  let history = [];
  let round = 0;
  let busy = false;
  let interviewerProfile =
    "你是一个做过大量口述史与人物深描的资深访谈员，提问锋利但不冒犯，能从细节进入价值层。";

  function init() {
    try {
      context = JSON.parse(contextRaw || "");
    } catch (error) {
      context = null;
    }

    if (!context?.lifeExperience || !context?.avatarDataUrl || !context?.selected) {
      el.chat.textContent = "缺少访谈上下文，请返回人生体验页面重新生成后再进入。";
      setStatus("上下文不可用");
      lockControls(true);
      bindBackOnly();
      return;
    }

    bindEvents();
    renderMeta();
    seedOpening();
    generateAndFillQuestion();
  }

  function bindBackOnly() {
    el.backBtn.addEventListener("click", () => {
      window.location.href = "./index.html";
    });
  }

  function bindEvents() {
    el.backBtn.addEventListener("click", () => {
      window.location.href = "./index.html";
    });

    el.regenBtn.addEventListener("click", () => {
      generateAndFillQuestion();
    });

    el.sendBtn.addEventListener("click", () => {
      submitRound();
    });

    el.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        submitRound();
      }
    });
  }

  function renderMeta() {
    const s = context.selected;
    el.meta.textContent = `被访者画像：${s.gender} · ${s.birthYear}年生 · ${s.region} · ${s.trait}`;
  }

  function seedOpening() {
    addMessage(
      "left",
      "被访者",
      "我准备好了。你可以从你最想问的地方开始。",
      true
    );
  }

  function setStatus(text) {
    el.status.textContent = text || "";
  }

  function lockControls(disabled) {
    busy = disabled;
    el.input.disabled = disabled;
    el.regenBtn.disabled = disabled;
    el.sendBtn.disabled = disabled;
  }

  async function generateAndFillQuestion() {
    if (!context) {
      return;
    }
    lockControls(true);
    setStatus("访谈员正在准备下一问...");
    try {
      const question = await generateInterviewerQuestion(round + 1);
      el.input.value = question;
      setStatus("问题已生成，可直接发送或自行修改。");
    } catch (error) {
      setStatus(`问题生成失败：${error.message}`);
    } finally {
      lockControls(false);
    }
  }

  async function submitRound() {
    if (busy) {
      return;
    }
    const question = el.input.value.trim();
    if (!question) {
      setStatus("请先输入或生成访谈员问题。");
      return;
    }

    lockControls(true);
    setStatus("被访者正在回答...");

    addMessage("right", "访谈员", question, false);

    const answerBubble = addMessage("left", "被访者", "", true);
    round += 1;

    try {
      const answer = await generateIntervieweeAnswer(question, round, (chunk) => {
        answerBubble.body.textContent += chunk;
        scrollToBottom();
      });

      const cleanAnswer = answer.trim();
      answerBubble.body.textContent = cleanAnswer;
      history.push(
        { role: "interviewer", content: question },
        { role: "interviewee", content: cleanAnswer }
      );

      setStatus("回答完成，正在生成下一问...");
      const nextQuestion = await generateInterviewerQuestion(round + 1);
      el.input.value = nextQuestion;
      setStatus("已自动生成下一问，你可以修改后发送。");
    } catch (error) {
      setStatus(`访谈失败：${error.message}`);
    } finally {
      lockControls(false);
    }
  }

  function addMessage(side, role, text, withAvatar) {
    const wrap = document.createElement("div");
    wrap.className = `message ${side}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const head = document.createElement("div");
    head.className = "bubble-head";

    if (withAvatar && side === "left") {
      const img = document.createElement("img");
      img.className = "avatar";
      img.alt = "被访者头像";
      img.src = context.avatarDataUrl;
      head.appendChild(img);
    }

    const title = document.createElement("span");
    title.textContent = role;
    head.appendChild(title);

    const body = document.createElement("div");
    body.textContent = text;

    bubble.appendChild(head);
    bubble.appendChild(body);
    wrap.appendChild(bubble);
    el.chat.appendChild(wrap);
    scrollToBottom();

    return { wrap, bubble, body };
  }

  function scrollToBottom() {
    el.chat.scrollTop = el.chat.scrollHeight;
  }

  function getRoundFocus(targetRound) {
    if (targetRound <= 2) {
      return "从关键经历切入，追问具体抉择与当时情境";
    }
    if (targetRound <= 4) {
      return "深入追问代价、遗憾、关系变化与自我认知变化";
    }
    return "引导其谈人生感悟、未来预期、以及形成的人生哲学";
  }

  function getLastIntervieweeAnswer() {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i].role === "interviewee") {
        return history[i].content;
      }
    }
    return "";
  }

  function getLastInterviewerQuestion() {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i].role === "interviewer") {
        return history[i].content;
      }
    }
    return "";
  }

  function sanitizeQuestion(raw) {
    const text = (raw || "").replace(/\s+/g, " ").trim();
    return text.replace(/^[“"']|[”"']$/g, "").trim();
  }

  async function generateInterviewerQuestion(targetRound) {
    const cfg = window.LIFE_IN_AI_CONFIG;
    const lastAnswer = getLastIntervieweeAnswer();
    const lastQuestion = getLastInterviewerQuestion();
    const historyText = history
      .map((item) => `${item.role === "interviewer" ? "访谈员" : "被访者"}：${item.content}`)
      .join("\n");

    const continuityRule = lastAnswer
      ? [
          "如果被访者回答中有感兴趣的话题，请围绕该话题展开深入提问，如果没有，则生成一个高质量见解并发起新一轮提问。",
        ].join("\n")
      : "这是开场轮次，请从“人生第一个关键转折”切入，问题要具体可答。";
    const prompt = [
      interviewerProfile,
      "请基于被访者人生体验和既往对话，生成高质量见解并发起新一轮提问。",
      "提问要求：",
      "1) 不能空泛，不能是模板句。",
      "2) 必须可回答，且能挖出经历细节或心理机制。",
      "3) 避免复读上一问；避免“你怎么看”式泛问。",
      "4) 避免提出多个问题，每次提问只问一个问题。",
      `轮次重点：${getRoundFocus(targetRound)}`,
      continuityRule,
      "",
      "人生体验摘要：",
      context.lifeExperience,
      "",
      "上一轮访谈员问题：",
      lastQuestion || "（暂无）",
      "",
      "上一轮被访者回答：",
      lastAnswer || "（暂无）",
      "",
      "既往对话：",
      historyText || "（暂无）"
    ].join("\n");

    const messages = [
      {
        role: "system",
        content:
          "你是位有洞察力和同理心的资深访谈员。访谈过程中的提问请保证文字精炼，同时保证提问的深度和广度。"
      },
      { role: "user", content: prompt }
    ];

    const text = await requestModelText(messages, cfg);
    const fallback = sanitizeQuestion(text || "你刚才提到的那个转折，具体是怎么一步步发生的？");
    return fallback;
  }

  async function generateIntervieweeAnswer(question, currentRound, onChunk) {
    const cfg = window.LIFE_IN_AI_CONFIG;
    const historyText = history
      .map((item) => `${item.role === "interviewer" ? "访谈员" : "被访者"}：${item.content}`)
      .join("\n");

    const prompt = [
      "你是被访者本人，请真实回答访谈员问题。",
      "要求：",
      "1) 直接回答问题核心，不要绕开问题，不要脱离人物身份。",
      "2) 使用第一人称“我”，有细节、有思考。",
      "3) 严格遵守既有人生体验设定与时代约束。",
      `4) 当前第 ${currentRound} 轮。`,
      "",
      "人生体验摘要：",
      context.lifeExperience,
      "",
      "既往对话：",
      historyText || "（暂无）",
      "",
      `访谈员问题：${question}`
    ].join("\n");

    const messages = [
      {
        role: "system",
        content:
          "你是被访者本人。回答需真实克制，重点谈经历、抉择、感受与认知变化。"
      },
      { role: "user", content: prompt }
    ];

    const result = await requestSingleStream(messages, cfg, onChunk);
    return result.text;
  }

  async function requestModelText(messages, cfg) {
    const response = await fetch(cfg.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: cfg.temperature ?? 0.9,
        max_tokens: cfg.maxTokens ?? 900,
        messages
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error?.message || `HTTP ${response.status}`);
    }

    const text = payload?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("问题生成为空");
    }
    return text;
  }

  async function requestSingleStream(messages, cfg, onChunk) {
    const response = await fetch(cfg.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: cfg.temperature ?? 0.9,
        max_tokens: cfg.maxTokens ?? 900,
        stream: true,
        messages
      })
    });

    if (!response.ok) {
      const raw = await response.text();
      let detail = `HTTP ${response.status}`;
      try {
        const payload = JSON.parse(raw);
        detail = payload?.error?.message || detail;
      } catch (error) {
        if (raw.trim()) {
          detail = raw;
        }
      }
      throw new Error(detail);
    }

    if (!response.body) {
      const raw = await response.text();
      if (!raw.trim()) {
        throw new Error("流式响应不可用，请稍后重试");
      }
      onChunk(raw);
      return { text: raw };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let text = "";
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const parsed = parseSseLine(line);
        if (!parsed) {
          continue;
        }
        if (parsed.done) {
          return { text };
        }
        text += parsed.chunk;
        onChunk(parsed.chunk);
      }
    }

    const tail = parseSseLine(buffer);
    if (tail?.chunk) {
      text += tail.chunk;
      onChunk(tail.chunk);
    }

    return { text };
  }

  function parseSseLine(line) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      return null;
    }

    const payload = trimmed.slice(5).trim();
    if (!payload) {
      return null;
    }
    if (payload === "[DONE]") {
      return { done: true, chunk: "" };
    }

    try {
      const json = JSON.parse(payload);
      const chunk = json?.choices?.[0]?.delta?.content || "";
      if (!chunk) {
        return null;
      }
      return { done: false, chunk };
    } catch (error) {
      return null;
    }
  }

  init();
})();
