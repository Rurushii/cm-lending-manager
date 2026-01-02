// --- GLOBAL STATE ---
let borrowers = [],
  activeIndex = -1,
  globalPenaltyAmt = 50,
  globalPenaltyHrs = 5;
let isCurrentPenalty = false,
  isPartial = false,
  receiptSummaryHTML = "";

// --- INITIALIZATION ---
window.onload = function () {
  loadSettings();
  loadBorrowers();
  renderTabs();
  showCreateScreen();

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("newLoanDate").value = today;
  document.getElementById("paymentDate").value = today;

  // Set min date to avoid calendar issues
  const minDate = "2024-01-01";
  document.getElementById("newLoanDate").setAttribute("min", minDate);
  document.getElementById("newDueDate").setAttribute("min", minDate);
  document.getElementById("paymentDate").setAttribute("min", minDate);
};

// --- DATA MANAGEMENT ---
function loadBorrowers() {
  const saved = localStorage.getItem("lendingBorrowers");
  if (saved) borrowers = JSON.parse(saved);
}

function saveBorrowersToStorage() {
  localStorage.setItem("lendingBorrowers", JSON.stringify(borrowers));
  renderTabs();
}

function renderTabs() {
  const container = document.getElementById("borrowerTabs");
  container.innerHTML = "";

  borrowers.forEach((b, index) => {
    const btn = document.createElement("button");
    btn.className = `tab-btn ${index === activeIndex ? "active" : ""}`;
    btn.innerHTML = `<span>${b.name}</span> <small>₱${formatNumber(b.balance)}</small>`;
    btn.onclick = () => selectBorrower(index);
    container.appendChild(btn);
  });

  document.getElementById("creditCount").innerText = `${borrowers.length}/5 Borrowers`;

  const addBtn = document.querySelector(".add-new-btn");
  if (addBtn) addBtn.disabled = borrowers.length >= 5;
}

// --- SCREEN SWITCHING ---
function showCreateScreen() {
  activeIndex = -1;
  renderTabs();
  document.getElementById("createScreen").style.display = "block";
  document.getElementById("manageScreen").style.display = "none";
  document.getElementById("newBorrowerName").value = "";
  document.getElementById("newPrincipal").value = "";
  document.getElementById("newDueDate").value = "";
  resetManageInputs();
}

function saveNewBorrower() {
  const name = document.getElementById("newBorrowerName").value;
  const princ = parseNumber(document.getElementById("newPrincipal").value);
  const rate = parseFloat(document.getElementById("newInterest").value);
  const loanDate = document.getElementById("newLoanDate").value;
  const dueDate = document.getElementById("newDueDate").value;

  if (!name || !princ || !dueDate) return alert("Please fill in all fields.");

  const total = princ + princ * (rate / 100);

  borrowers.push({
    name,
    principal: princ,
    interestRate: rate,
    totalWithInterest: total,
    balance: total,
    loanDate,
    dueDate,
    penaltyAmt: globalPenaltyAmt,
    penaltyHrs: globalPenaltyHrs,
  });

  saveBorrowersToStorage();
  selectBorrower(borrowers.length - 1);
}

function selectBorrower(index) {
  activeIndex = index;
  renderTabs();
  const b = borrowers[index];
  document.getElementById("createScreen").style.display = "none";
  document.getElementById("manageScreen").style.display = "block";
  document.getElementById("displayBorrowerName").innerText = b.name;
  document.getElementById("manageAmount").value = formatNumber(b.balance);
  document.getElementById("manageDueDate").value = b.dueDate;
  document.getElementById("ruleText").innerText = `Rule: ₱${b.penaltyAmt} per ${b.penaltyHrs} hours`;
  resetManageInputs();
}

function resetManageInputs() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("paymentDate").value = today;
  document.getElementById("paymentTime").value = "";
  document.getElementById("amountPaid").value = "";
  document.getElementById("output").style.display = "none";
  document.getElementById("breakdown").style.display = "none";
  document.getElementById("finalDownloadBtn").style.display = "none";
  document.getElementById("output").innerHTML = "";
}

function deleteActiveBorrower() {
  if (confirm("Delete this borrower?")) {
    borrowers.splice(activeIndex, 1);
    saveBorrowersToStorage();
    showCreateScreen();
  }
}

// --- CALCULATE ---
function calculate() {
  const b = borrowers[activeIndex];
  const payDate = document.getElementById("paymentDate").value;
  const payTime = document.getElementById("paymentTime").value;

  if (!payDate || !payTime) return alert("Enter payment date/time");

  const start = new Date(b.dueDate + "T00:00:00");
  start.setDate(start.getDate() + 1);
  const end = new Date(payDate + "T" + payTime + ":00");

  let totalPen = 0, count = 0, detailed = "<h3>Details</h3>", dailyCounts = {};

  if (end > start) {
    isCurrentPenalty = true;
    let curr = new Date(start);
    while (new Date(curr.getTime() + b.penaltyHrs * 3600000) <= end) {
      let next = new Date(curr.getTime() + b.penaltyHrs * 3600000);
      count++;
      totalPen += b.penaltyAmt;
      let key = `${curr.getMonth() + 1}/${curr.getDate()}/${curr.getFullYear().toString().slice(-2)}`;
      if (!dailyCounts[key]) dailyCounts[key] = 0;
      dailyCounts[key]++;
      detailed += `<p style="border-bottom:1px solid #eee;font-size:0.85em;">
        <b>${key}:</b> ${curr.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})} - ${next.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
        <span style="float:right;">+₱${b.penaltyAmt}</span></p>`;
      curr = next;
    }
  } else {
    isCurrentPenalty = false;
  }

  receiptSummaryHTML = "";
  for (const [k, v] of Object.entries(dailyCounts)) {
    receiptSummaryHTML += `${k}: ${v} blocks (₱${formatNumber(v * b.penaltyAmt)})\n`;
  }

  const grand = b.balance + totalPen;
  const inputPaid = parseNumber(document.getElementById("amountPaid").value);
  const paid = inputPaid > 0 ? inputPaid : grand;
  const bal = grand - paid;
  isPartial = bal > 0;

  const out = document.getElementById("output");
  out.innerHTML = `
    <h3 style="color:${isPartial ? "#d35400" : isCurrentPenalty ? "#c0392b" : "#27ae60"};">
      ${isPartial ? "PARTIAL PAYMENT" : isCurrentPenalty ? "LATE PAYMENT" : "PAID ON TIME"}
    </h3>
    <p>Prev Balance: ₱${formatNumber(b.balance)}</p>
    <p>Penalty: ₱${formatNumber(totalPen)}</p>
    <hr>
    <p><b>Total Due: ₱${formatNumber(grand)}</b></p>
    <p style="color:#27ae60;font-size:1.1em;"><b>Paying: ₱${formatNumber(paid)}</b></p>
    ${isPartial ? `<p style="color:#d35400;">Remaining: ₱${formatNumber(bal)}</p>` : ""}
  `;
  out.style.display = "block";

  if (count > 0) {
    document.getElementById("breakdown").innerHTML = detailed;
    document.getElementById("breakdown").style.display = "block";
  } else {
    document.getElementById("breakdown").style.display = "none";
  }
  document.getElementById("finalDownloadBtn").style.display = "block";
}

// --- MISSING FUNCTIONS RESTORED ---

// 1. SETTINGS
function loadSettings() {
  const sA = localStorage.getItem("gA"), sH = localStorage.getItem("gH");
  if (sA) globalPenaltyAmt = parseFloat(sA);
  if (sH) globalPenaltyHrs = parseFloat(sH);
  document.getElementById("setPenaltyAmount").value = globalPenaltyAmt;
  document.getElementById("setPenaltyHours").value = globalPenaltyHrs;
}
function openSettings() { document.getElementById("settingsModal").style.display = "block"; }
function saveSettings() {
  globalPenaltyAmt = parseFloat(document.getElementById("setPenaltyAmount").value);
  globalPenaltyHrs = parseFloat(document.getElementById("setPenaltyHours").value);
  localStorage.setItem("gA", globalPenaltyAmt);
  localStorage.setItem("gH", globalPenaltyHrs);
  document.getElementById("settingsModal").style.display = "none";
}
window.onclick = function (e) {
  if (e.target == document.getElementById("settingsModal")) document.getElementById("settingsModal").style.display = "none";
};

// 2. DOWNLOAD RECEIPT
async function downloadSmartReceipt() {
  const b = borrowers[activeIndex];
  const name = b.name;
  const summary = document.getElementById("output").innerText;

  // Generate Receipt HTML
  document.getElementById("receipt-content").innerHTML = `
    <h2 style="text-align:center;">OFFICIAL RECEIPT</h2>
    <p style="text-align:center;font-size:12px;">CM's LENDING</p><hr>
    <p><b>Date:</b> ${new Date().toLocaleString()}</p>
    <p><b>Borrower:</b> ${name}</p>
    <p><b>Due Date:</b> ${b.dueDate}</p><hr>
    <pre style="white-space:pre-wrap;font-family:inherit;">${summary}</pre><hr>
    ${isCurrentPenalty ? `<p><b>PENALTY SUMMARY:</b></p><pre style="font-size:12px;white-space:pre-wrap;font-family:inherit;">${receiptSummaryHTML}</pre><hr>` : ''}
    <p style="text-align:center;font-weight:bold;">THANK YOU!</p>`;

  // Capture
  const canvas = await html2canvas(document.getElementById("final-receipt-image"));
  const link = document.createElement("a");
  link.download = `Receipt_${name}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();

  // Update Data Logic
  const grandStr = document.getElementById("output").innerHTML.match(/Total Due: ₱([\d,.]+)/)[1];
  const grand = parseNumber(grandStr);
  const paidStr = document.getElementById("output").innerHTML.match(/Paying: ₱([\d,.]+)/)[1];
  const paid = parseNumber(paidStr);
  const rem = grand - paid;

  if (rem <= 0) {
    alert("Paid in full! Borrower removed.");
    borrowers.splice(activeIndex, 1);
    saveBorrowersToStorage();
    showCreateScreen();
  } else {
    alert(`Partial payment recorded. New Balance: ₱${formatNumber(rem)}`);
    b.balance = rem;
    saveBorrowersToStorage();
    selectBorrower(activeIndex); // Refresh view
  }
}

// 3. COPY TO MESSENGER
function copyToClipboard() {
  const b = borrowers[activeIndex];
  const text = `📌 *CM's LENDING*\n👤 ${b.name}\n📅 ${new Date().toLocaleDateString()}\n\n${document.getElementById("output").innerText}\n\nThank you!`;
  navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
}

// --- HELPERS ---
function formatInput(i) {
  let v = i.value.replace(/[^0-9.]/g, "");
  const p = v.split(".");
  if (p.length > 2) v = p[0] + "." + p.slice(1).join("");
  if (v) i.value = parseFloat(v).toLocaleString("en-US", { maximumFractionDigits: 2 }) + (v.endsWith(".") ? "." : "");
  else i.value = "";
}
function parseNumber(v) { if (!v) return 0; return parseFloat(v.toString().replace(/,/g, "")) || 0; }
function formatNumber(n) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// --- MOBILE SIDEBAR LOGIC ---
const menuBtn = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("sidebarOverlay");

if (menuBtn && sidebar && overlay) {
  menuBtn.onclick = () => {
    sidebar.classList.add("show");
    overlay.classList.add("show");
  };
  overlay.onclick = () => {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
  };
}

// Mobile Auto-Close
const originalSelectBorrower = selectBorrower;
selectBorrower = function (index) {
  originalSelectBorrower(index);
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
  }
};