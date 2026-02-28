const path = require("path");
const fs = require("fs/promises");
const { spawn } = require("child_process");
const { app, BrowserWindow, ipcMain } = require("electron");

let codexProcess = null;
let codexState = {
  running: false,
  pid: null,
  listen: "stdio://",
  startedAt: null,
  lastExitCode: null,
  lastExitSignal: null
};
let codexLogs = [];
const MAX_LOG_LINES = 500;
const LINEAR_ENV_KEYS = ["LINEAR_API_KEY", "LINEAR_TEAM_KEY"];

function addCodexLog(stream, text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length === 0) {
    return;
  }

  const stamped = lines.map((line) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${stream}: ${line}`;
  });

  codexLogs = [...codexLogs, ...stamped].slice(-MAX_LOG_LINES);
  broadcast("codex-server:log", stamped);
}

function currentCodexState() {
  return {
    ...codexState,
    logs: codexLogs
  };
}

function broadcast(channel, payload) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload);
  }
}

function setCodexState(nextState) {
  codexState = { ...codexState, ...nextState };
  broadcast("codex-server:state", codexState);
}

function getEnvFilePath() {
  return path.join(app.getAppPath(), ".env");
}

function parseEnvLine(line) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) {
    return null;
  }
  const key = match[1];
  let value = match[2] || "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function quoteEnvValue(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

async function getLinearSettings() {
  const envPath = getEnvFilePath();
  let source = "";
  try {
    source = await fs.readFile(envPath, "utf8");
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }

  const settings = {
    apiKey: "",
    teamKey: ""
  };

  source.split(/\r?\n/).forEach((line) => {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      return;
    }
    if (parsed.key === "LINEAR_API_KEY") {
      settings.apiKey = parsed.value;
    }
    if (parsed.key === "LINEAR_TEAM_KEY") {
      settings.teamKey = parsed.value;
    }
  });

  return settings;
}

async function saveLinearSettings(apiKey, teamKey) {
  const envPath = getEnvFilePath();
  let source = "";
  try {
    source = await fs.readFile(envPath, "utf8");
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }

  const values = {
    LINEAR_API_KEY: String(apiKey || "").trim(),
    LINEAR_TEAM_KEY: String(teamKey || "").trim().toUpperCase()
  };
  const lines = source ? source.split(/\r?\n/) : [];
  const seenKeys = new Set();
  const updatedLines = lines.map((line) => {
    const parsed = parseEnvLine(line);
    if (!parsed || !LINEAR_ENV_KEYS.includes(parsed.key)) {
      return line;
    }
    seenKeys.add(parsed.key);
    return `${parsed.key}=${quoteEnvValue(values[parsed.key])}`;
  });

  LINEAR_ENV_KEYS.forEach((key) => {
    if (!seenKeys.has(key)) {
      updatedLines.push(`${key}=${quoteEnvValue(values[key])}`);
    }
  });

  const output = `${updatedLines.join("\n").replace(/\n+$/g, "")}\n`;
  await fs.writeFile(envPath, output, "utf8");

  return {
    apiKey: values.LINEAR_API_KEY,
    teamKey: values.LINEAR_TEAM_KEY
  };
}

function startCodexServer(listen = "stdio://") {
  if (codexProcess) {
    return currentCodexState();
  }

  const codexBin = process.env.CODEX_BIN || "codex";
  const args = ["app-server", "--listen", listen];
  const child = spawn(codexBin, args, {
    stdio: ["ignore", "pipe", "pipe"]
  });

  codexProcess = child;
  setCodexState({
    running: true,
    pid: child.pid,
    listen,
    startedAt: new Date().toISOString(),
    lastExitCode: null,
    lastExitSignal: null
  });

  addCodexLog("system", `spawned "${codexBin} ${args.join(" ")}"`);

  child.stdout.on("data", (chunk) => addCodexLog("stdout", chunk.toString()));
  child.stderr.on("data", (chunk) => addCodexLog("stderr", chunk.toString()));
  child.on("error", (err) => {
    addCodexLog("error", err.message);
  });

  child.on("close", (code, signal) => {
    addCodexLog("system", `exited (code=${String(code)}, signal=${String(signal)})`);
    codexProcess = null;
    setCodexState({
      running: false,
      pid: null,
      startedAt: null,
      lastExitCode: code,
      lastExitSignal: signal
    });
  });

  return currentCodexState();
}

async function stopCodexServer() {
  if (!codexProcess) {
    return currentCodexState();
  }

  const child = codexProcess;
  addCodexLog("system", "stopping process (SIGTERM)");
  child.kill("SIGTERM");

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (codexProcess) {
        addCodexLog("system", "force stopping process (SIGKILL)");
        codexProcess.kill("SIGKILL");
      }
    }, 3000);

    child.once("close", () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  return currentCodexState();
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("app:ping", () => "pong");
  ipcMain.handle("codex-server:get-state", () => currentCodexState());
  ipcMain.handle("codex-server:start", (_event, listen) => startCodexServer(listen));
  ipcMain.handle("codex-server:stop", () => stopCodexServer());
  ipcMain.handle("linear-settings:get", () => getLinearSettings());
  ipcMain.handle("linear-settings:save", (_event, settings) =>
    saveLinearSettings(settings?.apiKey, settings?.teamKey)
  );
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (codexProcess) {
    codexProcess.kill("SIGTERM");
  }
});
