(() => {
  const OPTIONS = {
    gender: {
      label: "性别",
      items: ["男性", "女性"]
    },
    era: {
      label: "出生年代",
      items: [
        "计划经济体制时期（1950-1965）",
        "特殊历史时期（1966-1977）",
        "改革开放初期（1978-1988）",
        "市场经济体制逐步确立时期（1989-1999）",
        "对外开放深化与城镇化推进时期（2000-2009）"
      ]
    },
    region: {
      label: "出生区域",
      items: [
        "农村地区",
        "县域城区",
        "普通地级市",
        "省会城市",
        "一线或核心城市",
        "老工业地区",
        "沿海开放地区",
        "资源型地区"
      ]
    },
    trait: {
      label: "人物行为倾向",
      items: [
        "路径依赖型（倾向沿既有路径行动）",
        "主动改变型（倾向在不确定时调整方向）",
        "风险回避型（倾向避免不稳定情境）",
        "风险承受型（倾向接受不确定性）",
        "环境跟随型（倾向依据外部趋势行动）",
        "惯性维持型（倾向保持当前状态）",
        "关系优先型（倾向依赖社会连接）",
        "个人判断型（倾向依赖自身判断）",
        "资源消耗型（倾向优先使用已有条件）"
      ]
    }
  };

  const state = {
    selected: {
      gender: "男性",
      era: "",
      birthYear: "",
      region: "",
      trait: ""
    },
    loading: false,
    avatarReady: false,
    typewriter: null
  };

  const elements = {
    groups: {
      gender: document.querySelector('[data-group="gender"]'),
      era: document.querySelector('[data-group="era"]'),
      birthYear: document.querySelector('[data-group="birthYear"]'),
      region: document.querySelector('[data-group="region"]'),
      trait: document.querySelector('[data-group="trait"]')
    },
    generateBtn: document.getElementById("generate-btn"),
    resetBtn: document.getElementById("reset-btn"),
    status: document.getElementById("status"),
    result: document.getElementById("result-text"),
    avatar: document.getElementById("pixel-avatar"),
    avatarWrap: document.getElementById("avatar-wrap"),
    avatarHint: document.getElementById("avatar-hint")
  };

  const avatarCtx = elements.avatar.getContext("2d");

  function init() {
    renderGroups();
    renderBirthYearGroup();
    syncDefaultSelections();
    bindActions();
    setAvatarVisible(false);
  }

  function syncDefaultSelections() {
    Object.entries(state.selected).forEach(([group, value]) => {
      if (value) {
        syncActiveState(group, value);
      }
    });
  }

  function renderGroups() {
    Object.entries(OPTIONS).forEach(([key, group]) => {
      const container = elements.groups[key];
      container.innerHTML = "";

      const title = document.createElement("p");
      title.className = "group-title";
      title.textContent = group.label;

      const chips = document.createElement("div");
      chips.className = "chips";

      group.items.forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip";
        btn.textContent = item;
        btn.dataset.group = key;
        btn.dataset.value = item;
        chips.appendChild(btn);
      });

      container.appendChild(title);
      container.appendChild(chips);
    });
  }

  function bindActions() {
    Object.values(elements.groups).forEach((groupContainer) => {
      groupContainer.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement) || !target.classList.contains("chip")) {
          return;
        }

        const { group, value } = target.dataset;
        if (!group || !value) {
          return;
        }

        state.selected[group] = value;
        if (group === "era") {
          state.selected.birthYear = "";
          renderBirthYearGroup();
        }
        syncActiveState(group, value);
        setStatus("", "");
      });
    });

    elements.generateBtn.addEventListener("click", generateExperience);

    elements.resetBtn.addEventListener("click", () => {
      state.selected = { gender: "男性", era: "", birthYear: "", region: "", trait: "" };
      state.avatarReady = false;
      if (state.typewriter) {
        state.typewriter.cancel();
        state.typewriter = null;
      }
      document.querySelectorAll(".chip.active").forEach((chip) => chip.classList.remove("active"));
      renderBirthYearGroup();
      syncDefaultSelections();
      elements.result.textContent = "请选择配置后点击生成。";
      setStatus("", "");
      clearAvatar();
      setAvatarVisible(false);
    });
  }

  function syncActiveState(group, value) {
    const chips = elements.groups[group].querySelectorAll(".chip");
    chips.forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.value === value);
    });
  }

  function renderBirthYearGroup() {
    const container = elements.groups.birthYear;
    if (!container) {
      return;
    }

    container.innerHTML = "";

    const title = document.createElement("p");
    title.className = "group-title";
    title.textContent = "出生年份";
    container.appendChild(title);

    const chips = document.createElement("div");
    chips.className = "chips";

    const range = parseEraRange(state.selected.era);
    if (!range) {
      const hint = document.createElement("p");
      hint.className = "group-title";
      hint.textContent = "请先选择出生年代范围";
      container.appendChild(hint);
      return;
    }

    for (let year = range.start; year <= range.end; year += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = String(year);
      btn.dataset.group = "birthYear";
      btn.dataset.value = String(year);
      chips.appendChild(btn);
    }

    container.appendChild(chips);
    if (state.selected.birthYear) {
      syncActiveState("birthYear", state.selected.birthYear);
    }
  }

  function parseEraRange(era) {
    if (!era) {
      return null;
    }
    const match = era.match(/(\d{4})-(\d{4})/);
    if (!match) {
      return null;
    }
    return { start: Number(match[1]), end: Number(match[2]) };
  }

  function setStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = `status${type ? ` ${type}` : ""}`;
  }

  function ensureSelectionComplete() {
    return Object.values(state.selected).every(Boolean);
  }

  async function generateExperience() {
    if (state.loading) {
      return;
    }

    if (!ensureSelectionComplete()) {
      setStatus("请先完成所有配置（含出生年份）的选择。", "error");
      return;
    }

    if (!window.LIFE_IN_AI_CONFIG || !window.LIFE_IN_AI_CONFIG.apiKey) {
      setStatus("模型配置缺失，请检查 config.js。", "error");
      return;
    }

    const prompt = buildPrompt();
    toggleLoading(true);
    setStatus("已生成像素角色，正在输出人生体验...", "");
    elements.result.textContent = "";

    drawAvatar();
    state.avatarReady = true;
    setAvatarVisible(true);

    const writer = createTypewriter(elements.result, {
      minDelay: 26,
      maxDelay: 42,
      minChars: 1,
      maxChars: 2
    });
    state.typewriter = writer;

    try {
      const content = await requestModelStream(prompt, (chunk) => {
        writer.push(chunk);
      });
      await writer.finish();
      if (!content.trim()) {
        throw new Error("接口返回为空，请稍后重试");
      }
      state.avatarReady = true;
      setStatus("生成人生体验成功。", "success");
    } catch (error) {
      await writer.finish();
      setStatus(`生成失败：${error.message}`, "error");
    } finally {
      state.typewriter = null;
      toggleLoading(false);
    }
  }

  function toggleLoading(loading) {
    state.loading = loading;
    elements.generateBtn.disabled = loading;
    elements.generateBtn.textContent = loading ? "生成中..." : "生成我的人生体验";
  }

  function buildPrompt() {
    const { gender, era, birthYear, region, trait } = state.selected;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const ageConstraint = buildAgeConstraint(birthYear, currentYear);
    return [
      "你是一个“历史一致性人生生成器”。",
      "你的任务是根据输入的三项参数：",
      "- 出生年代（历史阶段）",
      "- 出生空间（社会环境）",
      "- 行为倾向（决策偏好）",
      "以及性别生成一个符合真实历史发展逻辑的人生轨迹。",
      "",
      "请严格遵守以下原则：",
      "一、历史一致性",
      "生成的人生必须符合该出生年代所对应的社会条件。",
      "不能出现超越时代的教育、职业、技术或社会机会。",
      "例如：",
      "- 在计划经济时期不能出现自由创业路径",
      "- 在文革时期不能假设稳定高等教育路径",
      "- 在互联网普及前不能依赖数字经济",
      "",
      "二、结构优先",
      "人物命运主要由：时代环境 + 出生条件 + 行为选择共同作用形成。",
      "不得简单使用“努力”“天赋”作为决定性因素。",
      "",
      "三、避免成功叙事",
      "人生不应自动走向成功或失败。",
      "允许出现：稳定、波动、停滞、调整等不同状态。",
      "",
      "四、避免现代视角",
      "不得用当代价值观评判过去社会阶段。",
      "",
      "五、现实可行性",
      "人生路径必须是当时普通人“可能经历”的轨迹，而不是极端精英或极端悲剧。",
      "",
      "六、生成重点",
      "请重点描述：教育路径、职业路径、家庭变化、关键转折节点。",
      "避免：宏大叙事、政策评论、时代总结。",
      `叙事时间线请推进到当下（${currentYear}年${currentMonth}月），并明确交代你在当下的现实处境与状态。`,
      `时间一致性要求：当前时间锚点是 ${currentYear}年${currentMonth}月，文中不得出现晚于该月份的时间点。`,
      ageConstraint,
      "",
      "目标是生成一个“像真实存在过的人”的人生。",
      "",
      "输出要求：",
      "1) 使用第一人称“我”叙述。",
      "2) 字数不设限制，但内容应完整且紧凑。",
      "",
      `配置：性别=${gender}; 出生年代=${era}; 出生年份=${birthYear}; 出生区域=${region}; 人物行为倾向=${trait}`
    ].join("\n");
  }

  function buildAgeConstraint(birthYear, currentYear) {
    const yearNum = Number(birthYear);
    if (!Number.isFinite(yearNum)) {
      return "请确保文中的出生年份、各阶段年份和年龄计算前后一致，不得自相矛盾。";
    }
    const ageNow = Math.max(0, currentYear - yearNum);

    return [
      `年龄一致性要求：出生年份固定为 ${yearNum} 年。`,
      `到 ${currentYear} 年时，年龄应为 ${ageNow} 岁（可根据生日月份出现上下 1 岁浮动，但不得偏离此范围）。`,
      "文中所有年份与年龄必须可相互推导且全程一致。"
    ].join("\n");
  }

  async function requestModelStream(prompt, onChunk) {
    const cfg = window.LIFE_IN_AI_CONFIG;
    const systemMessage =
      "你是一个历史一致性人生生成器。你必须优先保证时代约束、社会条件与个人选择之间的因果一致性。不得出现超越时代的机会设定，不得使用现代价值观评判历史阶段，不得把努力或天赋作为决定性解释，不得自动导向成功或失败。输出应聚焦普通人可实现的教育路径、职业路径、家庭变化与关键转折。";

    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: prompt }
    ];
    const result = await requestSingleStream(messages, cfg, onChunk);
    return result.text;
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
      let fallback = "";
      let finishReason = "";
      try {
        const payload = JSON.parse(raw);
        fallback = payload?.choices?.[0]?.message?.content || "";
        finishReason = payload?.choices?.[0]?.finish_reason || "";
      } catch (error) {
        fallback = raw;
      }
      if (fallback) {
        onChunk(fallback);
        return { text: fallback, finishReason };
      }
      throw new Error("流式响应不可用，请稍后重试");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let finalText = "";
    let finishReason = "";
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
        const parsed = parseStreamLine(line);
        if (!parsed) {
          continue;
        }
        if (parsed.finishReason) {
          finishReason = parsed.finishReason;
        }
        if (parsed.done) {
          return { text: finalText, finishReason };
        }
        if (parsed.chunk) {
          finalText += parsed.chunk;
          onChunk(parsed.chunk);
        }
      }
    }

    const tail = parseStreamLine(buffer);
    if (tail?.finishReason) {
      finishReason = tail.finishReason;
    }
    if (tail?.chunk) {
      finalText += tail.chunk;
      onChunk(tail.chunk);
    }

    return { text: finalText, finishReason };
  }

  function parseStreamLine(line) {
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
      const choice = json?.choices?.[0] || {};
      const chunk = choice?.delta?.content || "";
      const finishReason = choice?.finish_reason || "";
      if (!chunk && !finishReason) {
        return null;
      }
      return { done: false, chunk, finishReason };
    } catch (error) {
      return null;
    }
  }

  function createTypewriter(targetEl, options = {}) {
    const minDelay = options.minDelay ?? 24;
    const maxDelay = options.maxDelay ?? 40;
    const minChars = options.minChars ?? 1;
    const maxChars = options.maxChars ?? 2;

    let queue = "";
    let running = false;
    let ended = false;
    let canceled = false;
    let resolver = null;

    function resolveIfDone() {
      if (!ended || running || queue.length > 0) {
        return;
      }
      if (resolver) {
        resolver();
        resolver = null;
      }
    }

    function scheduleNext(step) {
      const delay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay + 1));
      window.setTimeout(step, delay);
    }

    function renderStep() {
      if (canceled) {
        running = false;
        queue = "";
        ended = true;
        resolveIfDone();
        return;
      }

      if (!queue.length) {
        running = false;
        resolveIfDone();
        return;
      }

      const count = Math.min(
        queue.length,
        minChars + Math.floor(Math.random() * (maxChars - minChars + 1))
      );
      const next = queue.slice(0, count);
      queue = queue.slice(count);
      targetEl.textContent += next;
      targetEl.scrollTop = targetEl.scrollHeight;
      scheduleNext(renderStep);
    }

    function pump() {
      if (running || canceled || !queue.length) {
        resolveIfDone();
        return;
      }
      running = true;
      renderStep();
    }

    return {
      push(text) {
        if (!text || canceled) {
          return;
        }
        queue += text;
        pump();
      },
      finish() {
        ended = true;
        if (!running && queue.length === 0) {
          return Promise.resolve();
        }
        return new Promise((resolve) => {
          resolver = resolve;
          pump();
        });
      },
      cancel() {
        canceled = true;
      }
    };
  }

  function hashText(source) {
    let hash = 2166136261;
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function getEntropySeed() {
    if (window.crypto?.getRandomValues) {
      const seeded = new Uint32Array(1);
      window.crypto.getRandomValues(seeded);
      return seeded[0] >>> 0;
    }
    return Math.floor(Math.random() * 4294967295) >>> 0;
  }

  function randomFromHash(seed) {
    let value = seed || 1;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967295;
    };
  }

  function drawAvatar() {
    const signature = Object.values(state.selected).join("|");
    const seed = (hashText(signature || "default") ^ getEntropySeed() ^ (Date.now() >>> 0)) >>> 0;
    const rand = randomFromHash(seed);

    const centerX = 16;
    const skin = pickColor(rand, ["#ffd8af", "#f1bf95", "#e3a37b", "#cd8b62", "#b9774f"]);
    const hair = pickColor(rand, ["#121622", "#3e2c22", "#2b3c5f", "#5a2d36", "#2f2f2f"]);
    const top = pickColor(rand, ["#4ae0d2", "#60a8ff", "#f4b85c", "#77d66e", "#ff8aa0"]);
    const topShadow = pickColor(rand, ["#2e97b0", "#3d6cae", "#d79745", "#4d9a4a", "#be4f65"]);
    const pants = pickColor(rand, ["#25334d", "#2c2c3a", "#4a2f3d", "#1f3f36"]);
    const eye = pickColor(rand, ["#07111f", "#0f1f34", "#111111"]);
    const accessory = pickColor(rand, ["#d8eeff", "#ffdca8", "#bbffde", "#f6c6ff"]);
    const bg0 = pickColor(rand, ["#070f1d", "#0d1627", "#0d1f2e"]);
    const bg1 = pickColor(rand, ["#1c2f4d", "#13445c", "#372f5b"]);

    avatarCtx.clearRect(0, 0, 32, 32);
    fillRect(0, 0, 32, 32, bg0);

    for (let i = 0; i < 55; i += 1) {
      fillRect(Math.floor(rand() * 32), Math.floor(rand() * 32), 1, 1, rand() > 0.55 ? bg1 : "#8cb9ff");
    }

    const glow = avatarCtx.createRadialGradient(16, 10, 1, 16, 16, 22);
    glow.addColorStop(0, "rgba(96,168,255,0.45)");
    glow.addColorStop(1, "rgba(8,15,30,0)");
    avatarCtx.fillStyle = glow;
    avatarCtx.fillRect(0, 0, 32, 32);

    const headW = 12 + Math.floor(rand() * 3);
    const headH = 9 + Math.floor(rand() * 3);
    const headX = centerX - Math.floor(headW / 2) + (rand() > 0.85 ? 1 : 0);
    const headY = 10;

    fillRect(centerX - 2, headY + headH, 4, 2, skin);
    fillRect(headX, headY, headW, headH, skin);

    fillRect(8, 22, 16, 8, top);
    fillRect(9, 27, 14, 2, topShadow);
    fillRect(10, 30, 12, 2, pants);

    if (rand() > 0.45) {
      fillRect(6, 22, 2, 7, topShadow);
      fillRect(24, 22, 2, 7, topShadow);
    }

    drawHairStyle(rand, { headX, headY, headW, headH, centerX, hair });

    const eyeY = headY + 3 + Math.floor(rand() * 2);
    const eyeOffset = Math.max(2, Math.floor((headW - 6) / 2));
    drawEyeStyle(rand, centerX, eyeY, eyeOffset, eye);
    drawMouth(rand, centerX, headY + headH - 2);

    if (rand() > 0.35) {
      drawAccessory(rand, { headX, headY, headW, headH, centerX, accessory });
    }

    const decoCount = signature ? 9 : 5;
    for (let i = 0; i < decoCount; i += 1) {
      fillRect(
        Math.floor(rand() * 32),
        Math.floor(rand() * 9) + 22,
        1,
        1,
        pickColor(rand, ["#4ae0d2", "#60a8ff", "#cfe8ff", "#ffffff"])
      );
    }
  }

  function clearAvatar() {
    avatarCtx.clearRect(0, 0, 32, 32);
  }

  function setAvatarVisible(visible) {
    elements.avatarWrap.classList.toggle("hidden", !visible);
    elements.avatarHint.style.display = visible ? "none" : "block";
  }

  function drawHairStyle(rand, params) {
    const { headX, headY, headW, headH, centerX, hair } = params;
    const style = Math.floor(rand() * 5);

    if (style === 0) {
      fillRect(headX - 1, headY - 1, headW + 2, 3, hair);
      fillRect(headX - 1, headY + 1, 2, 4, hair);
      fillRect(headX + headW - 1, headY + 1, 2, 4, hair);
      return;
    }

    if (style === 1) {
      fillRect(headX - 1, headY - 1, headW + 2, 2, hair);
      fillRect(centerX - 1, headY - 2, 2, 2, hair);
      return;
    }

    if (style === 2) {
      fillRect(headX - 1, headY - 1, headW + 2, 3, hair);
      fillRect(headX - 2, headY + 1, 2, headH - 2, hair);
      fillRect(headX + headW, headY + 1, 2, headH - 2, hair);
      return;
    }

    if (style === 3) {
      fillRect(headX, headY - 1, headW, 2, hair);
      fillRect(headX + 1, headY + 1, headW - 2, 1, hair);
      return;
    }

    fillRect(headX - 1, headY - 1, headW + 2, 2, hair);
    fillRect(centerX - 3, headY - 2, 6, 1, hair);
    fillRect(centerX - 1, headY - 3, 2, 1, hair);
  }

  function drawEyeStyle(rand, centerX, eyeY, eyeOffset, eye) {
    const style = Math.floor(rand() * 3);

    if (style === 0) {
      fillRect(centerX - eyeOffset, eyeY, 1, 1, eye);
      fillRect(centerX + eyeOffset, eyeY, 1, 1, eye);
      return;
    }

    if (style === 1) {
      fillRect(centerX - eyeOffset - 1, eyeY, 2, 1, eye);
      fillRect(centerX + eyeOffset - 1, eyeY, 2, 1, eye);
      return;
    }

    fillRect(centerX - eyeOffset, eyeY - 1, 1, 2, eye);
    fillRect(centerX + eyeOffset, eyeY - 1, 1, 2, eye);
  }

  function drawMouth(rand, centerX, y) {
    const color = pickColor(rand, ["#a85c47", "#8c4a3b", "#70403a"]);
    const style = Math.floor(rand() * 3);
    if (style === 0) {
      fillRect(centerX - 2, y, 4, 1, color);
      return;
    }
    if (style === 1) {
      fillRect(centerX - 1, y, 2, 1, color);
      return;
    }
    fillRect(centerX - 2, y, 1, 1, color);
    fillRect(centerX + 1, y, 1, 1, color);
  }

  function drawAccessory(rand, params) {
    const { headX, headY, headW, headH, centerX, accessory } = params;
    const type = Math.floor(rand() * 4);

    if (type === 0) {
      fillRect(headX - 1, headY + 3, 4, 2, accessory);
      fillRect(headX + headW - 3, headY + 3, 4, 2, accessory);
      fillRect(centerX - 1, headY + 4, 2, 1, accessory);
      return;
    }

    if (type === 1) {
      fillRect(centerX - 4, headY + headH - 1, 8, 1, accessory);
      fillRect(centerX - 2, headY + headH, 4, 1, accessory);
      return;
    }

    if (type === 2) {
      fillRect(headX - 2, headY + 4, 2, 4, accessory);
      fillRect(headX + headW, headY + 4, 2, 4, accessory);
      fillRect(headX - 1, headY + 5, headW + 2, 1, accessory);
      return;
    }

    fillRect(headX, headY - 2, headW, 1, accessory);
    fillRect(headX + 1, headY - 3, headW - 2, 1, accessory);
  }

  function pickColor(rand, list) {
    return list[Math.floor(rand() * list.length)];
  }

  function fillRect(x, y, w, h, color) {
    avatarCtx.fillStyle = color;
    avatarCtx.fillRect(x, y, w, h);
  }

  init();
})();
