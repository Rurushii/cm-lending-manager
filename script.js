// --- GLOBAL STATE ---
let borrowers = [], activeIndex = -1;
let globalPenaltyAmt = 50, globalPenaltyHrs = 5;
let isCurrentPenalty = false, isPartial = false, receiptSummaryHTML = "";

// --- INIT ---
window.onload = () => {
  loadSettings();
  loadBorrowers();
  renderTabs();
  showCreateScreen();

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("newLoanDate").value = today;
  document.getElementById("paymentDate").value = today;
};

// --- STORAGE ---
function loadBorrowers() {
  const s = localStorage.getItem("lendingBorrowers");
  if (s) borrowers = JSON.parse(s);
}
function saveBorrowersToStorage() {
  localStorage.setItem("lendingBorrowers", JSON.stringify(borrowers));
  renderTabs();
}

// --- SIDEBAR TOGGLE (MOBILE) ---
const menuBtn = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("sidebarOverlay");

menuBtn.onclick = () => {
  sidebar.classList.add("show");
  overlay.classList.add("show");
};

overlay.onclick = closeSidebar;

function closeSidebar() {
  sidebar.classList.remove("show");
  overlay.classList.remove("show");
}

// --- UI ---
function renderTabs() {
  const c = document.getElementById("borrowerTabs");
  c.innerHTML = "";
  borrowers.forEach((b, i) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (i === activeIndex ? " active" : "");
    btn.innerHTML = `<span>${b.name}</span><small>₱${formatNumber(b.balance)}</small>`;
    btn.onclick = () => selectBorrower(i);
    c.appendChild(btn);
  });
  document.getElementById("creditCount").innerText = `${borrowers.length}/5 Borrowers`;
}

// --- SCREENS ---
function showCreateScreen() {
  activeIndex = -1;
  renderTabs();
  document.getElementById("createScreen").style.display = "block";
  document.getElementById("manageScreen").style.display = "none";
}

function selectBorrower(i) {
  activeIndex = i;
  renderTabs();

  const b = borrowers[i];
  document.getElementById("createScreen").style.display = "none";
  document.getElementById("manageScreen").style.display = "block";

  document.getElementById("displayBorrowerName").innerText = b.name;
  document.getElementById("manageAmount").value = formatNumber(b.balance);
  document.getElementById("manageDueDate").value = b.dueDate;
  document.getElementById("ruleText").innerText = `Rule: ₱${b.penaltyAmt} per ${b.penaltyHrs} hours`;

  closeSidebar(); // AUTO CLOSE ON MOBILE
}

// --- CREATE ---
function saveNewBorrower() {
  const name = newBorrowerName.value;
  const p = parseNumber(newPrincipal.value);
  const r = parseFloat(newInterest.value);
  const d = newDueDate.value;

  if (!name || !p || !d) return alert("Fill all fields");

  const total = p + p * (r / 100);
  borrowers.push({
    name,
    principal: p,
    interestRate: r,
    totalWithInterest: total,
    balance: total,
    loanDate: newLoanDate.value,
    dueDate: d,
    penaltyAmt: globalPenaltyAmt,
    penaltyHrs: globalPenaltyHrs
  });

  saveBorrowersToStorage();
  selectBorrower(borrowers.length - 1);
}

// --- HELPERS ---
function formatInput(i) {
  i.value = i.value.replace(/[^0-9.]/g, "");
}
function parseNumber(v) {
  return parseFloat(v.replace(/,/g, "")) || 0;
}
function formatNumber(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2 });
}
function copyToClipboard() {
  navigator.clipboard.writeText(document.getElementById("output").innerText);
}
function loadSettings() {
  globalPenaltyAmt = +localStorage.getItem("gA") || 50;
  globalPenaltyHrs = +localStorage.getItem("gH") || 5;
}
function saveSettings() {
  localStorage.setItem("gA", setPenaltyAmount.value);
  localStorage.setItem("gH", setPenaltyHours.value);
  settingsModal.style.display = "none";
}
function openSettings() {
  settingsModal.style.display = "block";
}
