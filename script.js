// --- GLOBAL STATE ---
let borrowers = [],
  activeIndex = -1,
  globalPenaltyAmt = 50,
  globalPenaltyHrs = 5;

// --- INITIALIZATION ---
window.onload = function () {
  loadSettings();
  loadBorrowers();
  renderTabs();
  showCreateScreen();

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("newLoanDate").value = today;
  document.getElementById("paymentDate").value = today;

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
  try {
    localStorage.setItem("lendingBorrowers", JSON.stringify(borrowers));
  } catch (e) {
    alert("Storage Full! Clear some data.");
  }
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
  document.getElementById("creditCount").innerText = `${borrowers.length} Borrowers (Unlimited)`;
}

// --- SCREEN SWITCHING ---
function showCreateScreen() {
  activeIndex = -1;
  renderTabs();

  document.getElementById("createScreen").style.display = "block";
  document.getElementById("manageScreen").style.display = "none";
  resetManageInputs();
}

// --- IMAGE COMPRESSOR ---
function compressImage(file, maxWidth = 600, quality = 0.5) {
  return new Promise((resolve) => {
    if (!file) { resolve(null); return; }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
    reader.onerror = () => resolve(null);
  });
}

async function saveNewBorrower() {
  const name = document.getElementById("newBorrowerName").value;
  if (!name) return alert("Please enter a name.");

  const btn = document.querySelector(".save-borrower-btn");
  btn.innerText = "Processing...";
  btn.disabled = true;

  const b = {
    name: name,
    address: document.getElementById("newAddress").value,
    contact: document.getElementById("newContactNumber").value,
    relative: document.getElementById("newRelativeInfo").value,
    principal: parseNumber(document.getElementById("newPrincipal").value),
    interestRate: parseFloat(document.getElementById("newInterest").value),
    loanDate: document.getElementById("newLoanDate").value,
    dueDate: document.getElementById("newDueDate").value,
    penaltyAmt: globalPenaltyAmt,
    penaltyHrs: globalPenaltyHrs,
    balance: 0,
    totalWithInterest: 0
  };

  b.totalWithInterest = b.principal + (b.principal * (b.interestRate / 100));
  b.balance = b.totalWithInterest;

  const sigFile = document.getElementById("newSignature").files[0];
  b.signature = await compressImage(sigFile);

  borrowers.push(b);
  saveBorrowersToStorage();
  
  document.getElementById("newBorrowerName").value = "";
  document.getElementById("newPrincipal").value = "";
  
  btn.innerText = "💾 Save Data";
  btn.disabled = false;

  selectBorrower(borrowers.length - 1);
  alert("Borrower Saved!");
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
  
  const imgSig = document.getElementById("viewSignature");
  const txtSig = document.getElementById("noSig");
  if (b.signature) { imgSig.src = b.signature; imgSig.style.display = "block"; txtSig.style.display = "none"; } 
  else { imgSig.style.display = "none"; txtSig.style.display = "block"; }

  resetManageInputs();
}

// --- HELPER TO CLEAR INPUTS ---
function resetManageInputs() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("paymentDate").value = today;
  document.getElementById("amountPaid").value = "";
  document.getElementById("output").style.display = "none";
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

// ==========================================
// DIRECT PNG DOWNLOAD (CONTRACT)
// ==========================================

async function downloadContractDirectly() {
  alert("Generating Contract Image...");

  // 1. Gather Data
  const data = {
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    name: document.getElementById("newBorrowerName").value || "_________________",
    address: document.getElementById("newAddress").value || "_________________",
    contact: document.getElementById("newContactNumber").value || "_________________",
    princ: parseNumber(document.getElementById("newPrincipal").value),
    rate: parseFloat(document.getElementById("newInterest").value),
    dueDate: document.getElementById("newDueDate").value || "_________________",
    penAmt: globalPenaltyAmt,
    penHrs: globalPenaltyHrs
  };

  const interestAmt = data.princ * (data.rate/100);
  const total = data.princ + interestAmt;

  // 2. Fill the Hidden Template
  document.getElementById("cDate").innerText = data.date;
  document.getElementById("cBorrower").innerText = data.name;
  document.getElementById("cAddress").innerText = data.address;
  document.getElementById("cContact").innerText = data.contact;
  document.getElementById("cPrincipal").innerText = formatNumber(data.princ);
  document.getElementById("cRate").innerText = data.rate;
  document.getElementById("cInterest").innerText = formatNumber(interestAmt);
  document.getElementById("cTotal").innerText = formatNumber(total);
  document.getElementById("cDueDate").innerText = data.dueDate;
  document.getElementById("cPenaltyAmt").innerText = data.penAmt;
  document.getElementById("cPenaltyHrs").innerText = data.penHrs;

  // 3. Handle Signature
  const sigFile = document.getElementById("newSignature").files[0];
  const sigImgEl = document.getElementById("cSigImage");
  
  if (sigFile) {
      const sigData = await compressImage(sigFile);
      sigImgEl.src = sigData;
      sigImgEl.style.display = "block";
  } else {
      sigImgEl.style.display = "none";
  }

  // 4. Capture & Download PNG
  const element = document.getElementById("contract-capture-area");
  
  html2canvas(element, { scale: 2 }).then(canvas => {
      const link = document.createElement("a");
      link.download = `Contract_${data.name}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
  }).catch(err => {
      alert("Image Error: " + err.message);
  });
}

// --- CALCULATION LOGIC ---
function calculate() {
  const b = borrowers[activeIndex];
  const payDate = document.getElementById("paymentDate").value;
  const payTime = document.getElementById("paymentTime").value;

  if (!payDate || !payTime)
    return alert("Enter payment date/time");

  const start = new Date(b.dueDate + "T00:00:00");
  start.setDate(start.getDate() + 1);

  const end = new Date(payDate + "T" + payTime + ":00");

  let totalPen = 0;
  let isCurrentPenalty = false;
  let penaltyCount = 0;
  let timelineText = ""; // Store breakdown text

  if (end > start) {
    isCurrentPenalty = true;
    let curr = new Date(start);
    while (new Date(curr.getTime() + b.penaltyHrs * 3600000) <= end) {
      let next = new Date(curr.getTime() + b.penaltyHrs * 3600000);
      penaltyCount++;
      totalPen += b.penaltyAmt;
      
      let dateKey = `${curr.getMonth() + 1}/${curr.getDate()}/${curr.getFullYear().toString().slice(-2)}`;
      let timeStart = curr.toLocaleTimeString([], {hour: "numeric", minute: "2-digit", hour12: true}).toLowerCase();
      let timeEnd = next.toLocaleTimeString([], {hour: "numeric", minute: "2-digit", hour12: true}).toLowerCase();
      
      timelineText += `${penaltyCount}. (${dateKey}): ${timeStart} - ${timeEnd} +₱${b.penaltyAmt}\n\n`;
      
      curr = next;
    }
  } else {
    isCurrentPenalty = false;
  }

  const grand = b.balance + totalPen;
  const inputPaid = parseNumber(document.getElementById("amountPaid").value);
  const paid = inputPaid > 0 ? inputPaid : grand;
  const bal = grand - paid;
  const isPartial = bal > 0;

  const out = document.getElementById("output");
  
  out.innerHTML = `
    <h3 style="color:${isPartial ? "#d35400" : isCurrentPenalty ? "#c0392b" : "#27ae60"};">
      ${isPartial ? "PARTIAL PAYMENT" : isCurrentPenalty ? "LATE PAYMENT" : "PAID ON TIME"}
    </h3>
    <p>Prev Balance: ₱${formatNumber(b.balance)}</p>
    <p>Penalty: ₱${formatNumber(totalPen)}</p>
    <hr>
    <p><b>Total Due: ₱${formatNumber(grand)}</b></p>
    <p style="color:#27ae60;font-size:1.1em;">
      <b>Paying: ₱${formatNumber(paid)}</b>
    </p>
    ${isPartial ? `<p style="color:#d35400;">Remaining: ₱${formatNumber(bal)}</p>` : ""}
  `;
  out.style.display = "block";
  document.getElementById("finalDownloadBtn").style.display = "block";
  
  return { b, grand, paid, totalPen, isCurrentPenalty, penaltyCount, timelineText, bal };
}

// --- SETTINGS ---
function loadSettings() {
  const sA = localStorage.getItem("gA");
  const sH = localStorage.getItem("gH");
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

  alert("Settings Saved!");
  document.getElementById("settingsModal").style.display = "none";
}
window.onclick = function (e) {
  if (e.target == document.getElementById("settingsModal")) document.getElementById("settingsModal").style.display = "none";
};

// ==========================================
// RECEIPT GENERATION (PNG) - FIXED
// ==========================================
async function downloadSmartReceipt() {
  const data = calculate(); // Recalculate to ensure data integrity
  if (!data) return; 

  alert("Generating Receipt Image...");

  // 1. Populate Hidden Receipt Template
  document.getElementById("rDate").innerText = new Date().toLocaleString();
  document.getElementById("rName").innerText = data.b.name;
  document.getElementById("rDueDate").innerText = data.b.dueDate;
  document.getElementById("rPrev").innerText = "₱" + formatNumber(data.b.balance);
  document.getElementById("rPen").innerText = "₱" + formatNumber(data.totalPen);
  document.getElementById("rTotal").innerText = "₱" + formatNumber(data.grand);
  document.getElementById("rPaid").innerText = "₱" + formatNumber(data.paid);
  
  const remEl = document.getElementById("rRemContainer");
  if (data.grand - data.paid > 0) {
      document.getElementById("rRem").innerText = "₱" + formatNumber(data.grand - data.paid);
      remEl.style.display = "block";
  } else {
      remEl.style.display = "none";
  }

  // 2. Capture and Download
  const element = document.getElementById("receipt-capture-area");
  
  await html2canvas(element, { scale: 2 }).then(canvas => {
      const link = document.createElement("a");
      link.download = `Receipt_${data.b.name}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      // 3. Update Logic AFTER download
      const rem = data.grand - data.paid;
      if (rem <= 0) {
        alert("Paid in full! Borrower removed.");
        borrowers.splice(activeIndex, 1);
        saveBorrowersToStorage();
        showCreateScreen();
      } else {
        alert(`Partial payment saved. New Balance: ₱${formatNumber(rem)}`);
        data.b.balance = rem;
        saveBorrowersToStorage();
        selectBorrower(activeIndex);
      }
      
  }).catch(err => {
      alert("Receipt Error: " + err.message);
  });
}

// --- COPY TO MESSENGER ---
function copyToClipboard() {
  const data = calculate(); // Get fresh calculation
  if (!data) return;

  const { b, totalPen, grand, isCurrentPenalty, penaltyCount, timelineText } = data;
  const interestVal = b.principal * (b.interestRate / 100);

  let statusHeader = "";
  if (isCurrentPenalty) statusHeader = "⚠️ *STATUS: LATE PAYMENT*";
  else if (data.bal > 0) statusHeader = "🟠 *STATUS: PARTIAL / OPEN*";
  else statusHeader = "✅ *STATUS: PAID ON TIME*";

  let text = `📌 *LENDING UPDATE*
👤 *Borrower:* ${b.name}
📅 *Date:* ${new Date().toLocaleDateString()}
--------------------------
${statusHeader}
Principal: ₱${formatNumber(b.principal)}

Interest Added: ₱${formatNumber(interestVal)}

Penalty Blocks: ${penaltyCount}

Penalty Total: ₱${formatNumber(totalPen)}

Grand Total: ₱${formatNumber(grand)}

`;

  if (isCurrentPenalty && timelineText) {
    text += `📑 *FULL BREAKDOWN:*\nDetailed Timeline (Full Breakdown)\n\n${timelineText}`;
  }

  text += `--------------------------
Thank you! 🙏`;

  navigator.clipboard.writeText(text).then(() => alert("Copied details to clipboard!"));
}

// --- HELPERS ---
function formatInput(i) {
  let v = i.value.replace(/[^0-9.]/g, "");
  const p = v.split(".");
  if (p.length > 2) v = p[0] + "." + p.slice(1).join("");
  if (v)
    i.value =
      parseFloat(v).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      }) + (v.endsWith(".") ? "." : "");
  else i.value = "";
}

function parseNumber(v) {
  if (!v) return 0;
  return parseFloat(v.toString().replace(/,/g, "")) || 0;
}

function formatNumber(n) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// --- MOBILE SIDEBAR TOGGLE ---
const menuBtn = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("sidebarOverlay");
if (menuBtn) {
  menuBtn.onclick = () => { sidebar.classList.add("show"); overlay.classList.add("show"); };
  overlay.onclick = () => { sidebar.classList.remove("show"); overlay.classList.remove("show"); };
}

// Auto-close sidebar on mobile selection
const originalSelectBorrower = selectBorrower;
selectBorrower = function(index) {
  originalSelectBorrower(index);
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("show");
    overlay.classList.remove("show");
  }
};