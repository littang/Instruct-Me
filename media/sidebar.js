(function () {
  var vscode = acquireVsCodeApi();

  var questionList = document.getElementById("question-list");
  var projectPathEl = document.getElementById("project-path");
  var browseBtn = document.getElementById("browse-btn");
  var analyzeBtn = document.getElementById("analyze-btn");
  var levelSelect = document.getElementById("level-select");
  var countSelect = document.getElementById("count-select");
  var generateBtn = document.getElementById("generate-btn");
  var saveBtn = document.getElementById("save-btn");
  var statusBar = document.getElementById("status-bar");
  var followUp = document.getElementById("follow-up");
  var fuBackBtn = document.getElementById("fu-back-btn");
  var fuTitle = document.getElementById("fu-title");
  var fuChat = document.getElementById("fu-chat");
  var fuInput = document.getElementById("fu-input");
  var fuSendBtn = document.getElementById("fu-send-btn");
  var tabReview = document.getElementById("tab-review");
  var tabSettings = document.getElementById("tab-settings");
  var tabBtns = document.querySelectorAll(".tab-btn");

  var cfgProvider = document.getElementById("cfg-provider");
  var cfgApiKey = document.getElementById("cfg-apikey");
  var cfgBaseUrl = document.getElementById("cfg-baseurl");
  var cfgModel = document.getElementById("cfg-model");
  var cfgKeyStatus = document.getElementById("cfg-key-status");
  var cfgSaveBtn = document.getElementById("cfg-save-btn");
  var cfgTestBtn = document.getElementById("cfg-test-btn");
  var cfgStatusBar = document.getElementById("cfg-status-bar");
  var cfgProfile = document.getElementById("cfg-profile");
  var cfgName = document.getElementById("cfg-name");
  var cfgDeleteBtn = document.getElementById("cfg-delete-btn");

  var profiles = [];
  var currentProfileId = "";

  var state = vscode.getState() || { questions: [], expandedIds: {}, analyzedContext: "" };
  state.questions = [];
  state.expandedIds = {};
  vscode.setState(state);

  var PROVIDER_DEFAULTS = {
    openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
    deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
    claude: { baseUrl: "https://api.openrouter.ai/api/v1", model: "anthropic/claude-3.5-sonnet" },
    ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
    custom: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  };

  function highlightKeywords(text, keywords) {
    if (!keywords || !keywords.length) return text;
    var escaped = keywords.map(function (kw) {
      return kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
    var regex = new RegExp("(" + escaped.join("|") + ")", "gi");
    return text.replace(regex, '<mark class="kw-highlight">$1</mark>');
  }

  function toggleQuestion(id) {
    if (state.expandedIds[id]) {
      delete state.expandedIds[id];
    } else {
      state.expandedIds[id] = true;
    }
    vscode.setState(state);
    renderQuestions();
  }

  function renderQuestions() {
    if (!questionList) return;

    var html = "";

    if (!state.questions.length) {
      html = '<div class="empty-state">点击"扫描分析"后选择级别生成复盘</div>';
    }

    state.questions.forEach(function (q) {
      var isExpanded = !!state.expandedIds[q.id];
      var chevron = isExpanded ? "\u25BC" : "\u25B6";
      var levelTag = q.level
        ? '<span class="level-tag level-' + q.level.toLowerCase() + '">' + q.level + "</span>"
        : "";

      html += '<div class="q-card" data-id="' + q.id + '">';
      html +=
        '<div class="q-header">' +
        '<span class="q-chevron">' +
        chevron +
        "</span>" +
        '<span class="q-title">' +
        levelTag +
        escapeHtml(q.title) +
        "</span>" +
        "</div>";

      if (isExpanded) {
        html +=
          '<div class="q-answer">' +
          highlightKeywords(escapeHtml(q.answer), q.keywords) +
          "</div>";
        if (q.keywords && q.keywords.length) {
          html +=
            '<div class="q-keywords">' +
            q.keywords
              .map(function (kw) {
                return (
                  '<span class="kw-tag kw-clickable" data-kw="' +
                  escapeHtml(kw) +
                  '">' +
                  escapeHtml(kw) +
                  "</span>"
                );
              })
              .join("") +
            "</div>";
        }
      }

      html += "</div>";
    });

    questionList.innerHTML = html;

    var headers = questionList.querySelectorAll(".q-header");
    for (var i = 0; i < headers.length; i++) {
      headers[i].addEventListener("click", function () {
        var card = this.closest(".q-card");
        if (card) {
          var id = parseInt(card.getAttribute("data-id"), 10);
          toggleQuestion(id);
        }
      });
    }

    var kwTags = questionList.querySelectorAll(".kw-clickable");
    for (var j = 0; j < kwTags.length; j++) {
      kwTags[j].addEventListener("click", function (e) {
        e.stopPropagation();
        var keyword = this.getAttribute("data-kw");
        if (keyword) {
          openFollowUp(keyword);
        }
      });
    }
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function renderMarkdown(text) {
    var escaped = escapeHtml(text);
    escaped = escaped.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return '<pre class="fu-code"><code>' + code.trim() + '</code></pre>';
    });
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    escaped = escaped.replace(/\*(.+?)\*/g, "<em>$1</em>");
    escaped = escaped.replace(/### (.+)/g, "<h4>$1</h4>");
    escaped = escaped.replace(/^---$/gm, "<hr>");
    escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
    escaped = escaped.replace(/\n/g, "<br>");
    return escaped;
  }

  function setStatus(text) {
    if (statusBar) statusBar.textContent = text;
  }

  function setCfgStatus(text) {
    if (cfgStatusBar) cfgStatusBar.textContent = text;
  }

  function switchTab(tabName) {
    tabBtns.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabName);
    });
    tabReview.classList.toggle("hidden", tabName !== "review");
    tabSettings.classList.toggle("hidden", tabName !== "settings");
  }

  function openFollowUp(keyword) {
    if (!followUp || !questionList) return;
    questionList.classList.add("hidden");
    followUp.classList.remove("hidden");
    fuTitle.textContent = "追问: " + keyword;
    if (fuChat) {
      fuChat.innerHTML =
        '<div class="fu-msg assistant">AI: 正在思考关于 <strong>' +
        escapeHtml(keyword) +
        "</strong> 的内容...</div>";
    }
    fuInput.value = "";
    vscode.postMessage({ command: "followUp", keyword: keyword, question: "请解释：" + keyword });
  }

  function closeFollowUp() {
    if (!followUp || !questionList) return;
    questionList.classList.remove("hidden");
    followUp.classList.add("hidden");
  }

  function sendFollowUp() {
    var text = fuInput.value.trim();
    if (!text) return;
    addFuMsg("user", text);
    fuInput.value = "";
    addFuMsg("assistant", "正在思考中...");
    var keyword = fuTitle.textContent.replace("追问: ", "");
    vscode.postMessage({ command: "followUp", keyword: keyword, question: text });
  }

  function addFuMsg(role, text) {
    if (!fuChat) return;
    var div = document.createElement("div");
    div.className = "fu-msg " + role;
    if (role === "assistant") {
      div.innerHTML = "AI: " + renderMarkdown(text);
    } else {
      div.innerHTML = "You: " + escapeHtml(text);
    }
    fuChat.appendChild(div);
    fuChat.scrollTop = fuChat.scrollHeight;
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchTab(this.getAttribute("data-tab"));
    });
  });

  function populateProfileDropdown() {
    cfgProfile.innerHTML = '<option value="">+ 新建配置</option>';
    profiles.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name + (p.hasKey ? "" : " (无Key)");
      cfgProfile.appendChild(opt);
    });
    cfgProfile.value = currentProfileId;
  }

  function loadProfileIntoForm(profile) {
    cfgName.value = profile.name || "";
    cfgProvider.value = profile.provider || "deepseek";
    cfgBaseUrl.value = profile.baseUrl || "";
    cfgModel.value = profile.model || "";
    cfgApiKey.value = "";
    if (profile.hasKey) {
      cfgApiKey.placeholder = "已保存Key: " + (profile.apiKeyMasked || "****");
      cfgKeyStatus.textContent = "Key 已配置，无需重填";
      cfgKeyStatus.className = "cfg-key-status saved";
    } else {
      cfgApiKey.placeholder = "sk-...";
      cfgKeyStatus.textContent = "未配置 Key";
      cfgKeyStatus.className = "cfg-key-status not-set";
    }
  }

  function resetFormToNew() {
    currentProfileId = "";
    cfgProfile.value = "";
    cfgName.value = "";
    cfgApiKey.value = "";
    cfgApiKey.placeholder = "sk-...";
    cfgKeyStatus.textContent = "";
    cfgKeyStatus.className = "cfg-key-status";
    cfgProvider.value = "deepseek";
    var preset = PROVIDER_DEFAULTS.deepseek;
    cfgBaseUrl.value = preset.baseUrl;
    cfgModel.value = preset.model;
  }

  cfgProfile.addEventListener("change", function () {
    if (!this.value) {
      resetFormToNew();
      return;
    }
    currentProfileId = this.value;
    var p = profiles.find(function (x) { return x.id === currentProfileId; });
    if (p) {
      loadProfileIntoForm(p);
      vscode.postMessage({ command: "switchProfile", profileId: p.id });
    }
  });

  cfgDeleteBtn.addEventListener("click", function () {
    if (!currentProfileId) {
      setCfgStatus("请先选择一个已保存的配置");
      return;
    }
    vscode.postMessage({ command: "deleteProfile", profileId: currentProfileId });
  });

  cfgProvider.addEventListener("change", function () {
    var preset = PROVIDER_DEFAULTS[this.value];
    if (preset) {
      if (this.value === "custom") {
        cfgBaseUrl.placeholder = "例如: https://api.example.com/v1";
        cfgModel.placeholder = "例如: your-model-name";
      } else {
        cfgBaseUrl.value = preset.baseUrl;
        cfgModel.value = preset.model;
      }
    }
  });

  cfgSaveBtn.addEventListener("click", function () {
    var apiKey = cfgApiKey.value.trim();
    if (!apiKey) { setCfgStatus("API Key 不能为空（Key 已保存的配置可直接保存更新）"); return; }
    setCfgStatus("Saving...");
    vscode.postMessage({
      command: "saveConfig",
      profileId: currentProfileId || undefined,
      name: cfgName.value.trim() || cfgProvider.value,
      provider: cfgProvider.value,
      apiKey: apiKey,
      baseUrl: cfgBaseUrl.value.trim(),
      model: cfgModel.value.trim(),
    });
  });

  cfgTestBtn.addEventListener("click", function () {
    setCfgStatus("Testing...");
    vscode.postMessage({ command: "testConnection" });
  });

  browseBtn.addEventListener("click", function () {
    vscode.postMessage({ command: "browse" });
  });

  analyzeBtn.addEventListener("click", function () {
    var path = projectPathEl.value.trim();
    if (!path) { setStatus("Please enter a project path"); return; }
    setStatus("Scanning...");
    analyzeBtn.disabled = true;
    generateBtn.disabled = true;
    vscode.postMessage({ command: "analyze", path: path });
  });

  generateBtn.addEventListener("click", function () {
    if (!state.analyzedContext) { setStatus("请先扫描项目"); return; }
    var level = levelSelect.value;
    var count = parseInt(countSelect.value, 10) || 3;
    setStatus("正在生成 " + level + " 复盘（" + count + " 题）...");
    generateBtn.disabled = true;
    saveBtn.disabled = true;
    vscode.postMessage({ command: "generate", level: level, context: state.analyzedContext, count: count });
  });

  saveBtn.addEventListener("click", function () {
    if (!state.questions.length) { setStatus("请先生成复盘"); return; }
    saveBtn.disabled = true;
    vscode.postMessage({
      command: "saveSession",
      path: projectPathEl.value.trim(),
      level: levelSelect.value,
      questions: state.questions,
    });
  });

  fuBackBtn.addEventListener("click", closeFollowUp);
  fuSendBtn.addEventListener("click", sendFollowUp);
  fuInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); sendFollowUp(); }
  });

  window.addEventListener("message", function (event) {
    var message = event.data;

    switch (message.command) {
      case "setProjectPath":
        projectPathEl.value = message.path;
        break;
      case "projectPathSet":
        projectPathEl.value = message.path;
        break;
      case "status":
        setStatus(message.text);
        break;
      case "analyzeResult":
        state.analyzedContext = message.result;
        vscode.setState(state);
        setStatus("Scan complete. Select level and click '生成复盘'.");
        generateBtn.disabled = false;
        analyzeBtn.disabled = false;
        break;
      case "loadQuestions":
        state.questions = message.questions || [];
        state.expandedIds = {};
        vscode.setState(state);
        renderQuestions();
        setStatus("已生成 " + state.questions.length + " 个问题。");
        generateBtn.disabled = false;
        analyzeBtn.disabled = false;
        saveBtn.disabled = state.questions.length === 0;
        break;
      case "sessionSaved":
        setStatus(message.text);
        break;
      case "loadConfig":
        profiles = message.profiles || [];
        currentProfileId = message.activeId || "";
        populateProfileDropdown();
        if (message.config) {
          var activeProfile = profiles.find(function (p) { return p.id === currentProfileId; });
          if (activeProfile) {
            loadProfileIntoForm(activeProfile);
          } else {
            resetFormToNew();
          }
        }
        break;
      case "configSaved":
        profiles = message.profiles || [];
        currentProfileId = message.profile.id || "";
        populateProfileDropdown();
        loadProfileIntoForm(message.profile);
        setCfgStatus("配置已保存：" + message.profile.name);
        break;
      case "configDeleted":
        profiles = message.profiles || [];
        currentProfileId = message.activeId || "";
        populateProfileDropdown();
        if (currentProfileId) {
          var p = profiles.find(function (x) { return x.id === currentProfileId; });
          if (p) loadProfileIntoForm(p);
        } else {
          resetFormToNew();
        }
        setCfgStatus("配置已删除");
        break;
      case "profileSwitched":
        setCfgStatus("已切换到当前配置");
        break;
      case "testResult":
        setCfgStatus(message.success ? "OK: " + message.text : "Failed: " + message.text);
        break;
      case "fuReply":
        if (fuChat) {
          var msgs = fuChat.querySelectorAll(".fu-msg.assistant");
          for (var k = msgs.length - 1; k >= 0; k--) {
            if (msgs[k].textContent.indexOf("正在思考") !== -1) {
              msgs[k].remove();
            }
          }
        }
        addFuMsg("assistant", message.text);
        break;
    }
  });

  renderQuestions();

  vscode.postMessage({ command: "ready" });
})();
