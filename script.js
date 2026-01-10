// --- GLOBAL STATE ---
let borrowers = [],
  activeIndex = -1,
  globalPenaltyAmt = 50,
  globalPenaltyHrs = 5,
  lenderSig = ""; // Changed to Single Signature

// --- INITIALIZATION ---
window.onload = function () {
  loadSettings();
  loadBorrowers();
  renderTabs();
  showCreateScreen();
  
  const today = new Date().toISOString().split("T")[0];
  if(document.getElementById("newLoanDate")) {
    document.getElementById("newLoanDate").value = today;
    document.getElementById("paymentDate").value = today;
  }
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

  // IMPORTANT: We do NOT save the ID image anymore. Too heavy.
  const sigFile = document.getElementById("newSignature").files[0];
  
  // Only compress and save the signature
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
  document.getElementById("displayContact").innerText = b.contact ? `📞 ${b.contact}` : "📞 No contact";
  document.getElementById("manageAmount").value = formatNumber(b.balance);
  document.getElementById("manageDueDate").value = b.dueDate;
  
  const imgSig = document.getElementById("viewSignature");
  const txtSig = document.getElementById("noSig");
  if (b.signature) { imgSig.src = b.signature; imgSig.style.display = "block"; txtSig.style.display = "none"; } 
  else { imgSig.style.display = "none"; txtSig.style.display = "block"; }

  resetManageInputs();
}

function resetManageInputs() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("paymentDate").value = today;
  document.getElementById("amountPaid").value = "";
  document.getElementById("output").style.display = "none";
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
// DIRECT PDF DOWNLOAD (CONTRACT)
// ==========================================

async function downloadContractDirectly() {
  if (typeof html2pdf === 'undefined') return alert("Library not ready. Please wait a moment.");

  alert("Preparing Contract PDF...");

  // 1. Gather Data
  const data = {
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    lender: document.getElementById("lenderName").value || "_________________",
    name: document.getElementById("newBorrowerName").value || "_________________",
    address: document.getElementById("newAddress").value || "_________________",
    contact: document.getElementById("newContactNumber").value || "_________________",
    relative: document.getElementById("newRelativeInfo").value || "_________________",
    princ: parseNumber(document.getElementById("newPrincipal").value),
    rate: parseFloat(document.getElementById("newInterest").value),
    dueDate: document.getElementById("newDueDate").value || "_________________",
    penAmt: globalPenaltyAmt,
    penHrs: globalPenaltyHrs
  };

  const interestAmt = data.princ * (data.rate/100);
  const total = data.princ + interestAmt;

  // 2. Clone Template
  const source = document.getElementById('contract-template-source');
  const clone = document.createElement('div');
  clone.innerHTML = source.innerHTML;
  
  // 3. Fill Clone
  clone.querySelector("#cDate").innerText = data.date;
  clone.querySelector("#cLender").innerText = data.lender;
  clone.querySelector("#cBorrower").innerText = data.name;
  clone.querySelector("#cAddress").innerText = data.address;
  clone.querySelector("#cContact").innerText = data.contact;
  clone.querySelector("#cPrincipal").innerText = formatNumber(data.princ);
  clone.querySelector("#cRate").innerText = data.rate;
  clone.querySelector("#cInterest").innerText = formatNumber(interestAmt);
  clone.querySelector("#cTotal").innerText = formatNumber(total);
  clone.querySelector("#cDueDate").innerText = data.dueDate;
  clone.querySelector("#cPenaltyAmt").innerText = data.penAmt;
  clone.querySelector("#cPenaltyHrs").innerText = data.penHrs;
  clone.querySelector("#cRelative").innerText = data.relative;

  // 4. Handle Images (COMPRESS THEM FIRST)
  const sigFile = document.getElementById("newSignature").files[0];
  let borrowerSig = "";
  if(sigFile) borrowerSig = await compressImage(sigFile);

  const sigImgEl = clone.querySelector("#cSigImage");
  if(borrowerSig) { sigImgEl.src = borrowerSig; sigImgEl.style.display = "block"; } 
  else { sigImgEl.style.display = "none"; }

  // Lender Single Sig
  const lenImgEl = clone.querySelector("#cLenderSig");
  const lenLine = clone.querySelector("#cLenderLine");
  
  if(lenderSig) { 
      lenImgEl.src = lenderSig; 
      lenImgEl.style.display = "block";
      lenLine.style.display = "none"; // Hide line if sig exists
  } else { 
      lenImgEl.style.display = "none";
      lenLine.style.display = "block"; // Show line for manual signing
  }

  // 5. Generate PDF
  const opt = {
    margin: 0.5,
    filename: `Contract_${data.name}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 1.5, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(clone).save().then(() => {
    // Success
  }).catch(err => {
    alert("PDF Error: " + err.message);
  });
}

// --- CALCULATION LOGIC ---
function calculate() {
  const b = borrowers[activeIndex];
  const payDate = document.getElementById("paymentDate").value;
  const payTime = document.getElementById("paymentTime").value;

  if (!payDate || !payTime) {
    alert("Enter payment date/time");
    return false;
  }

  const start = new Date(b.dueDate + "T00:00:00");
  start.setDate(start.getDate() + 1);
  const end = new Date(payDate + "T" + payTime + ":00");

  let totalPen = 0;
  let isCurrentPenalty = false;

  if (end > start) {
    isCurrentPenalty = true;
    let curr = new Date(start);
    while (new Date(curr.getTime() + b.penaltyHrs * 3600000) <= end) {
      totalPen += b.penaltyAmt;
      curr = new Date(curr.getTime() + b.penaltyHrs * 3600000);
    }
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
    <p style="color:#27ae60;font-size:1.1em;"><b>Paying: ₱${formatNumber(paid)}</b></p>
    ${isPartial ? `<p style="color:#d35400;">Remaining: ₱${formatNumber(bal)}</p>` : ""}
  `;
  out.style.display = "block";
  
  return { b, grand, paid, totalPen, isCurrentPenalty };
}

// --- SETTINGS ---
function loadSettings() {
  const sA = localStorage.getItem("gA");
  const sH = localStorage.getItem("gH");
  const sL = localStorage.getItem("lenderSig"); // Single Sig

  if (sA) globalPenaltyAmt = parseFloat(sA);
  if (sH) globalPenaltyHrs = parseFloat(sH);
  if (sL) lenderSig = sL;

  document.getElementById("setPenaltyAmount").value = globalPenaltyAmt;
  document.getElementById("setPenaltyHours").value = globalPenaltyHrs;
}

function openSettings() { document.getElementById("settingsModal").style.display = "flex"; }

async function saveSettings() {
  globalPenaltyAmt = parseFloat(document.getElementById("setPenaltyAmount").value);
  globalPenaltyHrs = parseFloat(document.getElementById("setPenaltyHours").value);
  localStorage.setItem("gA", globalPenaltyAmt);
  localStorage.setItem("gH", globalPenaltyHrs);

  const f = document.getElementById("setLenderSig").files[0];

  // COMPRESS BEFORE SAVING
  if (f) { lenderSig = await compressImage(f); localStorage.setItem("lenderSig", lenderSig); }

  alert("Settings & Signatures Saved!");
  document.getElementById("settingsModal").style.display = "none";
}

window.onclick = function (e) {
  if (e.target == document.getElementById("settingsModal")) document.getElementById("settingsModal").style.display = "none";
};

// --- DOWNLOAD RECEIPT AS PDF ---
async function downloadSmartReceipt() {
  const data = calculate();
  if (!data) return; 

  const element = document.createElement("div");
  element.style.padding = "20px";
  element.style.width = "400px";
  element.style.fontFamily = "Arial, sans-serif";
  element.style.background = "white";
  element.style.color = "black";
  
  element.innerHTML = `
    <h2 style="text-align:center; margin:0;">OFFICIAL RECEIPT</h2>
    <p style="text-align:center; font-size:12px;">CM's LENDING</p><hr>
    <p><b>Date:</b> ${new Date().toLocaleString()}</p>
    <p><b>Borrower:</b> ${data.b.name}</p>
    <p><b>Due Date:</b> ${data.b.dueDate}</p><hr>
    <p>Prev Balance: ₱${formatNumber(data.b.balance)}</p>
    <p>Penalty: ₱${formatNumber(data.totalPen)}</p>
    <p><b>Total Due: ₱${formatNumber(data.grand)}</b></p>
    <p style="font-size:1.2em;"><b>PAID: ₱${formatNumber(data.paid)}</b></p>
    ${data.grand - data.paid > 0 ? `<p style="color:red;">Remaining: ₱${formatNumber(data.grand - data.paid)}</p>` : ''}
    <hr>
    <p style="text-align:center;font-weight:bold;">THANK YOU!</p>
  `;

  const opt = {
    margin: 0.2,
    filename: `Receipt_${data.b.name}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 1.5, useCORS: true },
    jsPDF: { unit: 'in', format: [4, 6], orientation: 'portrait' } 
  };

  alert("Generating Receipt PDF...");
  
  await html2pdf().set(opt).from(element).save().then(() => {
      // Logic Update only AFTER successful download
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
  }).catch((err) => {
      alert("Error generating Receipt: " + err.message);
  });
}

function copyToClipboard() {
  const b = borrowers[activeIndex];
  const text = `📌 *CM's LENDING*\n👤 ${b.name}\n📅 ${new Date().toLocaleDateString()}\n\n${document.getElementById("output").innerText}\n\nThank you!`;
  navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}

function formatInput(i) {
  let v = i.value.replace(/[^0-9.]/g, "");
  const p = v.split(".");
  if (p.length > 2) v = p[0] + "." + p.slice(1).join("");
  if (v) i.value = parseFloat(v).toLocaleString("en-US", { maximumFractionDigits: 2 }) + (v.endsWith(".") ? "." : "");
  else i.value = "";
}
function parseNumber(v) { if (!v) return 0; return parseFloat(v.toString().replace(/,/g, "")) || 0; }
function formatNumber(n) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const menuBtn = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("sidebarOverlay");
if (menuBtn) {
  menuBtn.onclick = () => { sidebar.classList.add("show"); overlay.classList.add("show"); };
  overlay.onclick = () => { sidebar.classList.remove("show"); overlay.classList.remove("show"); };
}