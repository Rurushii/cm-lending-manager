// --- GLOBAL STATE ---
let borrowers = [],
  activeIndex = -1,
  globalPenaltyAmt = 50,
  globalPenaltyHrs = 5,
  lenderSig1 = "", 
  lenderSig2 = "";

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
  
  document.getElementById("newBorrowerName").value = "";
  document.getElementById("newAddress").value = "";
  document.getElementById("newContactNumber").value = "";
  document.getElementById("newPrincipal").value = "";
  document.getElementById("newDueDate").value = "";
  document.getElementById("newRelativeInfo").value = "";
  document.getElementById("newValidID").value = "";
  document.getElementById("newSignature").value = "";
  
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
  const address = document.getElementById("newAddress").value;
  const contact = document.getElementById("newContactNumber").value;
  const relative = document.getElementById("newRelativeInfo").value;
  const princ = parseNumber(document.getElementById("newPrincipal").value);
  const rate = parseFloat(document.getElementById("newInterest").value);
  const loanDate = document.getElementById("newLoanDate").value;
  const dueDate = document.getElementById("newDueDate").value;
  
  const idFile = document.getElementById("newValidID").files[0];
  const sigFile = document.getElementById("newSignature").files[0];

  if (!name || !princ || !dueDate) return alert("Please fill in Name, Principal, and Due Date.");

  const idBase64 = await getBase64(idFile);
  const sigBase64 = await getBase64(sigFile);

  const total = princ + princ * (rate / 100);

  borrowers.push({
    name, address, contact, relative,
    principal: princ, interestRate: rate,
    totalWithInterest: total, balance: total,
    loanDate, dueDate,
    penaltyAmt: globalPenaltyAmt, penaltyHrs: globalPenaltyHrs,
    validID: idBase64, signature: sigBase64
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
  document.getElementById("paymentTime").value = "";
  document.getElementById("amountPaid").value = "";
  document.getElementById("output").style.display = "none";
  document.getElementById("breakdown").style.display = "none";
  document.getElementById("output").innerHTML = "";
}

function deleteActiveBorrower() {
  if (confirm("Delete this borrower?")) {
    borrowers.splice(activeIndex, 1);
    saveBorrowersToStorage();
    showCreateScreen();
  }
}

// --- NEW PREVIEW LOGIC ---
async function previewContract() {
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

  // Fill Template
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

  // Signatures
  const sigImgEl = document.getElementById("cSigImage");
  if(sigSrc) { sigImgEl.src = sigSrc; sigImgEl.style.display = "block"; } 
  else { sigImgEl.style.display = "none"; }

  const l1Img = document.getElementById("cLender1Sig");
  if(lenderSig1) { l1Img.src = lenderSig1; l1Img.style.display = "block"; } 
  else { l1Img.style.display = "none"; }

  const l2Img = document.getElementById("cLender2Sig");
  if(lenderSig2) { l2Img.src = lenderSig2; l2Img.style.display = "block"; } 
  else { l2Img.style.display = "none"; }

  // Copy Source to Display Area
  const source = document.getElementById("contract-template-source").innerHTML;
  document.getElementById("contract-display-area").innerHTML = source;

  document.getElementById("contractModal").style.display = "flex";
}

function closeContractModal() {
  document.getElementById("contractModal").style.display = "none";
}

// 2. Download Image (THE FIX)
async function downloadContractImage() {
  alert("Rendering Contract... Please wait a moment.");
  
  const content = document.getElementById("contract-display-area");
  
  // Create a temporary container that is FULLY visible (but behind content)
  // This forces the browser to render the full height
  const cloneContainer = document.createElement("div");
  cloneContainer.style.position = "absolute";
  cloneContainer.style.top = "0";
  cloneContainer.style.left = "0";
  cloneContainer.style.width = "800px"; // Fixed width for A4 consistency
  cloneContainer.style.background = "white";
  cloneContainer.style.zIndex = "-9999"; 
  cloneContainer.style.padding = "40px"; // Add padding to clone
  
  // Force body overflow to visible so html2canvas can see everything
  const originalOverflow = document.body.style.overflow;
  document.body.style.overflow = "visible";

  // Clone content
  cloneContainer.innerHTML = content.innerHTML;
  document.body.appendChild(cloneContainer);

  // --- WAIT FOR IMAGES TO LOAD ---
  const images = cloneContainer.querySelectorAll("img");
  const promises = Array.from(images).map(img => {
    // Only wait if there is a real source
    if (img.src && img.src !== window.location.href && img.complete === false) {
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    }
    return Promise.resolve();
  });
  await Promise.all(promises);
  
  // Extra safety delay for rendering
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // Scroll to top to ensure clean capture
    window.scrollTo(0,0);
    
    const canvas = await html2canvas(cloneContainer, {
      scale: 2, 
      useCORS: true,
      height: cloneContainer.scrollHeight, // Force full height
      windowHeight: cloneContainer.scrollHeight, // Force window height
      scrollY: 0
    });

    const link = document.createElement("a");
    const name = document.getElementById("newBorrowerName").value || "Contract";
    link.download = `Contract_${name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    
  } catch(e) {
    alert("Error downloading: " + e.message);
  } finally {
    // Cleanup
    document.body.removeChild(cloneContainer);
    document.body.style.overflow = originalOverflow; // Restore scroll bar state
  }
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
  return true;
}

// --- SETTINGS & HELPERS ---
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

  const file1 = document.getElementById("setLenderSig1").files[0];
  const file2 = document.getElementById("setLenderSig2").files[0];

  if (file1) {
    lenderSig1 = await getBase64(file1);
    localStorage.setItem("lenderSig1", lenderSig1);
  }
  if (file2) {
    lenderSig2 = await getBase64(file2);
    localStorage.setItem("lenderSig2", lenderSig2);
  }

  alert("Settings & Signatures Saved!");
  document.getElementById("settingsModal").style.display = "none";
}

window.onclick = function (e) {
  if (e.target == document.getElementById("settingsModal")) document.getElementById("settingsModal").style.display = "none";
};

async function downloadSmartReceipt() {
  const calcSuccess = calculate();
  if (!calcSuccess) return;

  const b = borrowers[activeIndex];
  const summary = document.getElementById("output").innerText;
  
  const rContainer = document.createElement("div");
  rContainer.style.position = "absolute";
  rContainer.style.top = "0";
  rContainer.style.left = "0";
  rContainer.style.width = "400px";
  rContainer.style.background = "white";
  rContainer.style.padding = "30px";
  rContainer.style.color = "black";
  rContainer.style.zIndex = "-9999";
  
  // Fix overflow during receipt capture too
  const originalOverflow = document.body.style.overflow;
  document.body.style.overflow = "visible";

  rContainer.innerHTML = `
    <h2 style="text-align:center;">OFFICIAL RECEIPT</h2>
    <p style="text-align:center;font-size:12px;">CM's LENDING</p><hr>
    <p><b>Date:</b> ${new Date().toLocaleString()}</p>
    <p><b>Borrower:</b> ${b.name}</p>
    <p><b>Due Date:</b> ${b.dueDate}</p><hr>
    <pre style="white-space:pre-wrap;font-family:inherit;">${summary}</pre><hr>
    ${isCurrentPenalty ? `<p><b>PENALTY SUMMARY:</b></p><pre style="font-size:12px;white-space:pre-wrap;font-family:inherit;">${receiptSummaryHTML}</pre><hr>` : ''}
    <p style="text-align:center;font-weight:bold;">THANK YOU!</p>`;
    
  document.body.appendChild(rContainer);
  await new Promise(resolve => setTimeout(resolve, 300));

  const canvas = await html2canvas(rContainer);
  const link = document.createElement("a");
  link.download = `Receipt_${b.name}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  
  document.body.removeChild(rContainer);
  document.body.style.overflow = originalOverflow; // Restore

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
    selectBorrower(activeIndex);
  }
}

function copyToClipboard() {
  const b = borrowers[activeIndex];
  const text = `📌 *CM's LENDING*\n👤 ${b.name}\n📅 ${new Date().toLocaleDateString()}\n\n${document.getElementById("output").innerText}\n\nThank you!`;
  navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
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

// Mobile Sidebar
const menuBtn = document.getElementById("menuToggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("sidebarOverlay");
if (menuBtn && sidebar && overlay) {
  menuBtn.onclick = () => { sidebar.classList.add("show"); overlay.classList.add("show"); };
  overlay.onclick = () => { sidebar.classList.remove("show"); overlay.classList.remove("show"); };
}
const originalSelectBorrower = selectBorrower;
selectBorrower = function (index) {
  originalSelectBorrower(index);
  if (window.innerWidth <= 768) { sidebar.classList.remove("show"); overlay.classList.remove("show"); }
};