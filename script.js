// ===== Stock Reorder Alert System - Frontend Logic =====

const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const dropZone = document.getElementById("dropZone");
const fileNameEl = document.getElementById("fileName");
const uploadBtn = document.getElementById("uploadBtn");
const uploadBtnText = document.getElementById("uploadBtnText");
const notificationContainer = document.getElementById("notificationContainer");

const statsGrid = document.getElementById("statsGrid");
const resultsSection = document.getElementById("resultsSection");
const resultsBody = document.getElementById("resultsBody");

let selectedFile = null;

// ---------- File Selection ----------
browseBtn.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) handleFileSelect(e.target.files[0]);
});

// Drag & drop
["dragenter", "dragover"].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
});

function handleFileSelect(file) {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    showNotification("error", "❌ Invalid File", "Please select a valid .csv file.");
    return;
  }
  selectedFile = file;
  fileNameEl.textContent = `Selected: ${file.name}`;
  uploadBtn.disabled = false;
}

// ---------- Upload & Analyze ----------
uploadBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  uploadBtn.disabled = true;
  uploadBtnText.textContent = "Analyzing...";

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      showNotification("error", "❌ Upload Failed", result.error || "Something went wrong.");
      return;
    }

    renderResults(result.data);
    fireStockNotifications(result.data);

  } catch (err) {
    showNotification("error", "❌ Connection Error", "Could not reach the server. Is Flask running?");
  } finally {
    uploadBtn.disabled = false;
    uploadBtnText.textContent = "Upload & Analyze";
  }
});

// ---------- Render Results Table + Stats ----------
function renderResults(data) {
  statsGrid.style.display = "grid";
  resultsSection.style.display = "block";

  document.getElementById("statTotal").textContent = data.total_items;
  document.getElementById("statLow").textContent = data.low_stock_count;
  document.getElementById("statNormal").textContent = data.normal_stock_count;
  document.getElementById("statHigh").textContent = data.high_stock_count;

  resultsBody.innerHTML = "";

  data.all_items.forEach((item) => {
    let status, badgeClass;
    if (item.current_quantity < item.reorder_threshold) {
      status = "Low Stock";
      badgeClass = "badge-low";
    } else if (
      item.reorder_threshold > 0 &&
      item.current_quantity >= item.reorder_threshold * 2
    ) {
      status = "High Stock";
      badgeClass = "badge-high";
    } else {
      status = "Normal";
      badgeClass = "badge-normal";
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(item.item_name)}</td>
      <td>${item.current_quantity}</td>
      <td>${item.reorder_threshold}</td>
      <td>${item.percentage}%</td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
    `;
    resultsBody.appendChild(row);
  });
}

// ---------- Notification Popups ----------
function fireStockNotifications(data) {
  // Low stock alert
  if (data.low_stock_count > 0) {
    const names = data.low_stock.map((i) => i.item_name).join(", ");
    const avgPct = average(data.low_stock.map((i) => i.percentage));
    showNotification(
      "low",
      `⚠️ Restock Needed (${data.low_stock_count})`,
      `<strong>${escapeHtml(names)}</strong><br>Avg stock level: ${avgPct}% of threshold`
    );
  }

  // High stock alert
  if (data.high_stock_count > 0) {
    const names = data.high_stock.map((i) => i.item_name).join(", ");
    const avgPct = average(data.high_stock.map((i) => i.percentage));
    showNotification(
      "high",
      `📈 Overstocked Items (${data.high_stock_count})`,
      `<strong>${escapeHtml(names)}</strong><br>Avg stock level: ${avgPct}% of threshold`
    );
  }

  // All good
  if (data.low_stock_count === 0 && data.high_stock_count === 0) {
    showNotification(
      "success",
      "✅ Inventory Healthy",
      `All ${data.total_items} items are within normal stock range.`
    );
  }
}

function average(arr) {
  if (!arr.length) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

function showNotification(type, title, bodyHtml, duration = 5000) {
  const popup = document.createElement("div");
  popup.className = `notification-popup ${type}`;
  popup.innerHTML = `
    <button class="notif-close">&times;</button>
    <div class="notif-title">${title}</div>
    <div class="notif-body">${bodyHtml}</div>
    <div class="notif-progress"></div>
  `;

  notificationContainer.appendChild(popup);

  const closeBtn = popup.querySelector(".notif-close");
  const removePopup = () => {
    popup.classList.add("hide");
    setTimeout(() => popup.remove(), 350);
  };

  closeBtn.addEventListener("click", removePopup);

  // Auto-hide after `duration` ms (default 5s)
  setTimeout(removePopup, duration);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
