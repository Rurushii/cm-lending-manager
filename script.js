// --- GLOBAL STATE ---
let borrowers = [],
  activeIndex = -1,
  globalPenaltyAmt = 50,
  globalPenaltyHrs = 5,
  lenderSig1 = "", 
  lenderSig2 = "";

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
  document.getElementById("creditCount").innerText = `${borrowers.length} Borrowers (Unlimited)`;
  const addBtn = document.querySelector(".add-new-btn");
  if(addBtn) addBtn.disabled = false;
}

// --- SCREEN SWITCHING ---
function showCreateScreen() {
  activeIndex = -1;
  renderTabs();
  document.getElementById("createScreen").style.display = "block";
  document.getElementById("manageScreen").style.display = "none";
  resetManageInputs();
}

function getBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function saveNewBorrower() {
  const name = document.getElementById("newBorrowerName").value;
  if (!name) return alert("Please enter a name.");

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

  const idFile = document.getElementById("newValidID").files[0];
  const sigFile = document.getElementById("newSignature").files[0];
  b.validID = await getBase64(idFile);
  b.signature = await getBase64(sigFile);

  borrowers.push(b);
  saveBorrowersToStorage();
  
  document.getElementById("newBorrowerName").value = "";
  document.getElementById("newPrincipal").value = "";
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
  document.getElementById("ruleText").innerText = `Rule: ₱${b.penaltyAmt} per ${b.penaltyHrs} hours`;

  const imgID = document.getElementById("viewValidID");
  const txtID = document.getElementById("noID");
  if (b.validID) { imgID.src = b.validID; imgID.style.display = "block"; txtID.style.display = "none"; } 
  else { imgID.style.display = "none"; txtID.style.display = "block"; }

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
// PREVIEW & DOWNLOAD CONTRACT (STABLE PDF)
// ==========================================

async function previewContract() {
  // Fill Data
  const lender = document.getElementById("lenderName").value || "_________________";
  const name = document.getElementById("newBorrowerName").value || "_________________";
  const address = document.getElementById("newAddress").value || "_________________";
  const contact = document.getElementById("newContactNumber").value || "_________________";
  const relative = document.getElementById("newRelativeInfo").value || "_________________";
  
  const princ = parseNumber(document.getElementById("newPrincipal").value);
  const rate = parseFloat(document.getElementById("newInterest").value);
  const dueDate = document.getElementById("newDueDate").value || "_________________";
  const interestAmt = princ * (rate/100);
  const total = princ + interestAmt;
  
  const sigFile = document.getElementById("newSignature").files[0];
  let sigSrc = "";
  if(sigFile) sigSrc = await getBase64(sigFile);

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById("cDate").innerText = dateStr;
  document.getElementById("cLender").innerText = lender;
  document.getElementById("cBorrower").innerText = name;
  document.getElementById("cAddress").innerText = address;
  document.getElementById("cContact").innerText = contact;
  
  document.getElementById("cPrincipal").innerText = formatNumber(princ);
  document.getElementById("cRate").innerText = rate;
  document.getElementById("cInterest").innerText = formatNumber(interestAmt);
  document.getElementById("cTotal").innerText = formatNumber(total);
  document.getElementById("cDueDate").innerText = dueDate;
  document.getElementById("cPenaltyAmt").innerText = globalPenaltyAmt;
  document.getElementById("cPenaltyHrs").innerText = globalPenaltyHrs;
  document.getElementById("cRelative").innerText = relative;

  const sigImgEl = document.getElementById("cSigImage");
  if(sigSrc) { sigImgEl.src = sigSrc; sigImgEl.style.display = "block"; } else { sigImgEl.style.display = "none"; }

  const l1Img = document.getElementById("cLender1Sig");
  if(lenderSig1) { l1Img.src = lenderSig1; l1Img.style.display = "block"; } else { l1Img.style.display = "none"; }

  const l2Img = document.getElementById("cLender2Sig");
  if(lenderSig2) { l2Img.src = lenderSig2; l2Img.style.display = "block"; } else { l2Img.style.display = "none"; }

  // Inject content into preview
  const source = document.getElementById("contract-template-source").innerHTML;
  document.getElementById("contract-display-area").innerHTML = source;

  document.getElementById("contractModal").style.display = "flex";
}

function closeContractModal() {
  document.getElementById("contractModal").style.display = "none";
}

// *** STABLE PDF DOWNLOAD FUNCTION ***
async function downloadContractPDF() {
  if (typeof html2pdf === 'undefined') return alert("PDF Library not loaded. Please check internet connection.");

  alert("Generating PDF... Please wait.");

  // Create a CLEAN CLONE for PDF generation (Prevents styling issues)
  const source = document.getElementById('contract-template-source');
  const clone = document.createElement('div');
  clone.innerHTML = source.innerHTML;
  
  // Style the clone to be perfect for A4
  clone.style.width = '800px'; 
  clone.style.padding = '40px';
  clone.style.background = 'white';
  clone.style.color = 'black';
  
  // Update the clone's values with current data (since template is static)
  // We re-run the fill logic on the CLONE specifically
  const data = {
      date: document.getElementById("cDate").innerText,
      lender: document.getElementById("cLender").innerText,
      borrower: document.getElementById("cBorrower").innerText,
      address: document.getElementById("cAddress").innerText,
      contact: document.getElementById("cContact").innerText,
      princ: document.getElementById("cPrincipal").innerText,
      rate: document.getElementById("cRate").innerText,
      int: document.getElementById("cInterest").innerText,
      total: document.getElementById("cTotal").innerText,
      due: document.getElementById("cDueDate").innerText,
      penAmt: document.getElementById("cPenaltyAmt").innerText,
      penHrs: document.getElementById("cPenaltyHrs").innerText,
      rel: document.getElementById("cRelative").innerText
  };

  // Manually update clone text (Safe way)
  clone.querySelector("#cDate").innerText = data.date;
  clone.querySelector("#cLender").innerText = data.lender;
  clone.querySelector("#cBorrower").innerText = data.borrower;
  clone.querySelector("#cAddress").innerText = data.address;
  clone.querySelector("#cContact").innerText = data.contact;
  clone.querySelector("#cPrincipal").innerText = data.princ;
  clone.querySelector("#cRate").innerText = data.rate;
  clone.querySelector("#cInterest").innerText = data.int;
  clone.querySelector("#cTotal").innerText = data.total;
  clone.querySelector("#cDueDate").innerText = data.due;
  clone.querySelector("#cPenaltyAmt").innerText = data.penAmt;
  clone.querySelector("#cPenaltyHrs").innerText = data.penHrs;
  clone.querySelector("#cRelative").innerText = data.rel;

  // Handle Images in Clone
  const sigSrc = document.getElementById("cSigImage").src;
  if(document.getElementById("cSigImage").style.display !== 'none') {
      clone.querySelector("#cSigImage").src = sigSrc;
      clone.querySelector("#cSigImage").style.display = 'block';
  } else {
      clone.querySelector("#cSigImage").style.display = 'none';
  }

  if(lenderSig1) { clone.querySelector("#cLender1Sig").src = lenderSig1; clone.querySelector("#cLender1Sig").style.display = 'block'; }
  else { clone.querySelector("#cLender1Sig").style.display = 'none'; }

  if(lenderSig2) { clone.querySelector("#cLender2Sig").src = lenderSig2; clone.querySelector("#cLender2Sig").style.display = 'block'; }
  else { clone.querySelector("#cLender2Sig").style.display = 'none'; }

  // PDF Configuration
  const name = document.getElementById("newBorrowerName").value || "Contract";
  const opt = {
    margin: 0.5,
    filename: `Contract_${name}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    // SCALE 1.5 is safer for mobile phones than 2
    html2canvas: { scale: 1.5, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  // Generate from the clean clone
  html2pdf().set(opt).from(clone).save().then(() => {
      alert("PDF Downloaded Successfully!");
  }).catch((err) => {
      alert("Error generating PDF: " + err.message);
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
  const sL1 = localStorage.getItem("lenderSig1");
  const sL2 = localStorage.getItem("lenderSig2");

  if (sA) globalPenaltyAmt = parseFloat(sA);
  if (sH) globalPenaltyHrs = parseFloat(sH);
  if (sL1) lenderSig1 = sL1;
  if (sL2) lenderSig2 = sL2;

  document.getElementById("setPenaltyAmount").value = globalPenaltyAmt;
  document.getElementById("setPenaltyHours").value = globalPenaltyHrs;
}

function openSettings() { document.getElementById("settingsModal").style.display = "flex"; }

async function saveSettings() {
  globalPenaltyAmt = parseFloat(document.getElementById("setPenaltyAmount").value);
  globalPenaltyHrs = parseFloat(document.getElementById("setPenaltyHours").value);
  localStorage.setItem("gA", globalPenaltyAmt);
  localStorage.setItem("gH", globalPenaltyHrs);

  const f1 = document.getElementById("setLenderSig1").files[0];
  const f2 = document.getElementById("setLenderSig2").files[0];

  if (f1) { lenderSig1 = await getBase64(f1); localStorage.setItem("lenderSig1", lenderSig1); }
  if (f2) { lenderSig2 = await getBase64(f2); localStorage.setItem("lenderSig2", lenderSig2); }

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
    html2canvas: { scale: 1.5, useCORS: true }, // Reduced scale for stability
    jsPDF: { unit: 'in', format: [4, 6], orientation: 'portrait' } 
  };

  alert("Generating Receipt PDF...");
  
  // Convert using library
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