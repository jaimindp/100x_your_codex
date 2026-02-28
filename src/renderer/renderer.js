const versionsEl = document.getElementById("versions");
const pingBtn = document.getElementById("ping-btn");
const pingResultEl = document.getElementById("ping-result");

if (versionsEl) {
  const { chrome, electron, node } = window.monitor.versions;
  versionsEl.textContent = `Electron ${electron} | Chrome ${chrome} | Node ${node}`;
}

if (pingBtn && pingResultEl) {
  pingBtn.addEventListener("click", async () => {
    const response = await window.monitor.ping();
    pingResultEl.textContent = `Main process replied: ${response}`;
  });
}
