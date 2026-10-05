/**
 * Lunor AI — Autonomous Mobile App Development Agent v4.0
 * Modeled after Antigravity, Claude Code, and Codex:
 * 1. Physical Workspace on Disk (generated_app/) with Live File Explorer Tree
 * 2. Live Tool-Calling Execution Terminal
 * 3. Bidirectional Code Editing with Direct Disk Persistence (Ctrl+S)
 * 4. Groq LPU LLM Engine (openai/gpt-oss-120b) with Zero Static Templates
 * 5. Interactive Mobile Simulator Runtime
 * 6. 1-Click Expo Project Exporter
 */

function getApiUrl(endpoint) {
  return endpoint;
}

// Global State
const state = {
  currentStage: 'build',
  currentTab: 'Home',
  activeFileIndex: 0,
  deviceMode: 'ios',
  theme: 'dark',
  isStreaming: false,
  groqApiKey: localStorage.getItem('LUNOR_GROQ_KEY') || '',
  workspaceDir: 'c:\\Users\\salin\\lunorsoft\\generated_app',

  // Google Drive Cloud Storage State
  gdriveStatus: {
    is_connected: false,
    user_email: '',
    folder_url: '',
    synced_file_count: 0,
    root_folder_name: 'LunorApps'
  },
  expandedFolders: {
    'app': true,
    'app/(tabs)': true,
    'context': true
  },

  // Current Generated App Data
  appData: null,
  spec: null,
  navGraph: null,
  files: [],
  simulatorSchema: null,
  lintReport: null,
  lesson: null,
  challenges: null
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  startClock();
  await checkBackendGroqStatus();
  updateKeyButtonUI();
  await checkGoogleDriveStatus();

  // Load existing files from disk workspace
  await loadWorkspaceFromDisk();
});



// --- Workspace Disk Synchronization ---
async function loadWorkspaceFromDisk() {
  try {
    const res = await fetch(getApiUrl('/api/workspace/files'));
    if (res.ok) {
      const data = await res.json();
      state.workspaceDir = data.workspace_dir || state.workspaceDir;
      if (data.gdrive) {
        state.gdriveStatus = data.gdrive;
        updateGoogleDriveUI();
      }

      if (data.files && data.files.length > 0) {
        // Fetch contents for each file
        const loadedFiles = [];
        for (const df of data.files) {
          try {
            const fRes = await fetch(getApiUrl(`/api/workspace/file?path=${encodeURIComponent(df.path)}`));
            if (fRes.ok) {
              const fData = await fRes.json();
              loadedFiles.push({
                path: fData.path,
                name: df.name,
                code: fData.content,
                lines: fData.lines,
                size: fData.size,
                abs_path: fData.abs_path
              });
            }
          } catch (e) {
            console.warn('Error reading file:', df.path, e);
          }
        }
        if (loadedFiles.length > 0) {
          state.files = loadedFiles;
          // Prefer opening index.tsx
          const homeIdx = state.files.findIndex(f => f.path.includes('index.tsx'));
          state.activeFileIndex = homeIdx !== -1 ? homeIdx : 0;
          renderFileTree();
          renderFileTabs();
          renderCodeEditor();
        }
      }
    }

    // Also hydrate manifest (spec, simulator schema, lesson) from disk
    try {
      const mRes = await fetch(getApiUrl('/api/workspace/manifest'));
      if (mRes.ok) {
        const manifest = await mRes.json();
        if (manifest.spec) state.spec = manifest.spec;
        if (manifest.nav_graph) state.navGraph = manifest.nav_graph;
        if (manifest.simulator_schema) {
          state.simulatorSchema = manifest.simulator_schema;
          renderSimulator();
        }
        if (manifest.lesson) state.lesson = manifest.lesson;
        if (manifest.challenges) state.challenges = manifest.challenges;
      }
    } catch (e) {
      console.warn('Manifest load error:', e);
    }
  } catch (err) {
    console.warn('Error loading workspace from disk:', err);
  }
}

async function saveFileToDisk() {
  saveCurrentEditorContent();
  if (!state.files.length) return;
  const currentFile = state.files[state.activeFileIndex];
  if (!currentFile) return;

  try {
    const res = await fetch(getApiUrl('/api/workspace/file'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentFile.path,
        content: currentFile.code,
        app_name: state.spec ? state.spec.app_name : 'LunorApp'
      })
    });
    if (res.ok) {
      const data = await res.json();
      currentFile.lines = data.lines;
      currentFile.size = data.size;
      renderFileTree();
      renderCodeEditor();
      applyCodeToSimulator();
      if (data.gdrive_synced) {
        showToast(`💾 Saved & Cloud Synced to Google Drive: ${currentFile.path}`);
        await checkGoogleDriveStatus();
      } else {
        showToast(`💾 Saved to disk: ${currentFile.path} (${data.lines} lines)`);
      }
    } else {
      showToast('Error saving file');
    }
  } catch (err) {
    console.error('Save error:', err);
    showToast('Failed to save file');
  }
}

async function openWorkspaceFolder() {
  try {
    const res = await fetch(getApiUrl('/api/workspace/open-folder'), { method: 'POST' });
    if (res.ok) {
      showToast('📂 Opened workspace folder in Windows Explorer!');
    } else {
      showToast('Could not open folder');
    }
  } catch (err) {
    console.warn('Open folder error:', err);
    showToast('Folder path: ' + state.workspaceDir);
  }
}

function copyDiskPath() {
  if (!state.files.length) return;
  const currentFile = state.files[state.activeFileIndex];
  if (!currentFile) return;
  const fullPath = `${state.workspaceDir}\\${currentFile.path.replace(/\//g, '\\')}`;
  navigator.clipboard.writeText(fullPath).then(() => {
    showToast(`Copied path: ${currentFile.path}`);
  });
}

// --- Google Drive Integration & Cloud State ---
async function checkGoogleDriveStatus() {
  try {
    const res = await fetch(getApiUrl('/api/gdrive/status'));
    if (!res.ok) return;
    const data = await res.json();
    state.gdriveStatus = data;
    updateGoogleDriveUI();
  } catch (err) {
    console.warn('Could not fetch /api/gdrive/status', err);
  }
}

function updateGoogleDriveUI() {
  const g = state.gdriveStatus || {};
  const isConnected = !!g.is_connected;

  // Header button label & style
  const label = document.getElementById('gdrive-status-label');
  const btn = document.getElementById('btn-gdrive-config');
  if (label && btn) {
    if (isConnected) {
      const emailShort = g.user_email ? g.user_email.split('@')[0] : 'Connected';
      label.textContent = `Drive: ${emailShort}`;
      btn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
      btn.style.color = '#34D399';
    } else {
      label.textContent = 'Google Drive';
      btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      btn.style.color = '#D1D5DB';
    }
  }

  // Workspace cloud pill in file explorer
  const pill = document.getElementById('workspace-cloud-pill');
  if (pill) {
    if (isConnected) {
      pill.textContent = '☁️ Drive Synced ✓';
      pill.style.background = 'rgba(16, 185, 129, 0.15)';
      pill.style.color = '#34D399';
      pill.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    } else {
      pill.textContent = '☁️ Drive Ready';
      pill.style.background = 'rgba(99, 102, 241, 0.15)';
      pill.style.color = '#A5B4FC';
      pill.style.borderColor = 'rgba(99, 102, 241, 0.3)';
    }
  }

  // Storage location banner in file explorer
  const pathLabel = document.getElementById('workspace-storage-type');
  const pathText = document.getElementById('workspace-disk-path');
  if (pathLabel && pathText) {
    if (isConnected) {
      pathLabel.textContent = `Google Drive (${g.user_email || 'Active'}):`;
      pathText.innerHTML = `My Drive &gt; <strong>${escapeHTML(g.root_folder_name || 'LunorApps')}</strong> &gt; ${state.spec ? escapeHTML(state.spec.app_name) : 'App'}`;
    } else {
      pathLabel.textContent = 'Storage Location:';
      pathText.textContent = `Google Drive: LunorApps (Click ☁️ Google Drive to Connect)`;
    }
  }

  // Google Drive Modal elements
  const badge = document.getElementById('gdrive-status-badge');
  if (badge) {
    if (isConnected) {
      badge.className = 'badge-status connected';
      badge.textContent = 'Connected ✓';
    } else {
      badge.className = 'badge-status disconnected';
      badge.textContent = 'Not Connected';
    }
  }
  const emailEl = document.getElementById('gdrive-user-email');
  if (emailEl) emailEl.textContent = isConnected ? (g.user_email || 'Active Account') : 'None';
  const folderEl = document.getElementById('gdrive-folder-name');
  if (folderEl) folderEl.textContent = `My Drive > ${g.root_folder_name || 'LunorApps'}`;
  const countEl = document.getElementById('gdrive-synced-count');
  if (countEl) countEl.textContent = `${g.synced_file_count || state.files.length} files in Drive`;

  const linkContainer = document.getElementById('gdrive-link-container');
  const linkEl = document.getElementById('gdrive-open-folder-link');
  if (linkContainer && linkEl) {
    if (isConnected && g.folder_url) {
      linkContainer.style.display = 'block';
      linkEl.href = g.folder_url;
      linkEl.textContent = `📂 Open ${g.root_folder_name || 'LunorApps'} in Google Drive ↗`;
    } else {
      linkContainer.style.display = 'none';
    }
  }

  const disconnectBtn = document.getElementById('btn-disconnect-gdrive');
  if (disconnectBtn) {
    disconnectBtn.style.display = isConnected ? 'block' : 'none';
  }
}

function openGoogleDriveModal() {
  const modal = document.getElementById('gdrive-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  checkGoogleDriveStatus();
}

function closeGoogleDriveModal() {
  const modal = document.getElementById('gdrive-modal');
  if (modal) modal.style.display = 'none';
}

async function activateQuickGoogleDrive() {
  const emailInput = document.getElementById('gdrive-quick-email');
  const email = emailInput ? emailInput.value.trim() : '';
  const finalEmail = email || 'salin@lunor.online';

  showToast('Connecting Google Drive Cloud Workspace...');
  try {
    const res = await fetch(getApiUrl('/api/gdrive/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        use_simulated_cloud: true,
        user_email: finalEmail
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`☁️ Connected! Cloud Drive Active for ${finalEmail}`);
      await checkGoogleDriveStatus();
      await syncAllToGoogleDrive();
    } else {
      showToast(`Connection failed: ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    showToast('Failed to connect Google Drive');
  }
}

async function saveGoogleDriveToken() {
  const tokenInput = document.getElementById('gdrive-access-token');
  const emailInput = document.getElementById('gdrive-token-email');
  const folderInput = document.getElementById('gdrive-folder-input');

  const token = tokenInput ? tokenInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const folder = folderInput ? folderInput.value.trim() : 'LunorApps';

  if (!token) {
    showToast('Please enter your Google OAuth Access Token');
    return;
  }

  showToast('Verifying Google OAuth token...');
  try {
    const res = await fetch(getApiUrl('/api/gdrive/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: token,
        user_email: email,
        folder_name: folder
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Connected to Google Drive!');
      await checkGoogleDriveStatus();
      await syncAllToGoogleDrive();
    } else {
      showToast(`Token error: ${data.error || 'Invalid token'}`);
    }
  } catch (err) {
    showToast('Failed to verify token with Google API');
  }
}

async function disconnectGoogleDrive() {
  try {
    const res = await fetch(getApiUrl('/api/gdrive/disconnect'), { method: 'POST' });
    if (res.ok) {
      showToast('Google Drive disconnected');
      await checkGoogleDriveStatus();
      renderFileTree();
    }
  } catch (err) {
    showToast('Failed to disconnect');
  }
}

async function syncAllToGoogleDrive() {
  showToast('☁️ Syncing workspace to Google Drive...');
  try {
    const appName = state.spec ? state.spec.app_name : 'LunorApp';
    const res = await fetch(getApiUrl('/api/gdrive/sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_name: appName })
    });
    if (res.ok) {
      const data = await res.json();
      showToast(`☁️ Synced ${data.total_synced || state.files.length} files to Google Drive/${appName}!`);
      await checkGoogleDriveStatus();
      renderFileTree();
    } else {
      showToast('Error syncing with Google Drive');
    }
  } catch (err) {
    showToast('Failed to sync to Google Drive');
  }
}

async function syncActiveFileToGoogleDrive() {
  if (!state.files.length) return;
  const currentFile = state.files[state.activeFileIndex];
  if (!currentFile) return;

  saveCurrentEditorContent();
  try {
    const res = await fetch(getApiUrl('/api/workspace/file'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentFile.path,
        content: currentFile.code,
        app_name: state.spec ? state.spec.app_name : 'LunorApp'
      })
    });
    if (res.ok) {
      const data = await res.json();
      currentFile.lines = data.lines;
      currentFile.size = data.size;
      renderFileTree();
      renderCodeEditor();
      if (data.gdrive_synced) {
        showToast(`☁️ Pushed ${currentFile.path} to Google Drive!`);
      } else {
        showToast(`💾 Saved ${currentFile.path} (Connect Google Drive for cloud sync)`);
      }
      await checkGoogleDriveStatus();
    }
  } catch (err) {
    showToast('Failed to push file to Google Drive');
  }
}

function openGroqModal() {
  const modal = document.getElementById('groq-modal');
  const input = document.getElementById('groq-api-key-input');
  if (input) {
    input.value = state.groqApiKey === 'configured-on-server' ? '' : (state.groqApiKey || '');
  }
  if (modal) modal.style.display = 'flex';
}

function closeGroqModal() {
  const modal = document.getElementById('groq-modal');
  if (modal) modal.style.display = 'none';
}

async function saveGroqKey() {
  const input = document.getElementById('groq-api-key-input');
  const key = input ? input.value.trim() : '';
  state.groqApiKey = key;

  if (key) {
    localStorage.setItem('LUNOR_GROQ_KEY', key);
    showToast('⚡ Groq API Key saved!');
  } else {
    localStorage.removeItem('LUNOR_GROQ_KEY');
    showToast('Groq key cleared');
  }

  try {
    await fetch(getApiUrl('/api/config/groq'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groq_api_key: key })
    });
  } catch (e) {
    console.warn('Could not sync key to server:', e);
  }

  updateKeyButtonUI();
  closeGroqModal();
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Run Pipeline button
  document.getElementById('btn-run-agent').addEventListener('click', runAgentPipeline);
  document.getElementById('prompt-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runAgentPipeline();
  });

  // Run on device instructions modal
  const runBtn = document.getElementById('btn-run-instructions');
  const runModal = document.getElementById('run-modal');
  const closeBtn = document.getElementById('btn-close-modal');
  const modalFolderBtn = document.getElementById('btn-open-folder-modal');

  if (runBtn && runModal) {
    runBtn.addEventListener('click', () => {
      runModal.style.display = 'flex';
    });
  }
  if (closeBtn && runModal) {
    closeBtn.addEventListener('click', () => {
      runModal.style.display = 'none';
    });
  }
  if (modalFolderBtn) {
    modalFolderBtn.addEventListener('click', () => {
      openWorkspaceFolder();
    });
  }
  if (runModal) {
    runModal.addEventListener('click', (e) => {
      if (e.target === runModal) runModal.style.display = 'none';
    });
  }

  // Google Drive Modal
  const gdriveBtn = document.getElementById('btn-gdrive-config');
  const gdriveCloseBtn = document.getElementById('btn-close-gdrive-modal');
  const gdriveModal = document.getElementById('gdrive-modal');

  if (gdriveBtn) gdriveBtn.addEventListener('click', openGoogleDriveModal);
  if (gdriveCloseBtn) gdriveCloseBtn.addEventListener('click', closeGoogleDriveModal);
  if (gdriveModal) {
    gdriveModal.addEventListener('click', (e) => {
      if (e.target === gdriveModal) closeGoogleDriveModal();
    });
  }

  // Google Drive Modal Tabs
  const tabQuick = document.getElementById('btn-tab-quick');
  const tabToken = document.getElementById('btn-tab-token');
  const viewQuick = document.getElementById('gdrive-view-quick');
  const viewToken = document.getElementById('gdrive-view-token');

  if (tabQuick && tabToken && viewQuick && viewToken) {
    tabQuick.addEventListener('click', () => {
      tabQuick.classList.add('active');
      tabToken.classList.remove('active');
      viewQuick.style.display = 'block';
      viewToken.style.display = 'none';
    });
    tabToken.addEventListener('click', () => {
      tabToken.classList.add('active');
      tabQuick.classList.remove('active');
      viewToken.style.display = 'block';
      viewQuick.style.display = 'none';
    });
  }

  // Google Drive Action Buttons
  const btnActivateQuick = document.getElementById('btn-activate-quick-gdrive');
  if (btnActivateQuick) btnActivateQuick.addEventListener('click', activateQuickGoogleDrive);

  const btnSaveToken = document.getElementById('btn-save-gdrive-token');
  if (btnSaveToken) btnSaveToken.addEventListener('click', saveGoogleDriveToken);

  const btnDisconnectGDrive = document.getElementById('btn-disconnect-gdrive');
  if (btnDisconnectGDrive) btnDisconnectGDrive.addEventListener('click', disconnectGoogleDrive);

  const btnSyncAllGDrive = document.getElementById('btn-sync-all-gdrive');
  if (btnSyncAllGDrive) btnSyncAllGDrive.addEventListener('click', syncAllToGoogleDrive);

  const btnGDriveSyncNow = document.getElementById('btn-gdrive-sync-now');
  if (btnGDriveSyncNow) btnGDriveSyncNow.addEventListener('click', syncAllToGoogleDrive);

  const btnSyncFileDrive = document.getElementById('btn-sync-file-drive');
  if (btnSyncFileDrive) btnSyncFileDrive.addEventListener('click', syncActiveFileToGoogleDrive);

  // Groq API Key Modal
  const btnConfigKey = document.getElementById('btn-config-key');
  const btnCloseGroqModal = document.getElementById('btn-close-groq-modal');
  const groqModal = document.getElementById('groq-modal');
  const btnSaveGroqKey = document.getElementById('btn-save-groq-key');

  if (btnConfigKey) btnConfigKey.addEventListener('click', openGroqModal);
  if (btnCloseGroqModal) btnCloseGroqModal.addEventListener('click', closeGroqModal);
  if (groqModal) {
    groqModal.addEventListener('click', (e) => {
      if (e.target === groqModal) closeGroqModal();
    });
  }
  if (btnSaveGroqKey) btnSaveGroqKey.addEventListener('click', saveGroqKey);

  // 6-Stage Navigator steps
  document.querySelectorAll('.stage-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const stage = btn.getAttribute('data-stage');
      switchCognitiveStage(stage);
    });
  });

  // Left pane sub-tabs (Files vs Agent Terminal vs Architecture)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.left-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-left-tab');
      if (target === 'file-explorer') {
        document.getElementById('view-file-explorer').classList.add('active');
      } else if (target === 'agent-terminal') {
        document.getElementById('view-agent-terminal').classList.add('active');
      } else {
        document.getElementById('view-stage-content').classList.add('active');
      }
    });
  });

  // Explorer buttons
  const treeRefresh = document.getElementById('btn-tree-refresh');
  if (treeRefresh) treeRefresh.addEventListener('click', loadWorkspaceFromDisk);
  const treeOpen = document.getElementById('btn-tree-open');
  if (treeOpen) treeOpen.addEventListener('click', openWorkspaceFolder);
  const headerOpenFolder = document.getElementById('btn-open-folder');
  if (headerOpenFolder) headerOpenFolder.addEventListener('click', openWorkspaceFolder);

  // Clear Terminal
  const clearXaiBtn = document.getElementById('btn-clear-xai');
  if (clearXaiBtn) {
    clearXaiBtn.addEventListener('click', () => {
      document.getElementById('xai-terminal-logs').innerHTML = '';
    });
  }

  // Save to Disk & Code buttons
  const saveDiskBtn = document.getElementById('btn-save-disk');
  if (saveDiskBtn) saveDiskBtn.addEventListener('click', saveFileToDisk);

  const applyCodeBtn = document.getElementById('btn-apply-code');
  if (applyCodeBtn) applyCodeBtn.addEventListener('click', applyCodeToSimulator);

  const copyCodeBtn = document.getElementById('btn-copy-code');
  if (copyCodeBtn) copyCodeBtn.addEventListener('click', copyActiveFileCode);

  const copyPathBtn = document.getElementById('btn-copy-path');
  if (copyPathBtn) copyPathBtn.addEventListener('click', copyDiskPath);

  // Export Expo ZIP button
  const exportZipBtn = document.getElementById('btn-export-zip');
  if (exportZipBtn) exportZipBtn.addEventListener('click', exportExpoZip);

  // Simulator controls
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-device');
      setDeviceMode(mode);
    });
  });

  const resetSimBtn = document.getElementById('btn-reset-sim');
  if (resetSimBtn) {
    resetSimBtn.addEventListener('click', () => {
      if (state.simulatorSchema) {
        renderSimulatorScreen();
        showToast('Simulator state reset');
      }
    });
  }

  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      const phone = document.getElementById('phone-device');
      if (phone) phone.style.backgroundColor = state.theme === 'dark' ? '#0B0F19' : '#F9FAFB';
      showToast(`Simulator theme: ${state.theme}`);
    });
  }

  // Keyboard shortcut Ctrl+S or Cmd+S to save directly to disk
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveFileToDisk();
    }
  });
}

// --- API Key Management ---
async function checkBackendGroqStatus() {
  try {
    const res = await fetch(getApiUrl('/api/config/groq'));
    if (res.ok) {
      const data = await res.json();
      if (data.groq_configured) {
        state.groqApiKey = 'configured-on-server';
      }
    }
  } catch (e) {
    console.warn('Could not query /api/config/groq', e);
  }
}

function updateKeyButtonUI() {
  const btn = document.getElementById('key-label');
  if (state.groqApiKey) {
    btn.textContent = '⚡ Groq: 120B Active';
    btn.parentElement.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    btn.parentElement.style.color = '#34D399';
  } else {
    btn.textContent = '⚡ Groq Key';
    btn.parentElement.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    btn.parentElement.style.color = '#D1D5DB';
  }
}

// --- Agentic Pipeline Execution ---
async function runAgentPipeline() {
  if (state.isStreaming) return;

  const prompt = document.getElementById('prompt-input').value.trim();
  if (!prompt) return;

  state.isStreaming = true;
  setLiveStatus('Agent Running...', true);

  // Switch to Agent Terminal tab during execution
  activateLeftTab('agent-terminal');

  // Clear previous terminal logs
  const terminal = document.getElementById('xai-terminal-logs');
  terminal.innerHTML = `
    <div class="agent-cli-line">
      <span class="agent-cli-time">${new Date().toLocaleTimeString()}</span>
      <span class="agent-cli-tag">[Supervisor]</span>
      <span class="agent-cli-content">Task initiated: "${escapeHTML(prompt)}"</span>
    </div>
  `;

  try {
    let url = getApiUrl(`/api/agent/stream?prompt=${encodeURIComponent(prompt)}`);
    if (state.groqApiKey && state.groqApiKey !== 'configured-on-server') {
      url += `&groq_api_key=${encodeURIComponent(state.groqApiKey)}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.replace('data: ', '').trim());
            handleAgentEvent(event);
          } catch (err) {
            console.error('Error parsing SSE event:', err);
          }
        }
      }
    }
  } catch (err) {
    console.warn('SSE stream fallback to POST /api/agent/run:', err);
    const directRes = await fetch(getApiUrl('/api/agent/run'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        groq_api_key: state.groqApiKey !== 'configured-on-server' ? state.groqApiKey : ''
      })
    });
    const payload = await directRes.json();
    applyFullPayload(payload);
  } finally {
    state.isStreaming = false;
    setLiveStatus('Ready', false);
    renderFileTree();
    renderFileTabs();
    renderCodeEditor();
    if (state.simulatorSchema) renderSimulator();
    activateLeftTab('file-explorer');
    showToast(`✨ Generated on disk: ${state.spec ? state.spec.app_name : 'App'}`);
  }
}

function handleAgentEvent(event) {
  renderAgentTerminalLine(event);

  if (event.type === 'file_written') {
    // Add or update file in local state
    const existingIdx = state.files.findIndex(f => f.path === event.path);
    const fileObj = {
      path: event.path,
      name: event.name || event.path,
      code: event.code,
      lines: event.lines || event.code.split('\n').length,
      size: event.size || event.code.length,
      abs_path: event.abs_path
    };
    if (existingIdx !== -1) {
      state.files[existingIdx] = fileObj;
    } else {
      state.files.push(fileObj);
    }
    renderFileTree();
    renderFileTabs();
    renderCodeEditor();
  } else if (event.type === 'artifact') {
    if (event.stage === 'understand') {
      state.spec = event.data;
    } else if (event.stage === 'plan') {
      state.navGraph = event.data;
    } else if (event.stage === 'build') {
      state.simulatorSchema = event.data.simulator_schema;
      state.lintReport = event.data.lint_report;
      if (state.simulatorSchema) renderSimulator();
    } else if (event.stage === 'explain') {
      state.lesson = event.data;
    } else if (event.stage === 'learn') {
      state.challenges = event.data;
    }
  } else if (event.type === 'done') {
    if (event.full_payload) {
      applyFullPayload(event.full_payload);
    }
  }
}

function applyFullPayload(payload) {
  if (payload.spec) state.spec = payload.spec;
  if (payload.nav_graph) state.navGraph = payload.nav_graph;
  if (payload.files) {
    state.files = payload.files.map(f => ({
      path: f.path,
      name: f.name || f.path,
      code: f.code,
      lines: f.lines || (f.code ? f.code.split('\n').length : 0),
      size: f.size || (f.code ? f.code.length : 0),
      abs_path: f.abs_path
    }));
  }
  if (payload.simulator_schema) state.simulatorSchema = payload.simulator_schema;
  if (payload.lint_report) state.lintReport = payload.lint_report;
  if (payload.lesson) state.lesson = payload.lesson;
  if (payload.challenges) state.challenges = payload.challenges;
  if (payload.workspace_dir) state.workspaceDir = payload.workspace_dir;

  renderFileTree();
  renderFileTabs();
  renderCodeEditor();
  if (state.simulatorSchema) renderSimulator();
}

function renderAgentTerminalLine(event) {
  const terminal = document.getElementById('xai-terminal-logs');
  if (!terminal) return;

  const timeStr = new Date().toLocaleTimeString();
  let tagClass = 'agent-cli-tag';
  let tagText = `[${event.agent || 'Agent'}]`;

  if (event.type === 'tool_call') {
    if (event.tool === 'gdrive_upload') {
      tagClass += ' tool';
      tagText = '☁️ [Google Drive]';
    } else {
      tagClass += ' tool';
      tagText = `[Tool: ${event.tool || 'call'}]`;
    }
  } else if (event.type === 'file_written') {
    tagClass += ' disk';
    tagText = `[Disk: write]`;
  } else if (event.type === 'done') {
    tagClass += ' disk';
    tagText = `[Complete]`;
  }

  const lineEl = document.createElement('div');
  lineEl.className = 'agent-cli-line';
  lineEl.innerHTML = `
    <span class="agent-cli-time">${timeStr}</span>
    <span class="${tagClass}">${escapeHTML(tagText)}</span>
    <span class="agent-cli-content">${escapeHTML(event.content || (event.type === 'file_written' ? `Wrote ${event.path} (${event.lines} lines)` : ''))}</span>
  `;
  terminal.appendChild(lineEl);
  terminal.scrollTop = terminal.scrollHeight;
}

// --- Hierarchical File Tree Explorer Renderer ---
function renderFileTree() {
  const treeList = document.getElementById('file-tree-list');
  const countBadge = document.getElementById('file-count-badge');
  if (countBadge) countBadge.textContent = state.files.length;
  if (!treeList) return;
  treeList.innerHTML = '';

  if (!state.files.length) {
    treeList.innerHTML = `
      <div style="padding: 16px; text-align:center; color: var(--text-dim); font-size:11px;">
        No files in workspace.<br>Click "Generate App" to synthesize.
      </div>
    `;
    return;
  }

  // Separate files into directory groups and root files
  const folders = {}; // folderPath -> array of { file, index, filename }
  const rootFiles = [];

  state.files.forEach((file, index) => {
    const normPath = file.path.replace(/\\/g, '/').replace(/^\//, '');
    const slashIdx = normPath.lastIndexOf('/');
    if (slashIdx === -1) {
      rootFiles.push({ file, index, filename: normPath });
    } else {
      const folderPath = normPath.substring(0, slashIdx);
      const filename = normPath.substring(slashIdx + 1);
      if (!folders[folderPath]) folders[folderPath] = [];
      folders[folderPath].push({ file, index, filename });
    }
  });

  // Sort folder paths so top folders appear first (e.g. 'app', 'app/(tabs)', 'context')
  const sortedFolderPaths = Object.keys(folders).sort();

  sortedFolderPaths.forEach(folderPath => {
    const isExpanded = state.expandedFolders[folderPath] !== false;
    const folderEl = document.createElement('div');
    folderEl.className = 'tree-folder';

    const headerEl = document.createElement('div');
    headerEl.className = 'tree-folder-header';
    headerEl.innerHTML = `
      <span style="font-size:10px; opacity:0.8;">${isExpanded ? '▾' : '▸'}</span>
      <span>${isExpanded ? '📂' : '📁'}</span>
      <span style="color:#F3F4F6;">${escapeHTML(folderPath)}</span>
      <span style="font-size:10px; color:#6B7280; margin-left:auto;">${folders[folderPath].length} files</span>
    `;

    headerEl.addEventListener('click', () => {
      state.expandedFolders[folderPath] = !isExpanded;
      renderFileTree();
    });
    folderEl.appendChild(headerEl);

    if (isExpanded) {
      const childrenEl = document.createElement('div');
      childrenEl.className = 'tree-folder-children';

      folders[folderPath].forEach(item => {
        const fileItem = createTreeFileItem(item.file, item.index, item.filename, true);
        childrenEl.appendChild(fileItem);
      });
      folderEl.appendChild(childrenEl);
    }

    treeList.appendChild(folderEl);
  });

  // Render root files (app.json, package.json, README.md, etc.)
  rootFiles.forEach(item => {
    const fileItem = createTreeFileItem(item.file, item.index, item.filename, false);
    treeList.appendChild(fileItem);
  });
}

function createTreeFileItem(file, index, displayName, isNested) {
  let icon = '📄';
  if (file.path.endsWith('.tsx') || file.path.endsWith('.ts')) icon = '🔷';
  else if (file.path.endsWith('.json')) icon = '🟡';
  else if (file.path.endsWith('.md')) icon = '📝';

  const isConnected = state.gdriveStatus && state.gdriveStatus.is_connected;
  const isSelected = index === state.activeFileIndex;

  const itemEl = document.createElement('div');
  itemEl.className = `file-tree-item ${isNested ? 'nested' : ''} ${isSelected ? 'active' : ''}`;
  itemEl.innerHTML = `
    <div class="file-item-left" style="display:flex; align-items:center; gap:6px; overflow:hidden;">
      <span class="file-icon">${icon}</span>
      <span title="${escapeHTML(file.path)}" style="white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${escapeHTML(displayName)}</span>
    </div>
    <div style="display:flex; align-items:center; gap:6px; margin-left:auto; flex-shrink:0;">
      <span class="file-lines-badge">${file.lines || file.code.split('\n').length}L</span>
      ${isConnected ? `<span class="gdrive-sync-dot" title="Cloud Synced to Google Drive"></span>` : ''}
    </div>
  `;

  itemEl.addEventListener('click', () => {
    saveCurrentEditorContent();
    state.activeFileIndex = index;
    renderFileTree();
    renderFileTabs();
    renderCodeEditor();
  });

  return itemEl;
}

function renderFileTabs() {
  const tabsContainer = document.getElementById('file-tabs-bar');
  if (!tabsContainer) return;
  tabsContainer.innerHTML = '';

  state.files.forEach((file, index) => {
    let icon = '📄';
    if (file.path.endsWith('.tsx') || file.path.endsWith('.ts')) icon = '🔷';
    else if (file.path.endsWith('.json')) icon = '🟡';
    else if (file.path.endsWith('.md')) icon = '📝';

    const tab = document.createElement('button');
    tab.className = `file-tab ${index === state.activeFileIndex ? 'active' : ''}`;
    tab.innerHTML = `<span>${icon}</span><span>${file.path.split('/').pop()}</span>`;
    tab.addEventListener('click', () => {
      saveCurrentEditorContent();
      state.activeFileIndex = index;
      renderFileTree();
      renderFileTabs();
      renderCodeEditor();
    });
    tabsContainer.appendChild(tab);
  });
}

function saveCurrentEditorContent() {
  if (!state.files.length) return;
  const currentFile = state.files[state.activeFileIndex];
  const editorCode = document.getElementById('code-content');
  if (currentFile && editorCode) {
    currentFile.code = editorCode.innerText;
    currentFile.lines = currentFile.code.split('\n').length;
  }
}

function renderCodeEditor() {
  if (!state.files.length) return;
  const file = state.files[state.activeFileIndex];
  if (!file) return;

  const codeEl = document.getElementById('code-content');
  const gutterEl = document.getElementById('editor-gutter');
  const pathEl = document.getElementById('active-file-path');
  const linesEl = document.getElementById('active-file-lines');
  const statusEl = document.getElementById('active-storage-status');

  if (pathEl) pathEl.textContent = file.path;
  if (codeEl) codeEl.textContent = file.code;

  const lineCount = file.code ? file.code.split('\n').length : 0;
  if (linesEl) linesEl.textContent = `${lineCount} lines`;
  if (gutterEl) gutterEl.innerHTML = Array.from({ length: lineCount }, (_, i) => i + 1).join('<br>');

  if (statusEl) {
    if (state.gdriveStatus && state.gdriveStatus.is_connected) {
      statusEl.textContent = `Google Drive: Synced (${state.gdriveStatus.root_folder_name || 'LunorApps'}) ✓`;
      statusEl.style.color = '#10B981';
    } else {
      statusEl.textContent = 'Storage: Local Disk Only';
      statusEl.style.color = '#9CA3AF';
    }
  }
}

function applyCodeToSimulator() {
  saveCurrentEditorContent();
  if (state.simulatorSchema) {
    renderSimulatorScreen();
    showToast('⚡ Live changes reflected in simulator!');
  }
}

function copyActiveFileCode() {
  saveCurrentEditorContent();
  if (!state.files.length) return;
  const file = state.files[state.activeFileIndex];
  if (!file) return;
  navigator.clipboard.writeText(file.code).then(() => {
    showToast(`Copied code of ${file.path}!`);
  });
}

// --- 6-Stage Navigator Switcher ---
function switchCognitiveStage(stage) {
  state.currentStage = stage;
  document.querySelectorAll('.stage-step').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-stage') === stage);
  });

  // Automatically switch left tab based on cognitive stage selection
  if (['understand', 'plan', 'explain', 'learn'].includes(stage)) {
    activateLeftTab('stage-view');
  } else if (stage === 'build') {
    activateLeftTab('file-explorer');
  } else if (stage === 'prompt') {
    activateLeftTab('agent-terminal');
  }

  const container = document.getElementById('stage-details-container');
  if (!container) return;

  if (stage === 'prompt') {
    container.innerHTML = `
      <div class="stage-card">
        <div class="card-header-badge">
          <span class="badge-tag">Autonomous Agent</span>
          <span class="live-pill">Direct Disk Execution</span>
        </div>
        <h3 class="stage-title">Autonomous Code Generation</h3>
        <p class="stage-desc">Type your mobile app prompt in the top bar. The agent plans, generates code via Groq GPT-OSS 120B, and writes every file directly to your disk at:</p>
        <div style="background:#090C14; padding:8px 12px; border-radius:6px; font-family:var(--font-mono); font-size:11px; color:#34D399; margin-top:8px;">
          ${escapeHTML(state.workspaceDir)}
        </div>
        <p class="stage-desc" style="margin-top:10px;">To test locally: <code>cd generated_app && npx expo start</code></p>
      </div>
    `;
  } else if (stage === 'understand') {
    const spec = state.spec || {};
    container.innerHTML = `
      <div class="stage-card">
        <div class="card-header-badge">
          <span class="badge-tag">Product Manager Persona</span>
          <span class="live-pill">${spec.domain || 'Domain'}</span>
        </div>
        <h3 class="stage-title">${spec.title || 'App Specification'}</h3>
        <p class="stage-desc">${spec.prompt_summary || ''}</p>
        
        <h4 style="font-size:12px; font-weight:700; color:#A5B4FC; margin-top:14px;">Target User Personas:</h4>
        <ul class="spec-list">
          ${(spec.target_personas || []).map(p => `<li class="spec-item"><span class="spec-icon">✓</span><span>${escapeHTML(p)}</span></li>`).join('')}
        </ul>

        <h4 style="font-size:12px; font-weight:700; color:#A5B4FC; margin-top:14px;">Native Hardware APIs:</h4>
        <ul class="spec-list">
          ${(spec.native_hardware_apis || []).map(a => `<li class="spec-item"><span class="spec-icon">⚡</span><span>${escapeHTML(a)}</span></li>`).join('')}
        </ul>

        <h4 style="font-size:12px; font-weight:700; color:#A5B4FC; margin-top:14px;">Mobile Constraints:</h4>
        <ul class="spec-list">
          ${(spec.mobile_constraints || []).map(c => `<li class="spec-item"><span class="spec-icon">🛡️</span><span>${escapeHTML(c)}</span></li>`).join('')}
        </ul>
      </div>
    `;
  } else if (stage === 'plan') {
    const nav = state.navGraph || {};
    container.innerHTML = `
      <div class="stage-card">
        <div class="card-header-badge">
          <span class="badge-tag">Architect Persona</span>
          <span class="live-pill">Navigation Topology</span>
        </div>
        <h3 class="stage-title">Expo Router Topology</h3>
        <p class="stage-desc">File-based navigation with BottomTabNavigator and modal overlays.</p>

        <div class="arch-tree">
          <div class="tree-node">📦 app/_layout.tsx (Root Stack)</div>
          <div class="tree-sub">
            <div class="tree-node">📑 app/(tabs)/_layout.tsx (BottomTabs)</div>
            <div class="tree-sub">
              ${(nav.tabs || []).map(t => `
                <div class="tree-node">📱 ${escapeHTML(t.name)} (${escapeHTML(t.route)})</div>
              `).join('')}
            </div>
            ${(nav.modals || []).map(m => `
              <div class="tree-node" style="border-color: rgba(245, 158, 11, 0.4); color:#FCD34D;">
                🪟 ${escapeHTML(m.name)} (presentation: 'modal')
              </div>
            `).join('')}
          </div>
        </div>

        <h4 style="font-size:12px; font-weight:700; color:#A5B4FC; margin-top:14px;">State Architecture:</h4>
        <p class="stage-desc">${nav.state_management ? nav.state_management.store : 'React Context (AppContext) + useReducer'}</p>
        <p class="stage-desc" style="font-size:11px; margin-top:4px;">Persistence: ${nav.state_management ? nav.state_management.persistence : 'AsyncStorage'}</p>
      </div>
    `;
  } else if (stage === 'build') {
    container.innerHTML = `
      <div class="stage-card">
        <div class="card-header-badge">
          <span class="badge-tag">Builder Persona</span>
          <span class="live-pill">Disk Verified</span>
        </div>
        <h3 class="stage-title">Disk Files & Simulator</h3>
        <p class="stage-desc">The agent generated and wrote ${state.files.length} production files directly to disk.</p>

        <div style="background:#0F1420; border-radius:8px; padding:10px; border:1px solid rgba(255,255,255,0.06); margin-top:8px;">
          <div style="display:flex; justify-content:space-between; font-size:11px; color:#9CA3AF;">
            <span>Workspace:</span>
            <span style="color:#FFFFFF; font-weight:600;">generated_app/</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; color:#9CA3AF; margin-top:4px;">
            <span>Files on Disk:</span>
            <span style="color:#10B981; font-weight:600;">${state.files.length} files ✓</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11px; color:#9CA3AF; margin-top:4px;">
            <span>Safe Area Validated:</span>
            <span style="color:#10B981; font-weight:600;">PASSED ✓</span>
          </div>
        </div>
      </div>
    `;
  } else if (stage === 'explain') {
    const lesson = state.lesson || {};
    container.innerHTML = `
      <div class="stage-card">
        <div class="card-header-badge">
          <span class="badge-tag">Tutor Persona</span>
          <span class="live-pill">Code Anatomy</span>
        </div>
        <h3 class="stage-title">${escapeHTML(lesson.title || 'Codebase Explanations')}</h3>
        <p class="stage-desc">${escapeHTML(lesson.architecture_overview || 'Deep-dive into React Native architecture.')}</p>

        <div style="margin-top:14px; display:flex; flex-direction:column; gap:10px;">
          ${(lesson.concepts || []).map(c => `
            <div style="background:#111624; border:1px solid rgba(99,102,241,0.25); border-radius:8px; padding:10px;">
              <h5 style="color:#C7D2FE; font-size:12px; font-weight:700;">${escapeHTML(c.title)}</h5>
              <p style="font-size:11px; color:#9CA3AF; margin-top:4px; line-height:1.4;">${escapeHTML(c.why_it_matters)}</p>
              <pre style="background:#090C14; padding:6px; border-radius:4px; margin-top:6px; font-family:var(--font-mono); font-size:10px; color:#818CF8; overflow-x:auto;">${escapeHTML(c.code_snippet)}</pre>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (stage === 'learn') {
    const challenges = state.challenges || { quiz: [], mini_challenges: [] };
    container.innerHTML = `
      <div class="stage-card">
        <div class="card-header-badge">
          <span class="badge-tag">Mastery Engine</span>
          <span class="live-pill">Interactive Quiz</span>
        </div>
        <h3 class="stage-title">Comprehension Checks</h3>
        <p class="stage-desc">Test your understanding of the architecture generated for this application.</p>

        <div id="quiz-container" style="margin-top:12px; display:flex; flex-direction:column; gap:14px;">
          ${(challenges.quiz || []).map((q, qIndex) => `
            <div class="quiz-card" style="background:#111624; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px;">
              <p style="font-size:12px; font-weight:600; color:#FFFFFF; margin-bottom:8px;">${qIndex + 1}. ${escapeHTML(q.question)}</p>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${q.options.map((opt, oIndex) => `
                  <button class="quiz-opt-btn" onclick="checkQuizAnswer(${qIndex}, ${oIndex}, ${q.answer_index}, this)" style="text-align:left; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:8px 10px; border-radius:6px; color:#D1D5DB; font-size:11px; cursor:pointer;">
                    ${escapeHTML(opt)}
                  </button>
                `).join('')}
              </div>
              <div id="quiz-expl-${qIndex}" style="display:none; font-size:11px; color:#A5B4FC; margin-top:8px; line-height:1.4; padding:6px; background:rgba(99,102,241,0.1); border-radius:6px;">
                💡 ${escapeHTML(q.explanation)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

window.checkQuizAnswer = function(qIndex, selectedIndex, correctIndex, btnElement) {
  const parent = btnElement.parentElement;
  parent.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);

  if (selectedIndex === correctIndex) {
    btnElement.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
    btnElement.style.borderColor = '#10B981';
    btnElement.style.color = '#34D399';
    showToast('Correct! Great technical understanding.');
  } else {
    btnElement.style.backgroundColor = 'rgba(244, 63, 94, 0.2)';
    btnElement.style.borderColor = '#F43F5E';
    btnElement.style.color = '#FDA4AF';
    showToast('Incorrect. Review the explanation below.');
  }

  const expl = document.getElementById(`quiz-expl-${qIndex}`);
  if (expl) expl.style.display = 'block';
};

// --- Interactive Virtual Mobile Simulator Runtime ---
function renderSimulator() {
  if (!state.simulatorSchema || !state.simulatorSchema.screens) return;
  const tabs = Object.keys(state.simulatorSchema.screens);
  if (!tabs.includes(state.currentTab)) {
    state.currentTab = tabs[0];
  }
  renderSimulatorScreen();
  renderSimulatorTabBar();
}

function renderSimulatorScreen() {
  const schema = state.simulatorSchema;
  const container = document.getElementById('sim-screen-container');
  if (!schema || !container) return;

  const screenData = schema.screens[state.currentTab] || Object.values(schema.screens)[0];
  if (!screenData) return;

  container.innerHTML = `
    <div class="sim-header">
      <div class="sim-title-group">
        <h2 class="sim-app-title">${escapeHTML(screenData.title || schema.appName)}</h2>
        <span class="sim-subtitle">${escapeHTML(state.currentTab)}</span>
      </div>
    </div>

    ${screenData.metric ? `
      <div class="sim-metric-card">
        <div class="sim-metric-title">${escapeHTML(screenData.metric.title)}</div>
        <div class="sim-metric-value">${escapeHTML(screenData.metric.value)}</div>
        <div class="sim-metric-sub">${escapeHTML(screenData.metric.sub)}</div>
      </div>
    ` : ''}

    <div class="sim-input-row">
      <input 
        type="text" 
        id="phone-user-input" 
        class="sim-input" 
        placeholder="${escapeHTML(screenData.inputPlaceholder || 'Add a new item...')}" 
      />
      <button class="sim-add-btn" onclick="addPhoneItem()">+</button>
    </div>

    <div class="sim-section-header">
      <span>${escapeHTML(screenData.sectionTitle || 'Items')}</span>
      <span style="font-size: 10px; color: var(--accent-indigo);">${(screenData.items || []).length} items</span>
    </div>

    <div class="sim-items-list" id="sim-items-container">
      ${(screenData.items || []).map(item => `
        <div class="sim-item ${item.done ? 'done' : ''}" onclick="toggleSimItem('${item.id}')">
          <div class="sim-item-left">
            <span class="sim-item-emoji">${item.emoji || '⚡'}</span>
            <div class="sim-item-text">
              <span class="sim-item-title">${escapeHTML(item.title)}</span>
              ${item.subtitle ? `<span class="sim-item-sub">${escapeHTML(item.subtitle)}</span>` : ''}
            </div>
          </div>
          <div class="sim-check-icon">${item.done ? '✓' : ''}</div>
        </div>
      `).join('')}
    </div>
  `;

  const phoneInput = document.getElementById('phone-user-input');
  if (phoneInput) {
    phoneInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addPhoneItem();
    });
  }
}

window.addPhoneItem = function() {
  const input = document.getElementById('phone-user-input');
  if (!input || !input.value.trim()) return;

  const title = input.value.trim();
  input.value = '';

  const schema = state.simulatorSchema;
  const screenData = schema.screens[state.currentTab] || Object.values(schema.screens)[0];
  if (!screenData) return;

  if (!screenData.items) screenData.items = [];
  screenData.items.unshift({
    id: Date.now().toString(),
    title: title,
    subtitle: 'Added live',
    emoji: '⚡',
    done: false
  });

  renderSimulatorScreen();
  showToast(`Added '${title}' in phone simulator!`);
};

window.toggleSimItem = function(itemId) {
  const schema = state.simulatorSchema;
  const screenData = schema.screens[state.currentTab] || Object.values(schema.screens)[0];
  if (!screenData) return;

  const item = (screenData.items || []).find(i => i.id === itemId);
  if (item) {
    item.done = !item.done;
    renderSimulatorScreen();
  }
};

function renderSimulatorTabBar() {
  const schema = state.simulatorSchema;
  const tabBar = document.getElementById('sim-tab-bar');
  if (!schema || !tabBar) return;
  tabBar.innerHTML = '';

  const tabKeys = Object.keys(schema.screens);
  const icons = ['🏠', '🧭', '📊', '👤'];

  tabKeys.forEach((tabName, idx) => {
    const btn = document.createElement('button');
    btn.className = `sim-tab-item ${tabName === state.currentTab ? 'active' : ''}`;
    btn.innerHTML = `
      <span class="sim-tab-icon">${icons[idx % icons.length]}</span>
      <span>${escapeHTML(tabName)}</span>
    `;
    btn.addEventListener('click', () => {
      state.currentTab = tabName;
      renderSimulatorTabBar();
      renderSimulatorScreen();
    });
    tabBar.appendChild(btn);
  });
}

function setDeviceMode(mode) {
  state.deviceMode = mode;
  const phone = document.getElementById('phone-device');
  const cutout = document.getElementById('phone-cutout');

  if (mode === 'android') {
    phone.classList.add('android');
    cutout.innerHTML = '<div style="width:12px; height:12px; background:#000; border-radius:50%; margin-top:2px;"></div>';
  } else {
    phone.classList.remove('android');
    cutout.innerHTML = '<div class="dynamic-island"><span class="sensor-cam"></span></div>';
  }
}

// --- Utilities ---
function activateLeftTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-left-tab') === tabId);
  });
  document.querySelectorAll('.left-tab-content').forEach(c => {
    const isTarget = c.id === `view-${tabId}` || (tabId === 'stage-view' && (c.id === 'view-stage-content' || c.id === 'view-stage-view'));
    c.classList.toggle('active', isTarget);
  });
}

function setLiveStatus(text, isPulse) {
  const el = document.getElementById('live-indicator');
  if (el) {
    el.textContent = text;
    el.style.borderColor = isPulse ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.1)';
    el.style.color = isPulse ? '#818CF8' : '#9CA3AF';
  }
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function startClock() {
  function update() {
    const d = new Date();
    let hours = d.getHours();
    let minutes = d.getMinutes();
    minutes = minutes < 10 ? '0' + minutes : minutes;
    const timeEl = document.getElementById('sim-clock');
    if (timeEl) timeEl.textContent = `${hours}:${minutes}`;
  }
  update();
  setInterval(update, 30000);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function exportExpoZip() {
  const appName = state.spec ? state.spec.app_name : 'LunorMobileApp';
  try {
    const res = await fetch(getApiUrl('/api/export'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_name: appName,
        files: state.files
      })
    });
    if (!res.ok) throw new Error('Export error');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appName}-expo.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(`📦 Downloaded ${appName}-expo.zip!`);
  } catch (err) {
    showToast('Failed to export ZIP');
  }
}
