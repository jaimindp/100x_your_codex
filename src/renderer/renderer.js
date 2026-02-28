const linearApiKeyInput = document.getElementById("linear-api-key");
const linearTeamKeyInput = document.getElementById("linear-team-key");
const linearSaveSettingsBtn = document.getElementById("linear-save-settings");
const graphLoadLinearBtn = document.getElementById("graph-load-linear");
const graphLoadMockBtn = document.getElementById("graph-load-mock");
const graphControlsPanel = document.getElementById("graph-controls-panel");
const graphStatusEl = document.getElementById("graph-status");
const settingsStatusEl = document.getElementById("settings-status");
const graphOutputEl = document.getElementById("graph-output");
const graphDetailsEl = document.getElementById("graph-details");
const depMapStatusEl = document.getElementById("dep-map-status");
const depMapOutputEl = document.getElementById("dep-map-output");
const graphZoomInBtn = document.getElementById("graph-zoom-in");
const graphZoomOutBtn = document.getElementById("graph-zoom-out");
const graphZoomResetBtn = document.getElementById("graph-zoom-reset");
const graphNavHintEl = document.getElementById("graph-nav-hint");
const depMapZoomInBtn = document.getElementById("dep-map-zoom-in");
const depMapZoomOutBtn = document.getElementById("dep-map-zoom-out");
const depMapZoomResetBtn = document.getElementById("dep-map-zoom-reset");
const depMapNavHintEl = document.getElementById("dep-map-nav-hint");
const screenTitleEl = document.getElementById("screen-title");
const screenSubtitleEl = document.getElementById("screen-subtitle");
const lastRefreshValueEl = document.getElementById("last-refresh-value");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const themeToggleGlyph = document.getElementById("theme-toggle-glyph");
const navButtons = Array.from(document.querySelectorAll(".nav-btn"));
const screenPanels = Array.from(document.querySelectorAll("[data-screen-panel]"));

let graphIssuesByNodeId = new Map();
let isGraphLoadInFlight = false;
let graphZoomLevel = 1;
let graphDefaultZoomLevel = 1;
let graphBaseSize = { width: 0, height: 0 };
let graphPanState = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  startScrollLeft: 0,
  startScrollTop: 0
};
let depMapZoomLevel = 1;
let depMapDefaultZoomLevel = 1;
let depMapBaseSize = { width: 0, height: 0 };
let depMapPanState = {
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  startScrollLeft: 0,
  startScrollTop: 0
};
let currentScreenId = "overview";
let currentTheme = "dark";

const LINEAR_API_URL = "https://api.linear.app/graphql";
const GRAPH_ZOOM_MIN = 0.4;
const GRAPH_ZOOM_MAX = 2.2;
const GRAPH_ZOOM_STEP = 0.15;
const GRAPH_LABEL_WRAP_CHARS = 26;
const GRAPH_LABEL_MAX_LINES = 3;
const DEP_MAP_LABEL_MAX_LINES = 2;
const DEPENDENCY_TASKS = [
  { id: "H10", key: "hack-10", title: "app-db-and-ingestion-core", status: "inprog" },
  { id: "H11", key: "hack-11", title: "usage-cost-dashboard", status: "blocked" },
  { id: "H12", key: "hack-12", title: "timeline-git-health", status: "blocked" },
  { id: "H13", key: "hack-13", title: "linear-env-persistence", status: "inprog" },
  { id: "H14", key: "hack-14", title: "electron-cleanup", status: "inprog" },
  { id: "H15", key: "hack-15", title: "linear-relation-graph", status: "blocked" },
  { id: "H16", key: "hack-16", title: "graph-filters-and-export", status: "blocked" },
  { id: "H17", key: "hack-17", title: "demo-polish-and-packaging", status: "blocked" },
  { id: "H18", key: "hack-18", title: "mcp-and-skill-tracking", status: "blocked" },
  { id: "H19", key: "hack-19", title: "live-sessions-and-credit-context", status: "blocked" },
  { id: "H20", key: "hack-20", title: "worktree-and-dependency-map-tracking", status: "blocked" },
  { id: "H21", key: "hack-21", title: "cross-view-correlation-and-polish", status: "blocked" },
  { id: "H22", key: "hack-22", title: "video-creation", status: "blocked" },
  { id: "H23", key: "hack-23", title: "demo-link-setup", status: "blocked" },
  { id: "H24", key: "hack-24", title: "linear-graph-reliability-and-security", status: "blocked" },
  { id: "H25", key: "hack-25", title: "app-shell-integration-and-shared-nav", status: "inprog" },
  { id: "H26", key: "hack-26", title: "functional-test-pass", status: "blocked" },
  { id: "H27", key: "hack-27", title: "regression-test-pass", status: "blocked" },
  { id: "H28", key: "hack-28", title: "performance-target-validation", status: "blocked" },
  { id: "H29", key: "hack-29", title: "submission-docs-and-packaging", status: "blocked" },
  { id: "H30", key: "hack-30", title: "worktree-commit-timelines", status: "blocked" },
  { id: "H31", key: "hack-31", title: "mcp-health", status: "blocked" },
  { id: "H32", key: "hack-32", title: "linear-done-ticket-build-launch", status: "blocked" },
  { id: "H33", key: "hack-33", title: "local-server-management", status: "blocked" },
  { id: "H34", key: "hack-34", title: "dependency-map-interactive-navigation", status: "inprog" },
  { id: "H35", key: "hack-35", title: "remove-linear-issue-graph-intro-text", status: "inprog" },
  { id: "H36", key: "hack-36", title: "codex-model-and-cost-usage-tracking", status: "blocked" }
];
const DEPENDENCY_EDGES = [
  ["H10", "H11"],
  ["H10", "H12"],
  ["H10", "H15"],
  ["H10", "H18"],
  ["H10", "H19"],
  ["H10", "H20"],
  ["H13", "H15"],
  ["H14", "H12"],
  ["H15", "H16"],
  ["H16", "H24"],
  ["H18", "H21"],
  ["H19", "H21"],
  ["H20", "H21"],
  ["H16", "H21"],
  ["H12", "H30"],
  ["H20", "H30"],
  ["H18", "H31"],
  ["H23", "H32"],
  ["H20", "H32"],
  ["H10", "H33"],
  ["H10", "H36"],
  ["H14", "H33"],
  ["H30", "H17"],
  ["H31", "H17"],
  ["H32", "H17"],
  ["H33", "H17"],
  ["H36", "H17"],
  ["H24", "H25"],
  ["H21", "H25"],
  ["H11", "H17"],
  ["H12", "H17"],
  ["H25", "H17"],
  ["H17", "H22"],
  ["H22", "H23"],
  ["H17", "H26"],
  ["H26", "H27"],
  ["H27", "H28"],
  ["H23", "H29"],
  ["H28", "H29"]
];
const SCREEN_META = {
  overview: {
    title: "Overview",
    subtitle: "Shared app shell and cross-screen navigation."
  },
  "build-chart": {
    title: "Build Chart",
    subtitle: "Parent/sub-issue and blocker relationships."
  },
  agents: {
    title: "Agents",
    subtitle: "Active agent sessions and status."
  },
  usage: {
    title: "Usage",
    subtitle: "Usage, timeline, and credits/context visibility."
  },
  "mcp-skills": {
    title: "MCP + Skills",
    subtitle: "Tool/server usage and skill activity."
  },
  "git-worktrees": {
    title: "Git + Worktrees",
    subtitle: "Branch/worktree health."
  },
  health: {
    title: "Health",
    subtitle: "Operational reliability signals."
  },
  settings: {
    title: "Settings",
    subtitle: "Runtime configuration."
  }
};

if (window.mermaid) {
  window.mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "neutral",
    flowchart: {
      curve: "linear",
      defaultRenderer: "dagre",
      nodeSpacing: 18,
      rankSpacing: 56
    }
  });
}

window.onGraphNodeClick = (nodeId) => {
  const issue = graphIssuesByNodeId.get(nodeId);
  if (!issue || !graphDetailsEl) {
    return;
  }
  renderGraphDetails(issue);
};

initializeNavigation();
initializeThemeControls();
initializeGraphNavigationControls();
initializeDependencyMapNavigationControls();
renderDependencyMapGraph();

if (graphLoadMockBtn) {
  graphLoadMockBtn.addEventListener("click", async () => {
    setGraphStatus("Graph status: rendering mock data...");
    try {
      const issues = getMockIssues();
      await renderIssueGraph(issues);
      setGraphStatus(`Graph status: rendered ${issues.length} mock issues`);
      updateLastRefresh("Build Chart (mock)");
    } catch (error) {
      setGraphStatus(`Graph status: ${errorMessage(error)}`);
    }
  });
}

if (graphLoadLinearBtn && linearApiKeyInput && linearTeamKeyInput) {
  graphLoadLinearBtn.addEventListener("click", () => loadLinearIssuesFromInputs(false));
}

if (linearSaveSettingsBtn && linearApiKeyInput && linearTeamKeyInput) {
  linearSaveSettingsBtn.addEventListener("click", saveLinearSettingsFromInputs);
}

loadLinearSettings();

function initializeThemeControls() {
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      setThemePreference(currentTheme === "dark" ? "light" : "dark");
    });
  }

  loadThemeSettings();
}

async function loadThemeSettings() {
  if (!window.monitor?.themeSettings) {
    applyTheme("dark");
    return;
  }

  try {
    const settings = await window.monitor.themeSettings.get();
    applyTheme(settings?.theme || "dark");
  } catch (error) {
    applyTheme("dark");
    console.warn("Theme settings load failed:", errorMessage(error));
  }
}

async function setThemePreference(theme) {
  const normalizedTheme = normalizeTheme(theme);
  applyTheme(normalizedTheme);

  if (!window.monitor?.themeSettings) {
    return;
  }

  try {
    await window.monitor.themeSettings.save({ theme: normalizedTheme });
  } catch (error) {
    setGraphStatus(`Graph status: could not save theme (${errorMessage(error)})`);
  }
}

function normalizeTheme(theme) {
  return theme === "light" ? "light" : "dark";
}

function applyTheme(theme) {
  const normalizedTheme = normalizeTheme(theme);
  currentTheme = normalizedTheme;
  document.documentElement.setAttribute("data-theme", normalizedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.setAttribute(
      "aria-label",
      normalizedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
    themeToggleBtn.setAttribute(
      "title",
      normalizedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
    themeToggleBtn.setAttribute("aria-pressed", String(normalizedTheme === "light"));
  }
  if (themeToggleGlyph) {
    themeToggleGlyph.textContent = normalizedTheme === "dark" ? "🌙" : "☀";
  }
}

function initializeNavigation() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetScreen = button.dataset.screen;
      if (!targetScreen) {
        return;
      }
      setActiveScreen(targetScreen);
    });
  });

  setActiveScreen(currentScreenId);
}

function setActiveScreen(screenId) {
  currentScreenId = screenId;
  navButtons.forEach((button) => {
    const isActive = button.dataset.screen === screenId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  screenPanels.forEach((panel) => {
    const isActive = panel.dataset.screenPanel === screenId;
    panel.classList.toggle("is-active", isActive);
  });

  const meta = SCREEN_META[screenId];
  if (meta && screenTitleEl && screenSubtitleEl) {
    screenTitleEl.textContent = meta.title;
    screenSubtitleEl.textContent = meta.subtitle;
  }
}

function setGraphStatus(message) {
  if (graphStatusEl) {
    graphStatusEl.textContent = message;
  }
}

function setSettingsStatus(message) {
  if (settingsStatusEl) {
    settingsStatusEl.textContent = message;
  }
}

function setDepMapStatus(message) {
  if (depMapStatusEl) {
    depMapStatusEl.textContent = message;
  }
}

function updateLastRefresh(sourceName) {
  if (!lastRefreshValueEl) {
    return;
  }

  const now = new Date();
  lastRefreshValueEl.textContent = `${now.toLocaleTimeString()} (${sourceName})`;
}

async function renderDependencyMapGraph() {
  if (!window.mermaid || !depMapOutputEl) {
    setDepMapStatus("Dependency map status: Mermaid is not loaded");
    return;
  }

  setDepMapStatus("Dependency map status: rendering...");
  try {
    const graphText = buildDependencyMapMermaid();
    const renderId = `dependency-map-${Date.now()}`;
    const rendered = await window.mermaid.render(renderId, graphText);
    depMapOutputEl.innerHTML = rendered.svg;
    if (typeof rendered.bindFunctions === "function") {
      rendered.bindFunctions(depMapOutputEl);
    }
    initializeDepMapZoomForRenderedSvg();
    setDepMapStatus(
      `Dependency map status: rendered ${DEPENDENCY_TASKS.length} tasks and ${DEPENDENCY_EDGES.length} dependencies`
    );
  } catch (error) {
    setDepMapStatus(`Dependency map status: ${errorMessage(error)}`);
  }
}

function buildDependencyMapMermaid() {
  const lines = ["flowchart TB"];

  DEPENDENCY_TASKS.forEach((task) => {
    const wrappedTitle = wrapLabelText(task.title, GRAPH_LABEL_WRAP_CHARS, DEP_MAP_LABEL_MAX_LINES);
    lines.push(`${task.id}["${sanitizeLabel(`${task.key}<br/>${wrappedTitle}`)}"]:::${task.status}`);
  });

  DEPENDENCY_EDGES.forEach(([source, target]) => {
    lines.push(`${source} --> ${target}`);
  });

  lines.push("classDef todo fill:#e2e3e5,stroke:#6c757d,color:#343a40");
  lines.push("classDef inprog fill:#fff3cd,stroke:#b58900,color:#664d03");
  lines.push("classDef done fill:#d7f7e3,stroke:#1e8e3e,color:#0f5132");
  lines.push("classDef blocked fill:#f8d7da,stroke:#b02a37,color:#58151c");
  return lines.join("\n");
}

async function loadLinearSettings() {
  if (!linearApiKeyInput || !linearTeamKeyInput || !window.monitor?.linearSettings) {
    setSettingsStatus("Settings status: secure settings storage unavailable");
    return;
  }

  try {
    const settings = await window.monitor.linearSettings.get();
    linearApiKeyInput.value = settings.apiKey || "";
    linearTeamKeyInput.value = settings.teamKey || "";
    if (settings.apiKey && settings.teamKey) {
      setSettingsStatus(`Settings status: loaded saved settings for team ${settings.teamKey}`);
      await loadLinearIssuesFromInputs(true);
      collapseGraphSettingsIfConfigured(settings.apiKey, settings.teamKey);
      return;
    }
    setSettingsStatus("Settings status: no saved connection settings found");
  } catch (error) {
    const message = errorMessage(error);
    setSettingsStatus(`Settings status: could not load .env settings (${message})`);
    setGraphStatus(`Graph status: could not load .env settings (${message})`);
  }
}

async function saveLinearSettingsFromInputs() {
  if (!linearSaveSettingsBtn || !graphLoadLinearBtn) {
    return;
  }

  try {
    const { apiKey, teamKey } = getValidatedLinearInputs();
    linearSaveSettingsBtn.disabled = true;
    graphLoadLinearBtn.disabled = true;
    await persistLinearSettings(apiKey, teamKey);
    setSettingsStatus(`Settings status: saved connection settings for ${teamKey}`);
    collapseGraphSettingsIfConfigured(apiKey, teamKey);
  } catch (error) {
    setSettingsStatus(`Settings status: ${errorMessage(error)}`);
  } finally {
    linearSaveSettingsBtn.disabled = false;
    graphLoadLinearBtn.disabled = false;
  }
}

async function persistLinearSettings(apiKey, teamKey) {
  if (!window.monitor?.linearSettings) {
    throw new Error("secure settings storage unavailable");
  }
  await window.monitor.linearSettings.save({ apiKey, teamKey });
}

function getValidatedLinearInputs() {
  if (!linearApiKeyInput || !linearTeamKeyInput) {
    throw new Error("settings form is unavailable");
  }

  const apiKey = linearApiKeyInput.value.trim();
  const teamKey = linearTeamKeyInput.value.trim().toUpperCase();

  if (!apiKey || !teamKey) {
    throw new Error("enter API key and team key");
  }

  if (!/^[A-Z0-9_-]+$/.test(teamKey)) {
    throw new Error("team key can contain only letters, numbers, hyphens, and underscores");
  }

  linearTeamKeyInput.value = teamKey;
  return { apiKey, teamKey };
}

function collapseGraphSettingsIfConfigured(apiKey, teamKey) {
  if (!graphControlsPanel) {
    return;
  }

  const hasApiKey = Boolean(String(apiKey || "").trim());
  const hasTeamKey = Boolean(String(teamKey || "").trim());
  if (hasApiKey && hasTeamKey) {
    graphControlsPanel.open = false;
  }
}

async function loadLinearIssuesFromInputs(isAutoLoad) {
  if (!graphLoadLinearBtn || !linearApiKeyInput || !linearTeamKeyInput) {
    return;
  }
  if (isGraphLoadInFlight) {
    return;
  }

  let apiKey = "";
  let teamKey = "";
  try {
    const validated = getValidatedLinearInputs();
    apiKey = validated.apiKey;
    teamKey = validated.teamKey;
  } catch (error) {
    const message = errorMessage(error);
    setSettingsStatus(`Settings status: ${message}`);
    setGraphStatus(`Graph status: ${message}`);
    return;
  }

  isGraphLoadInFlight = true;
  setGraphStatus(
    isAutoLoad ? "Graph status: auto-loading saved Linear issues..." : "Graph status: loading team..."
  );
  setSettingsStatus("Settings status: loading issues with saved connection settings...");
  graphLoadLinearBtn.disabled = true;
  if (linearSaveSettingsBtn) {
    linearSaveSettingsBtn.disabled = true;
  }

  try {
    await persistLinearSettings(apiKey, teamKey);
    const team = await getTeamByKey(apiKey, teamKey);
    if (!team) {
      setGraphStatus(`Graph status: team "${teamKey}" not found`);
      setSettingsStatus(`Settings status: team "${teamKey}" not found`);
      return;
    }
    setGraphStatus(`Graph status: loading issues for ${team.name}...`);
    const issues = await getTeamIssues(apiKey, team.id);
    await renderIssueGraph(issues);
    setGraphStatus(`Graph status: rendered ${issues.length} issues from ${team.key}`);
    updateLastRefresh("Build Chart");
    setSettingsStatus(`Settings status: saved and loaded ${issues.length} issues from ${team.key}`);
    collapseGraphSettingsIfConfigured(apiKey, teamKey);
  } catch (error) {
    const message = errorMessage(error);
    setGraphStatus(`Graph status: ${message}`);
    setSettingsStatus(`Settings status: ${message}`);
  } finally {
    isGraphLoadInFlight = false;
    graphLoadLinearBtn.disabled = false;
    if (linearSaveSettingsBtn) {
      linearSaveSettingsBtn.disabled = false;
    }
  }
}

function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function renderIssueGraph(issues) {
  if (!window.mermaid || !graphOutputEl) {
    throw new Error("Mermaid is not loaded");
  }

  const graphModel = buildMermaidFlowchart(issues);
  graphIssuesByNodeId = graphModel.issueMap;

  const renderId = `linear-graph-${Date.now()}`;
  const rendered = await window.mermaid.render(renderId, graphModel.text);
  graphOutputEl.innerHTML = rendered.svg;
  if (typeof rendered.bindFunctions === "function") {
    rendered.bindFunctions(graphOutputEl);
  }
  initializeGraphZoomForRenderedSvg();
  if (graphDetailsEl) {
    graphDetailsEl.textContent = "Click a node to inspect an issue.";
  }
}

function buildMermaidFlowchart(issues) {
  const lines = ["flowchart TB"];
  const issueMap = new Map();
  const drawnEdges = new Set();

  issues.forEach((issue, index) => {
    const nodeId = `I${index + 1}`;
    const className = issue.state?.type === "completed" ? "done" : "active";
    const nodeLabel = formatIssueNodeLabel(issue);
    issueMap.set(nodeId, issue);
    lines.push(`${nodeId}["${sanitizeLabel(nodeLabel)}"]:::${className}`);
    lines.push(`click ${nodeId} onGraphNodeClick "Open issue details"`);
  });

  const linearIdToNodeId = new Map();
  issueMap.forEach((issue, nodeId) => {
    linearIdToNodeId.set(issue.id, nodeId);
  });

  issues.forEach((issue) => {
    if (!issue.parent || !issue.parent.id) {
      return;
    }
    const parentNodeId = linearIdToNodeId.get(issue.parent.id);
    const childNodeId = linearIdToNodeId.get(issue.id);
    if (parentNodeId && childNodeId) {
      const edgeKey = `${parentNodeId}->${childNodeId}:parent`;
      if (!drawnEdges.has(edgeKey)) {
        lines.push(`${parentNodeId} -->|parent| ${childNodeId}`);
        drawnEdges.add(edgeKey);
      }
    }
  });

  issues.forEach((issue) => {
    const relationGroups = [issue.relations, issue.inverseRelations];
    relationGroups.forEach((group) => {
      const relationNodes = Array.isArray(group?.nodes) ? group.nodes : [];
      relationNodes.forEach((relation) => {
        const type = String(relation?.type || "").toLowerCase();
        if (!type.includes("block")) {
          return;
        }

        const sourceIssueId = relation?.issue?.id;
        const targetIssueId = relation?.relatedIssue?.id;
        if (!sourceIssueId || !targetIssueId || sourceIssueId === targetIssueId) {
          return;
        }

        const sourceNodeId = linearIdToNodeId.get(sourceIssueId);
        const targetNodeId = linearIdToNodeId.get(targetIssueId);
        if (!sourceNodeId || !targetNodeId) {
          return;
        }

        const edgeKey = `${sourceNodeId}->${targetNodeId}:blocker`;
        if (!drawnEdges.has(edgeKey)) {
          lines.push(`${sourceNodeId} -->|blocks| ${targetNodeId}`);
          drawnEdges.add(edgeKey);
        }
      });
    });
  });

  lines.push("classDef active fill:#dce8ff,stroke:#3973d8,color:#10264f");
  lines.push("classDef done fill:#daf6df,stroke:#2d8a42,color:#12331d");

  return {
    text: lines.join("\n"),
    issueMap
  };
}

function renderGraphDetails(issue) {
  if (!graphDetailsEl) {
    return;
  }

  const safeId = escapeHtml(issue.identifier || "");
  const safeTitle = escapeHtml(issue.title || "");
  const safeState = escapeHtml(issue.state?.name || "Unknown");
  const safePriority = escapeHtml(priorityLabel(issue.priority));
  const safeAssignee = escapeHtml(issue.assignee?.name || "Unassigned");
  const safeUpdated = escapeHtml(formatDate(issue.updatedAt));
  const safeUrl = escapeAttribute(issue.url || "https://linear.app");

  graphDetailsEl.innerHTML = `
    <div class="detail-issue-id">${safeId}</div>
    <div class="detail-item"><strong>${safeTitle}</strong></div>
    <div class="detail-item">State: ${safeState}</div>
    <div class="detail-item">Priority: ${safePriority}</div>
    <div class="detail-item">Assignee: ${safeAssignee}</div>
    <div class="detail-item">Updated: ${safeUpdated}</div>
    <div class="detail-item"><a href="${safeUrl}" target="_blank" rel="noreferrer">Open in Linear</a></div>
  `;
}

function formatDate(isoTimestamp) {
  if (!isoTimestamp) {
    return "Unknown";
  }
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString();
}

function priorityLabel(priority) {
  switch (priority) {
    case 1:
      return "Urgent";
    case 2:
      return "High";
    case 3:
      return "Normal";
    case 4:
      return "Low";
    default:
      return "No priority";
  }
}

function sanitizeLabel(value) {
  return String(value).replace(/"/g, "'").replace(/\n/g, " ");
}

function formatIssueNodeLabel(issue) {
  const identifier = String(issue?.identifier || "ISSUE").trim();
  const title = String(issue?.title || "Untitled").trim();
  const wrappedTitle = wrapLabelText(title, GRAPH_LABEL_WRAP_CHARS, GRAPH_LABEL_MAX_LINES);
  return `${identifier}<br/>${wrappedTitle}`;
}

function wrapLabelText(inputText, maxCharsPerLine, maxLines) {
  const words = String(inputText || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (!words.length) {
    return "Untitled";
  }

  const lines = [];
  let currentLine = "";
  const pushLine = (line) => {
    if (line) {
      lines.push(line);
    }
  };

  for (const word of words) {
    if (lines.length >= maxLines) {
      break;
    }

    if (word.length > maxCharsPerLine) {
      if (currentLine) {
        pushLine(currentLine);
        currentLine = "";
      }
      let index = 0;
      while (index < word.length && lines.length < maxLines) {
        const chunk = word.slice(index, index + maxCharsPerLine);
        const isTail = index + maxCharsPerLine >= word.length;
        if (!isTail && lines.length + 1 === maxLines) {
          lines.push(`${chunk.slice(0, Math.max(1, maxCharsPerLine - 1))}…`);
          index = word.length;
          break;
        }
        lines.push(chunk);
        index += maxCharsPerLine;
      }
      continue;
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
      continue;
    }

    pushLine(currentLine);
    currentLine = word;
  }

  if (lines.length < maxLines) {
    pushLine(currentLine);
  }

  const didTruncate = lines.length >= maxLines && words.join(" ").length > lines.join(" ").length;
  if (didTruncate) {
    const lastIndex = lines.length - 1;
    if (lastIndex >= 0 && !lines[lastIndex].endsWith("…")) {
      lines[lastIndex] = `${lines[lastIndex].slice(0, Math.max(1, maxCharsPerLine - 1))}…`;
    }
  }

  return lines.slice(0, maxLines).join("<br/>");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

async function getTeamByKey(apiKey, teamKey) {
  const query = `
    query Teams {
      teams(first: 100) {
        nodes {
          id
          key
          name
        }
      }
    }
  `;
  const data = await linearGraphqlRequest(apiKey, query);
  const nodes = (data && data.teams && data.teams.nodes) || [];
  return nodes.find((team) => String(team.key).toUpperCase() === teamKey) || null;
}

async function getTeamIssues(apiKey, teamId) {
  const allIssues = [];
  let hasNextPage = true;
  let after = null;

  while (hasNextPage) {
    const query = `
      query TeamIssues($teamId: String!, $after: String) {
        team(id: $teamId) {
          issues(first: 100, after: $after, includeArchived: false) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              identifier
              title
              url
              priority
              updatedAt
              assignee {
                name
              }
              state {
                name
                type
              }
              parent {
                id
              }
              relations(first: 50) {
                nodes {
                  type
                  issue {
                    id
                  }
                  relatedIssue {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `;
    const data = await linearGraphqlRequest(apiKey, query, { teamId, after });
    if (!data || !data.team || !data.team.issues) {
      break;
    }
    const page = data.team.issues;
    if (Array.isArray(page.nodes)) {
      allIssues.push(...page.nodes);
    }
    hasNextPage = Boolean(page.pageInfo && page.pageInfo.hasNextPage);
    after = page.pageInfo ? page.pageInfo.endCursor : null;
  }

  return allIssues;
}

async function linearGraphqlRequest(apiKey, query, variables = {}) {
  const response = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey
    },
    body: JSON.stringify({ query, variables })
  });

  const rawBody = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const graphqlMessage =
      payload && Array.isArray(payload.errors) && payload.errors[0] && payload.errors[0].message;
    if (graphqlMessage) {
      throw new Error(`Linear API request failed (${response.status}): ${graphqlMessage}`);
    }
    throw new Error(`Linear API request failed with status ${response.status}`);
  }

  if (payload.errors && payload.errors.length > 0) {
    throw new Error(payload.errors[0].message || "Linear API returned an error");
  }

  return payload ? payload.data : null;
}

function getMockIssues() {
  const now = new Date().toISOString();
  return [
    {
      id: "1",
      identifier: "ENG-101",
      title: "Graph MVP",
      url: "https://linear.app",
      priority: 2,
      updatedAt: now,
      assignee: { name: "Owner" },
      state: { name: "In Progress", type: "started" },
      parent: null,
      relations: { nodes: [] },
      inverseRelations: { nodes: [] }
    },
    {
      id: "2",
      identifier: "ENG-102",
      title: "Linear sync",
      url: "https://linear.app",
      priority: 2,
      updatedAt: now,
      assignee: { name: "Backend" },
      state: { name: "Todo", type: "unstarted" },
      parent: { id: "1" },
      relations: { nodes: [] },
      inverseRelations: { nodes: [] }
    },
    {
      id: "3",
      identifier: "ENG-103",
      title: "Interactive details panel",
      url: "https://linear.app",
      priority: 3,
      updatedAt: now,
      assignee: { name: "Frontend" },
      state: { name: "Todo", type: "unstarted" },
      parent: { id: "1" },
      relations: { nodes: [] },
      inverseRelations: { nodes: [] }
    },
    {
      id: "4",
      identifier: "ENG-104",
      title: "Webhook delta sync",
      url: "https://linear.app",
      priority: 1,
      updatedAt: now,
      assignee: { name: "Infra" },
      state: { name: "Backlog", type: "backlog" },
      parent: { id: "2" },
      relations: {
        nodes: [
          {
            type: "blocks",
            issue: { id: "2" },
            relatedIssue: { id: "4" }
          }
        ]
      },
      inverseRelations: { nodes: [] }
    }
  ];
}

function initializeGraphNavigationControls() {
  updateGraphZoomControls();

  if (graphZoomInBtn) {
    graphZoomInBtn.addEventListener("click", () => setGraphZoom(graphZoomLevel + GRAPH_ZOOM_STEP));
  }
  if (graphZoomOutBtn) {
    graphZoomOutBtn.addEventListener("click", () => setGraphZoom(graphZoomLevel - GRAPH_ZOOM_STEP));
  }
  if (graphZoomResetBtn) {
    graphZoomResetBtn.addEventListener("click", () => setGraphZoom(graphDefaultZoomLevel));
  }

  if (!graphOutputEl) {
    return;
  }

  graphOutputEl.addEventListener("pointerdown", onGraphPointerDown);
  graphOutputEl.addEventListener("pointermove", onGraphPointerMove);
  graphOutputEl.addEventListener("pointerup", onGraphPointerUp);
  graphOutputEl.addEventListener("pointercancel", stopGraphPanning);
  graphOutputEl.addEventListener("lostpointercapture", stopGraphPanning);
  graphOutputEl.addEventListener("wheel", onGraphWheel, { passive: false });
}

function initializeGraphZoomForRenderedSvg() {
  const svg = getGraphSvg();
  if (!svg || !graphOutputEl) {
    graphBaseSize = { width: 0, height: 0 };
    graphZoomLevel = 1;
    graphDefaultZoomLevel = 1;
    updateGraphZoomControls();
    return;
  }

  const baseSize = computeGraphBaseSize(svg);
  graphBaseSize = baseSize;
  graphDefaultZoomLevel = computeGraphFitZoom(baseSize, graphOutputEl);
  graphZoomLevel = graphDefaultZoomLevel;
  applyGraphZoom();
  graphOutputEl.scrollTop = 0;
  graphOutputEl.scrollLeft = 0;
}

function computeGraphBaseSize(svg) {
  const viewBox = svg.viewBox && svg.viewBox.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return {
      width: viewBox.width,
      height: viewBox.height
    };
  }

  const attrWidth = Number.parseFloat(String(svg.getAttribute("width") || ""));
  const attrHeight = Number.parseFloat(String(svg.getAttribute("height") || ""));
  if (Number.isFinite(attrWidth) && Number.isFinite(attrHeight) && attrWidth > 0 && attrHeight > 0) {
    return {
      width: attrWidth,
      height: attrHeight
    };
  }

  const bounds = svg.getBoundingClientRect();
  return {
    width: Math.max(1, bounds.width || 1200),
    height: Math.max(1, bounds.height || 700)
  };
}

function computeGraphFitZoom(baseSize, outputEl) {
  if (!outputEl || !baseSize.width) {
    return 1;
  }
  const horizontalPadding = 22;
  const availableWidth = Math.max(1, outputEl.clientWidth - horizontalPadding);
  const widthFitZoom = availableWidth / baseSize.width;
  return clampGraphZoom(Math.min(1, widthFitZoom));
}

function getGraphSvg() {
  if (!graphOutputEl) {
    return null;
  }
  return graphOutputEl.querySelector("svg");
}

function applyGraphZoom() {
  const svg = getGraphSvg();
  if (!svg || !graphBaseSize.width || !graphBaseSize.height) {
    updateGraphZoomControls();
    return;
  }

  svg.style.width = `${Math.round(graphBaseSize.width * graphZoomLevel)}px`;
  svg.style.height = `${Math.round(graphBaseSize.height * graphZoomLevel)}px`;
  updateGraphZoomControls();
}

function clampGraphZoom(nextZoom) {
  return Math.max(GRAPH_ZOOM_MIN, Math.min(GRAPH_ZOOM_MAX, nextZoom));
}

function setGraphZoom(nextZoom, options = {}) {
  if (!graphOutputEl) {
    return;
  }

  const clampedZoom = clampGraphZoom(nextZoom);
  const previousZoom = graphZoomLevel;
  if (Math.abs(clampedZoom - previousZoom) < 0.001) {
    updateGraphZoomControls();
    return;
  }

  const anchorX =
    typeof options.anchorX === "number" ? options.anchorX : graphOutputEl.clientWidth / 2;
  const anchorY =
    typeof options.anchorY === "number" ? options.anchorY : graphOutputEl.clientHeight / 2;
  const contentX = (graphOutputEl.scrollLeft + anchorX) / previousZoom;
  const contentY = (graphOutputEl.scrollTop + anchorY) / previousZoom;

  graphZoomLevel = clampedZoom;
  applyGraphZoom();

  graphOutputEl.scrollLeft = Math.max(0, contentX * graphZoomLevel - anchorX);
  graphOutputEl.scrollTop = Math.max(0, contentY * graphZoomLevel - anchorY);
}

function updateGraphZoomControls() {
  const hasRenderedGraph = Boolean(getGraphSvg());
  const zoomPercent = `${Math.round(graphZoomLevel * 100)}%`;

  if (graphZoomResetBtn) {
    graphZoomResetBtn.textContent = zoomPercent;
    graphZoomResetBtn.disabled = !hasRenderedGraph;
  }
  if (graphZoomInBtn) {
    graphZoomInBtn.disabled = !hasRenderedGraph || graphZoomLevel >= GRAPH_ZOOM_MAX;
  }
  if (graphZoomOutBtn) {
    graphZoomOutBtn.disabled = !hasRenderedGraph || graphZoomLevel <= GRAPH_ZOOM_MIN;
  }
  if (graphNavHintEl) {
    graphNavHintEl.textContent = hasRenderedGraph
      ? `Zoom ${zoomPercent}. Drag to pan. Scroll to navigate. Ctrl/Cmd + wheel to zoom.`
      : "Drag to pan. Scroll to navigate. Ctrl/Cmd + wheel to zoom.";
  }
}

function onGraphPointerDown(event) {
  if (!graphOutputEl || event.button !== 0 || !getGraphSvg()) {
    return;
  }
  const target = event.target;
  if (target instanceof Element && target.closest(".node")) {
    return;
  }

  graphPanState = {
    active: true,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startScrollLeft: graphOutputEl.scrollLeft,
    startScrollTop: graphOutputEl.scrollTop
  };
  graphOutputEl.classList.add("is-panning");
  graphOutputEl.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function onGraphPointerMove(event) {
  if (!graphOutputEl || !graphPanState.active || graphPanState.pointerId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - graphPanState.startX;
  const deltaY = event.clientY - graphPanState.startY;
  graphOutputEl.scrollLeft = graphPanState.startScrollLeft - deltaX;
  graphOutputEl.scrollTop = graphPanState.startScrollTop - deltaY;
}

function onGraphPointerUp(event) {
  if (!graphOutputEl || !graphPanState.active || graphPanState.pointerId !== event.pointerId) {
    return;
  }
  stopGraphPanning();
}

function stopGraphPanning() {
  if (!graphOutputEl || !graphPanState.active) {
    return;
  }
  if (
    graphPanState.pointerId !== null &&
    graphOutputEl.hasPointerCapture(graphPanState.pointerId)
  ) {
    graphOutputEl.releasePointerCapture(graphPanState.pointerId);
  }
  graphPanState.active = false;
  graphPanState.pointerId = null;
  graphOutputEl.classList.remove("is-panning");
}

function onGraphWheel(event) {
  if (!graphOutputEl || !getGraphSvg()) {
    return;
  }

  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  event.preventDefault();
  const rect = graphOutputEl.getBoundingClientRect();
  const anchorX = event.clientX - rect.left;
  const anchorY = event.clientY - rect.top;
  const scaleDirection = event.deltaY < 0 ? 1 + GRAPH_ZOOM_STEP : 1 - GRAPH_ZOOM_STEP;
  setGraphZoom(graphZoomLevel * scaleDirection, { anchorX, anchorY });
}

function initializeDependencyMapNavigationControls() {
  updateDepMapZoomControls();

  if (depMapZoomInBtn) {
    depMapZoomInBtn.addEventListener("click", () => setDepMapZoom(depMapZoomLevel + GRAPH_ZOOM_STEP));
  }
  if (depMapZoomOutBtn) {
    depMapZoomOutBtn.addEventListener("click", () => setDepMapZoom(depMapZoomLevel - GRAPH_ZOOM_STEP));
  }
  if (depMapZoomResetBtn) {
    depMapZoomResetBtn.addEventListener("click", () => setDepMapZoom(depMapDefaultZoomLevel));
  }

  if (!depMapOutputEl) {
    return;
  }

  depMapOutputEl.addEventListener("pointerdown", onDepMapPointerDown);
  depMapOutputEl.addEventListener("pointermove", onDepMapPointerMove);
  depMapOutputEl.addEventListener("pointerup", onDepMapPointerUp);
  depMapOutputEl.addEventListener("pointercancel", stopDepMapPanning);
  depMapOutputEl.addEventListener("lostpointercapture", stopDepMapPanning);
  depMapOutputEl.addEventListener("wheel", onDepMapWheel, { passive: false });
}

function initializeDepMapZoomForRenderedSvg() {
  const svg = getDepMapSvg();
  if (!svg || !depMapOutputEl) {
    depMapBaseSize = { width: 0, height: 0 };
    depMapZoomLevel = 1;
    depMapDefaultZoomLevel = 1;
    updateDepMapZoomControls();
    return;
  }

  const baseSize = computeGraphBaseSize(svg);
  depMapBaseSize = baseSize;
  depMapDefaultZoomLevel = computeGraphFitZoom(baseSize, depMapOutputEl);
  depMapZoomLevel = depMapDefaultZoomLevel;
  applyDepMapZoom();
  depMapOutputEl.scrollTop = 0;
  depMapOutputEl.scrollLeft = 0;
}

function getDepMapSvg() {
  if (!depMapOutputEl) {
    return null;
  }
  return depMapOutputEl.querySelector("svg");
}

function applyDepMapZoom() {
  const svg = getDepMapSvg();
  if (!svg || !depMapBaseSize.width || !depMapBaseSize.height) {
    updateDepMapZoomControls();
    return;
  }

  svg.style.width = `${Math.round(depMapBaseSize.width * depMapZoomLevel)}px`;
  svg.style.height = `${Math.round(depMapBaseSize.height * depMapZoomLevel)}px`;
  updateDepMapZoomControls();
}

function setDepMapZoom(nextZoom, options = {}) {
  if (!depMapOutputEl) {
    return;
  }

  const clampedZoom = clampGraphZoom(nextZoom);
  const previousZoom = depMapZoomLevel;
  if (Math.abs(clampedZoom - previousZoom) < 0.001) {
    updateDepMapZoomControls();
    return;
  }

  const anchorX =
    typeof options.anchorX === "number" ? options.anchorX : depMapOutputEl.clientWidth / 2;
  const anchorY =
    typeof options.anchorY === "number" ? options.anchorY : depMapOutputEl.clientHeight / 2;
  const contentX = (depMapOutputEl.scrollLeft + anchorX) / previousZoom;
  const contentY = (depMapOutputEl.scrollTop + anchorY) / previousZoom;

  depMapZoomLevel = clampedZoom;
  applyDepMapZoom();

  depMapOutputEl.scrollLeft = Math.max(0, contentX * depMapZoomLevel - anchorX);
  depMapOutputEl.scrollTop = Math.max(0, contentY * depMapZoomLevel - anchorY);
}

function updateDepMapZoomControls() {
  const hasRenderedGraph = Boolean(getDepMapSvg());
  const zoomPercent = `${Math.round(depMapZoomLevel * 100)}%`;

  if (depMapZoomResetBtn) {
    depMapZoomResetBtn.textContent = zoomPercent;
    depMapZoomResetBtn.disabled = !hasRenderedGraph;
  }
  if (depMapZoomInBtn) {
    depMapZoomInBtn.disabled = !hasRenderedGraph || depMapZoomLevel >= GRAPH_ZOOM_MAX;
  }
  if (depMapZoomOutBtn) {
    depMapZoomOutBtn.disabled = !hasRenderedGraph || depMapZoomLevel <= GRAPH_ZOOM_MIN;
  }
  if (depMapNavHintEl) {
    depMapNavHintEl.textContent = hasRenderedGraph
      ? `Zoom ${zoomPercent}. Drag to pan. Scroll to navigate. Ctrl/Cmd + wheel to zoom.`
      : "Drag to pan. Scroll to navigate. Ctrl/Cmd + wheel to zoom.";
  }
}

function onDepMapPointerDown(event) {
  if (!depMapOutputEl || event.button !== 0 || !getDepMapSvg()) {
    return;
  }
  depMapPanState = {
    active: true,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startScrollLeft: depMapOutputEl.scrollLeft,
    startScrollTop: depMapOutputEl.scrollTop
  };
  depMapOutputEl.classList.add("is-panning");
  depMapOutputEl.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function onDepMapPointerMove(event) {
  if (!depMapOutputEl || !depMapPanState.active || depMapPanState.pointerId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - depMapPanState.startX;
  const deltaY = event.clientY - depMapPanState.startY;
  depMapOutputEl.scrollLeft = depMapPanState.startScrollLeft - deltaX;
  depMapOutputEl.scrollTop = depMapPanState.startScrollTop - deltaY;
}

function onDepMapPointerUp(event) {
  if (!depMapOutputEl || !depMapPanState.active || depMapPanState.pointerId !== event.pointerId) {
    return;
  }
  stopDepMapPanning();
}

function stopDepMapPanning() {
  if (!depMapOutputEl || !depMapPanState.active) {
    return;
  }
  if (
    depMapPanState.pointerId !== null &&
    depMapOutputEl.hasPointerCapture(depMapPanState.pointerId)
  ) {
    depMapOutputEl.releasePointerCapture(depMapPanState.pointerId);
  }
  depMapPanState.active = false;
  depMapPanState.pointerId = null;
  depMapOutputEl.classList.remove("is-panning");
}

function onDepMapWheel(event) {
  if (!depMapOutputEl || !getDepMapSvg()) {
    return;
  }
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  event.preventDefault();
  const rect = depMapOutputEl.getBoundingClientRect();
  const anchorX = event.clientX - rect.left;
  const anchorY = event.clientY - rect.top;
  const scaleDirection = event.deltaY < 0 ? 1 + GRAPH_ZOOM_STEP : 1 - GRAPH_ZOOM_STEP;
  setDepMapZoom(depMapZoomLevel * scaleDirection, { anchorX, anchorY });
}
