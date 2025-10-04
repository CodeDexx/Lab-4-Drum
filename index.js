// ================ GLOBAL VARIABLES ================
let drumKit = {
  volume: parseFloat(localStorage.getItem("drumVolume")) || 1.0,
  isRecording: false,
  recordedSequence: [],
  recordStartTime: 0,
  keyMapping: JSON.parse(localStorage.getItem("drumKeyMapping")) || {
    w: "tom-1",
    a: "tom-2",
    s: "tom-3",
    d: "tom-4",
    j: "snare",
    k: "crash",
    l: "kick-bass",
  },
  metronome: {
    isRunning: false,
    bpm: parseInt(localStorage.getItem("drumBPM")) || 120,
    interval: null,
    audio: null,
  },
  audioCache: {},
};

// ================ INITIALIZATION ================
document.addEventListener("DOMContentLoaded", function () {
  initializeDrumKit();
  createControlsInterface();
  setupEventListeners();
  loadSettings();
});

function initializeDrumKit() {
  // Pre-load audio files
  Object.values(drumKit.keyMapping).forEach((sound) => {
    drumKit.audioCache[sound] = new Audio(`./sounds/${sound}.mp3`);
    drumKit.audioCache[sound].volume = drumKit.volume;
  });

  // Create metronome sound
  drumKit.metronome.audio = new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQcAjiUz+zEeyYEOnfI+OODTxcXU6nm/bJYIAY9it/uwGAWCDic3+/ypGgWDEOVy/vBdiMKGUGT7PyxZSAGO4jf+95qHAsZb7ri3KdoGg1FiO76wno4EStCh/DXhkVGGhxNjPnlhmxCGAVKmP/wxXJTJgJLk/nQgGtHEQZJk+zPjnUoAzKC5ubBaHAfCFSs8Mu9cmEeAzSGy+nN+GgeBCMJ"
  );
  drumKit.metronome.audio.volume = drumKit.volume * 0.3;

  // Add data attributes to existing drum buttons for our system
  const drumButtons = document.querySelectorAll(".drum");
  drumButtons.forEach((button) => {
    const key = button.textContent.trim();
    const sound = drumKit.keyMapping[key];
    button.setAttribute("data-key", key);
    button.setAttribute("data-sound", sound);
  });
}

function createControlsInterface() {
  // Create controls panel
  const controlsPanel = document.createElement("div");
  controlsPanel.style.cssText = `
    background-color: rgba(64, 75, 105, 0.8);
    padding: 20px;
    margin: 20px auto;
    border-radius: 15px;
    max-width: 800px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px;
  `;

  // Volume Control
  const volumeGroup = createControlGroup();
  const volumeLabel = document.createElement("label");
  volumeLabel.innerHTML =
    'Volume: <span id="volumeDisplay">' +
    Math.round(drumKit.volume * 100) +
    "%</span>";
  volumeLabel.style.cssText =
    "color: #DBEDF3; font-family: sans-serif; font-weight: bold;";

  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.id = "volumeSlider";
  volumeSlider.min = "0";
  volumeSlider.max = "100";
  volumeSlider.value = Math.round(drumKit.volume * 100);
  volumeSlider.style.cssText =
    "width: 100px; height: 5px; border-radius: 5px; background: #404B69; outline: none;";

  volumeGroup.appendChild(volumeLabel);
  volumeGroup.appendChild(volumeSlider);

  // Recording Controls
  const recordGroup = createControlGroup();
  const recordBtn = createControlButton("recordBtn", "🔴 Record");
  const playBtn = createControlButton("playBtn", "▶️ Play");
  const clearBtn = createControlButton("clearBtn", "🗑️ Clear");
  playBtn.disabled = true;
  clearBtn.disabled = true;

  const recordStatus = document.createElement("span");
  recordStatus.id = "recordingStatus";
  recordStatus.style.cssText =
    "color: #FF6B6B; font-weight: bold; font-family: sans-serif;";

  recordGroup.appendChild(recordBtn);
  recordGroup.appendChild(playBtn);
  recordGroup.appendChild(clearBtn);
  recordGroup.appendChild(recordStatus);

  // Metronome Controls
  const metronomeGroup = createControlGroup();
  const bpmLabel = document.createElement("label");
  bpmLabel.innerHTML =
    'BPM: <span id="bpmDisplay">' + drumKit.metronome.bpm + "</span>";
  bpmLabel.style.cssText =
    "color: #DBEDF3; font-family: sans-serif; font-weight: bold;";

  const bpmSlider = document.createElement("input");
  bpmSlider.type = "range";
  bpmSlider.id = "bpmSlider";
  bpmSlider.min = "60";
  bpmSlider.max = "200";
  bpmSlider.value = drumKit.metronome.bpm;
  bpmSlider.style.cssText =
    "width: 100px; height: 5px; border-radius: 5px; background: #404B69; outline: none;";

  const metronomeBtn = createControlButton(
    "metronomeBtn",
    "🎵 Start Metronome"
  );

  metronomeGroup.appendChild(bpmLabel);
  metronomeGroup.appendChild(bpmSlider);
  metronomeGroup.appendChild(metronomeBtn);

  // Key Remapping
  const remapGroup = createControlGroup();
  const remapBtn = createControlButton("remapBtn", "⌨️ Customize Keys");
  remapGroup.appendChild(remapBtn);

  // Add all groups to controls panel
  controlsPanel.appendChild(volumeGroup);
  controlsPanel.appendChild(recordGroup);
  controlsPanel.appendChild(metronomeGroup);
  controlsPanel.appendChild(remapGroup);

  // Insert controls after title
  const title = document.getElementById("title");
  title.parentNode.insertBefore(controlsPanel, title.nextSibling);

  // Create modal for key remapping
  createRemapModal();
}

function createControlGroup() {
  const group = document.createElement("div");
  group.style.cssText =
    "display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 150px;";
  return group;
}

function createControlButton(id, text) {
  const button = document.createElement("button");
  button.id = id;
  button.textContent = text;
  button.style.cssText =
    "background-color: #DA0463; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-family: sans-serif; font-weight: bold; transition: all 0.2s;";

  button.addEventListener("mouseenter", function () {
    this.style.backgroundColor = "#B8034A";
    this.style.transform = "scale(1.05)";
  });

  button.addEventListener("mouseleave", function () {
    if (!this.disabled) {
      this.style.backgroundColor = "#DA0463";
      this.style.transform = "scale(1)";
    }
  });

  return button;
}

function createRemapModal() {
  const modal = document.createElement("div");
  modal.id = "remapModal";
  modal.style.cssText =
    "display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);";

  const modalContent = document.createElement("div");
  modalContent.style.cssText =
    "background-color: #283149; margin: 15% auto; padding: 20px; border-radius: 15px; width: 80%; max-width: 500px; color: #DBEDF3;";

  const closeBtn = document.createElement("span");
  closeBtn.innerHTML = "&times;";
  closeBtn.style.cssText =
    "color: #DBEDF3; float: right; font-size: 28px; font-weight: bold; cursor: pointer;";
  closeBtn.addEventListener("click", closeRemapModal);

  const title = document.createElement("h2");
  title.textContent = "Customize Keys";
  title.style.margin = "0 0 20px 0";

  const keyMappings = document.createElement("div");
  keyMappings.id = "keyMappings";
  keyMappings.style.cssText =
    "display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 20px 0;";

  const saveBtn = createControlButton("saveMapping", "Save Changes");
  const resetBtn = createControlButton("resetMapping", "Reset to Default");

  modalContent.appendChild(closeBtn);
  modalContent.appendChild(title);
  modalContent.appendChild(keyMappings);
  modalContent.appendChild(saveBtn);
  modalContent.appendChild(resetBtn);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

function setupEventListeners() {
  // Drum button clicks
  document.querySelectorAll(".drum").forEach((button) => {
    button.addEventListener("click", function () {
      var key = this.getAttribute("data-key");
      playSound(key);
      buttonAnimation(key);
      recordHit(key);
    });
  });

  // Keyboard presses
  document.addEventListener("keydown", function (event) {
    if (Object.keys(drumKit.keyMapping).includes(event.key.toLowerCase())) {
      playSound(event.key.toLowerCase());
      buttonAnimation(event.key.toLowerCase());
      recordHit(event.key.toLowerCase());
    }
  });

  // Volume control
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeDisplay = document.getElementById("volumeDisplay");
  volumeSlider.addEventListener("input", function () {
    drumKit.volume = this.value / 100;
    volumeDisplay.textContent = this.value + "%";
    updateAudioVolumes();
    localStorage.setItem("drumVolume", drumKit.volume);
  });

  // Recording controls
  document
    .getElementById("recordBtn")
    .addEventListener("click", toggleRecording);
  document.getElementById("playBtn").addEventListener("click", playRecording);
  document.getElementById("clearBtn").addEventListener("click", clearRecording);

  // Metronome controls
  const bpmSlider = document.getElementById("bpmSlider");
  const bpmDisplay = document.getElementById("bpmDisplay");
  bpmSlider.addEventListener("input", function () {
    drumKit.metronome.bpm = parseInt(this.value);
    bpmDisplay.textContent = this.value;
    localStorage.setItem("drumBPM", drumKit.metronome.bpm);
    if (drumKit.metronome.isRunning) {
      stopMetronome();
      startMetronome();
    }
  });

  document
    .getElementById("metronomeBtn")
    .addEventListener("click", toggleMetronome);

  // Key remapping
  document.getElementById("remapBtn").addEventListener("click", openRemapModal);
  document
    .getElementById("saveMapping")
    .addEventListener("click", saveKeyMapping);
  document
    .getElementById("resetMapping")
    .addEventListener("click", resetKeyMapping);
}

function loadSettings() {
  // Load volume
  document.getElementById("volumeSlider").value = drumKit.volume * 100;
  document.getElementById("volumeDisplay").textContent =
    Math.round(drumKit.volume * 100) + "%";

  // Load BPM
  document.getElementById("bpmSlider").value = drumKit.metronome.bpm;
  document.getElementById("bpmDisplay").textContent = drumKit.metronome.bpm;

  updateAudioVolumes();
}

// ================ CORE FUNCTIONS ================
function playSound(key) {
  const soundName = drumKit.keyMapping[key];
  if (soundName && drumKit.audioCache[soundName]) {
    // Reset audio to beginning and play
    drumKit.audioCache[soundName].currentTime = 0;
    drumKit.audioCache[soundName]
      .play()
      .catch((e) => console.log("Audio play failed:", e));
  }
}

function buttonAnimation(currentKey) {
  var activeButton = document.querySelector(`[data-key="${currentKey}"]`);

  if (activeButton) {
    // Add pressed effect
    activeButton.classList.add("pressed");

    // Add flash effect
    activeButton.classList.add("flash");

    // Create ripple effect
    createRippleEffect(activeButton);

    setTimeout(function () {
      activeButton.classList.remove("pressed");
      activeButton.classList.remove("flash");
    }, 150);
  }
}

function createRippleEffect(button) {
  const ripple = document.createElement("span");
  ripple.classList.add("ripple");

  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + "px";
  ripple.style.left = rect.width / 2 - size / 2 + "px";
  ripple.style.top = rect.height / 2 - size / 2 + "px";

  button.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
}

function updateAudioVolumes() {
  Object.values(drumKit.audioCache).forEach((audio) => {
    audio.volume = drumKit.volume;
  });
  if (drumKit.metronome.audio) {
    drumKit.metronome.audio.volume = drumKit.volume * 0.3;
  }
}

// ================ RECORDING SYSTEM ================
function toggleRecording() {
  if (drumKit.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  drumKit.isRecording = true;
  drumKit.recordedSequence = [];
  drumKit.recordStartTime = Date.now();

  document.getElementById("recordBtn").textContent = "⏹️ Stop";
  document.getElementById("recordBtn").classList.add("recording");
  document.getElementById("recordingStatus").textContent = "Recording...";
}

function stopRecording() {
  drumKit.isRecording = false;

  document.getElementById("recordBtn").textContent = "🔴 Record";
  document.getElementById("recordBtn").classList.remove("recording");
  document.getElementById("recordingStatus").textContent = "Recording stopped";

  if (drumKit.recordedSequence.length > 0) {
    document.getElementById("playBtn").disabled = false;
    document.getElementById("clearBtn").disabled = false;
  }
}

function recordHit(key) {
  if (drumKit.isRecording) {
    const timestamp = Date.now() - drumKit.recordStartTime;
    drumKit.recordedSequence.push({
      key: key,
      timestamp: timestamp,
    });
  }
}

function playRecording() {
  if (drumKit.recordedSequence.length === 0) return;

  document.getElementById("playBtn").disabled = true;
  document.getElementById("recordingStatus").textContent = "Playing...";

  let playIndex = 0;

  function playNextHit() {
    if (playIndex >= drumKit.recordedSequence.length) {
      document.getElementById("playBtn").disabled = false;
      document.getElementById("recordingStatus").textContent =
        "Playback complete";
      return;
    }

    const hit = drumKit.recordedSequence[playIndex];
    const nextHit = drumKit.recordedSequence[playIndex + 1];

    playSound(hit.key);
    buttonAnimation(hit.key);

    playIndex++;

    if (nextHit) {
      const delay = nextHit.timestamp - hit.timestamp;
      setTimeout(playNextHit, delay);
    } else {
      setTimeout(() => {
        document.getElementById("playBtn").disabled = false;
        document.getElementById("recordingStatus").textContent =
          "Playback complete";
      }, 500);
    }
  }

  playNextHit();
}

function clearRecording() {
  drumKit.recordedSequence = [];
  document.getElementById("playBtn").disabled = true;
  document.getElementById("clearBtn").disabled = true;
  document.getElementById("recordingStatus").textContent = "Recording cleared";
}

// ================ METRONOME SYSTEM ================
function toggleMetronome() {
  if (drumKit.metronome.isRunning) {
    stopMetronome();
  } else {
    startMetronome();
  }
}

function startMetronome() {
  drumKit.metronome.isRunning = true;
  const interval = (60 / drumKit.metronome.bpm) * 1000;

  document.getElementById("metronomeBtn").textContent = "⏸️ Stop Metronome";

  drumKit.metronome.interval = setInterval(() => {
    drumKit.metronome.audio.currentTime = 0;
    drumKit.metronome.audio
      .play()
      .catch((e) => console.log("Metronome play failed:", e));
  }, interval);
}

function stopMetronome() {
  drumKit.metronome.isRunning = false;

  if (drumKit.metronome.interval) {
    clearInterval(drumKit.metronome.interval);
    drumKit.metronome.interval = null;
  }

  document.getElementById("metronomeBtn").textContent = "🎵 Start Metronome";
}

// ================ KEY REMAPPING SYSTEM ================
function openRemapModal() {
  const modal = document.getElementById("remapModal");
  const keyMappings = document.getElementById("keyMappings");

  // Clear existing content
  keyMappings.innerHTML = "";

  // Create input fields for each drum
  const drumSounds = [
    "tom-1",
    "tom-2",
    "tom-3",
    "tom-4",
    "snare",
    "crash",
    "kick-bass",
  ];
  const drumNames = [
    "Tom 1",
    "Tom 2",
    "Tom 3",
    "Tom 4",
    "Snare",
    "Crash",
    "Kick",
  ];

  drumSounds.forEach((sound, index) => {
    const currentKey =
      Object.keys(drumKit.keyMapping).find(
        (key) => drumKit.keyMapping[key] === sound
      ) || "";

    const mappingDiv = document.createElement("div");
    mappingDiv.style.cssText =
      "display: flex; flex-direction: column; align-items: center; gap: 5px;";

    const label = document.createElement("label");
    label.textContent = drumNames[index];
    label.style.fontWeight = "bold";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = "1";
    input.value = currentKey;
    input.setAttribute("data-sound", sound);
    input.className = "key-input";
    input.style.cssText =
      "width: 50px; text-align: center; padding: 5px; border: 2px solid #404B69; border-radius: 5px; background-color: white; font-weight: bold;";

    mappingDiv.appendChild(label);
    mappingDiv.appendChild(input);
    keyMappings.appendChild(mappingDiv);
  });

  modal.style.display = "block";
}

function closeRemapModal() {
  document.getElementById("remapModal").style.display = "none";
}

function saveKeyMapping() {
  const inputs = document.querySelectorAll(".key-input");
  const newMapping = {};

  inputs.forEach((input) => {
    const key = input.value.toLowerCase();
    const sound = input.getAttribute("data-sound");

    if (key && key.length === 1) {
      newMapping[key] = sound;
    }
  });

  // Update drum buttons with new keys
  Object.keys(newMapping).forEach((key) => {
    const sound = newMapping[key];
    const button = document.querySelector('[data-sound="' + sound + '"]');
    if (button) {
      button.textContent = key;
      button.setAttribute("data-key", key);
      // Keep the original sound-based class for background image, add new key class
      const soundClass = getSoundClass(sound);
      button.className = soundClass + " " + key + " drum";
    }
  });

  drumKit.keyMapping = newMapping;
  localStorage.setItem("drumKeyMapping", JSON.stringify(newMapping));

  closeRemapModal();
}

// Helper function to get the original CSS class for background images
function getSoundClass(sound) {
  const soundToClassMap = {
    "tom-1": "w",
    "tom-2": "a",
    "tom-3": "s",
    "tom-4": "d",
    snare: "j",
    crash: "k",
    "kick-bass": "l",
  };
  return soundToClassMap[sound] || "";
}

function resetKeyMapping() {
  const defaultMapping = {
    w: "tom-1",
    a: "tom-2",
    s: "tom-3",
    d: "tom-4",
    j: "snare",
    k: "crash",
    l: "kick-bass",
  };

  drumKit.keyMapping = defaultMapping;
  localStorage.setItem("drumKeyMapping", JSON.stringify(defaultMapping));

  // Update buttons
  Object.keys(defaultMapping).forEach((key) => {
    const sound = defaultMapping[key];
    const button = document.querySelector('[data-sound="' + sound + '"]');
    if (button) {
      button.textContent = key;
      button.setAttribute("data-key", key);
      // Keep the original sound-based class for background image, add key class
      const soundClass = getSoundClass(sound);
      button.className = soundClass + " " + key + " drum";
    }
  });

  closeRemapModal();
}
