const MINIMUM_WAGE = 29500;
const LABOR_RATE = 0.125; // 勞保普通事故 11.5% + 就業保險 1%
const HEALTH_RATE = 0.0517;
const EMPLOYER_AVG_DEPENDENTS = 0.56;
const OFFICE_NAME = "群利稅務記帳士事務所";
const TOOL_NAME = "薪資小幫手";
const COPYRIGHT_TEXT = "© 2026 群利稅務記帳士事務所。未經授權請勿重製、改作或移除品牌標示。";

const laborBrackets = [
  29500, 30300, 31800, 33300, 34800, 36300,
  38200, 40100, 42000, 43900, 45800
];

const healthBrackets = [
  29500, 30300, 31800, 33300, 34800, 36300, 38200, 40100, 42000,
  43900, 45800, 48200, 50600, 53000, 55400, 57800, 60800, 63800,
  66800, 69800, 72800, 76500, 80200, 83900, 87600, 92100, 96600,
  101100, 105600, 110100, 115500, 120900, 126300, 131700, 137100,
  142500, 147900, 150000, 156400, 162800, 169200, 175600, 182000,
  189500, 197000, 204500, 212000, 219500, 228200, 236900, 245600,
  254300, 263000, 272000, 281000, 290000, 299000, 313000
];

const pensionBrackets = [
  29500, 30300, 31800, 33300, 34800, 36300, 38200, 40100, 42000,
  43900, 45800, 48200, 50600, 53000, 55400, 57800, 60800, 63800,
  66800, 69800, 72800, 76500, 80200, 83900, 87600, 92100, 96600,
  101100, 105600, 110100, 115500, 120900, 126300, 131700, 137100,
  142500, 147900, 150000
];

const $ = (id) => document.getElementById(id);
const money = (value) => `NT$${Math.max(0, Math.round(value)).toLocaleString("zh-TW")}`;

function bracketFor(salary, brackets) {
  const normalized = Math.max(MINIMUM_WAGE, salary || 0);
  return brackets.find((amount) => normalized <= amount) ?? brackets.at(-1);
}

function calculate() {
  const salary = Math.max(0, Number($("salary").value) || 0);
  const dependents = Number($("dependents").value);
  const laborCoverage = calculateLaborCoverageDays(
    $("hireDate").value,
    $("terminationDate").value,
    $("calculationDate").value
  );
  const leave = calculateAnnualLeave(
    $("hireDate").value,
    $("calculationDate").value,
    Math.max(0, Number($("usedLeaveDays").value) || 0)
  );
  const unusedLeaveDays = leave.remaining;
  const laborBase = bracketFor(salary, laborBrackets);
  const healthBase = bracketFor(salary, healthBrackets);
  const pensionBase = bracketFor(salary, pensionBrackets);

  const laborEmployee = Math.round(laborBase * LABOR_RATE * 0.2 * laborCoverage.ratio);
  const laborEmployer = Math.round(laborBase * LABOR_RATE * 0.7 * laborCoverage.ratio);
  const healthEmployee = Math.round(healthBase * HEALTH_RATE * 0.3 * (1 + dependents));
  const healthEmployer = Math.round(healthBase * HEALTH_RATE * 0.6 * (1 + EMPLOYER_AVG_DEPENDENTS));
  const pensionEmployer = Math.round(pensionBase * 0.06);
  const employeeTotal = laborEmployee + healthEmployee;
  const employerContribution = laborEmployer + healthEmployer + pensionEmployer;
  const takeHome = salary - employeeTotal;
  const employerTotal = salary + employerContribution;
  const dailyWage = salary / 30;
  const leaveCash = Math.round(dailyWage * unusedLeaveDays);

  updateInsuranceScale(salary, Math.max(laborBase, healthBase));
  $("takeHome").textContent = money(takeHome);
  $("employerTotal").textContent = money(employerTotal);
  $("laborEmployee").textContent = money(laborEmployee);
  $("laborEmployer").textContent = money(laborEmployer);
  $("healthEmployee").textContent = money(healthEmployee);
  $("healthEmployer").textContent = money(healthEmployer);
  $("pensionEmployer").textContent = money(pensionEmployer);
  $("employeeContributionTotal").textContent = money(employeeTotal);
  $("employerContributionTotal").textContent = money(employerContribution);
  $("laborDaysLabel").textContent = laborCoverage.label;
  $("dependentLabel").textContent = dependents === 0 ? "本人" : `本人＋${dependents} 位眷屬`;
  $("dailyWage").textContent = money(dailyWage);
  $("leaveDaysLabel").textContent = unusedLeaveDays.toLocaleString("zh-TW");
  $("leaveCash").textContent = money(leaveCash);
  $("serviceLength").textContent = leave.serviceText;
  $("entitledLeaveDays").textContent = formatDays(leave.entitled);
  $("usedLeaveResult").textContent = formatDays(leave.used);
  $("remainingLeaveDays").textContent = formatDays(leave.remaining);
  syncPayslipFromCalculator();
  updatePayslip();
}

function updateInsuranceScale(salary, insuredBase) {
  const labels = insuranceScaleLabels(insuredBase);
  const markerLeft = insuranceMarkerLeft(salary, labels);

  $("salaryMarker").style.setProperty("--marker-left", `${markerLeft}%`);
  $("insuranceLabels").replaceChildren(
    ...labels.map((amount) => {
      const label = document.createElement("small");
      label.textContent = amount.toLocaleString("zh-TW");
      return label;
    })
  );
}

function insuranceScaleLabels(insuredBase) {
  const index = Math.max(0, healthBrackets.indexOf(insuredBase));
  const count = 5;
  const half = Math.floor(count / 2);
  let start = Math.max(0, index - half);
  start = Math.min(start, Math.max(0, healthBrackets.length - count));
  return healthBrackets.slice(start, start + count);
}

function insuranceMarkerLeft(salary, labels) {
  const min = labels[0];
  const max = labels.at(-1);
  const normalizedSalary = Math.max(min, Math.min(max, salary || 0));
  return max === min ? 50 : ((normalizedSalary - min) / (max - min)) * 100;
}

function calculateLaborCoverageDays(hireValue, terminationValue, calculationValue) {
  const calculation = parseLocalDate(calculationValue) || new Date();
  const monthStart = new Date(calculation.getFullYear(), calculation.getMonth(), 1);
  const monthEnd = new Date(calculation.getFullYear(), calculation.getMonth() + 1, 0);
  const hire = parseLocalDate(hireValue);
  const termination = parseLocalDate(terminationValue);

  if (hire && termination && termination < hire) {
    return {
      days: 0,
      ratio: 0,
      label: "普通事故＋就業保險｜離職日早於到職日"
    };
  }

  if ((hire && hire > monthEnd) || (termination && termination < monthStart)) {
    return {
      days: 0,
      ratio: 0,
      label: "普通事故＋就業保險｜本月未投保"
    };
  }

  const coveredStart = hire && hire > monthStart ? hire : monthStart;
  const coveredEnd = termination && termination < monthEnd ? termination : monthEnd;

  if (coveredEnd < coveredStart) {
    return {
      days: 0,
      ratio: 0,
      label: "普通事故＋就業保險｜本月未投保"
    };
  }

  const days = normalizedInsuranceDays(coveredStart, coveredEnd, monthEnd);
  const label = days === 30
    ? "普通事故＋就業保險｜全月投保 30 天"
    : `普通事故＋就業保險｜投保 ${days} 天`;

  return {
    days,
    ratio: days / 30,
    label
  };
}

function normalizedInsuranceDays(start, end, monthEnd) {
  const startDay = Math.min(start.getDate(), 30);
  const endDay = isSameDate(end, monthEnd) ? 30 : Math.min(end.getDate(), 30);
  return Math.max(0, Math.min(30, endDay - startDay + 1));
}

function isSameDate(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function calculateAnnualLeave(hireValue, calculationValue, usedDays) {
  if (!hireValue || !calculationValue) {
    return { entitled: 0, used: usedDays, remaining: 0, serviceText: "請填到職日" };
  }

  const hire = parseLocalDate(hireValue);
  const calculation = parseLocalDate(calculationValue);
  if (!hire || !calculation || calculation < hire) {
    return { entitled: 0, used: usedDays, remaining: 0, serviceText: "日期有誤" };
  }

  let years = calculation.getFullYear() - hire.getFullYear();
  let anniversary = addYears(hire, years);
  if (calculation < anniversary) {
    years -= 1;
    anniversary = addYears(hire, years);
  }

  const months = completeMonthsBetween(anniversary, calculation);
  const entitled = annualLeaveDays(years, months);
  return {
    entitled,
    used: usedDays,
    remaining: Math.max(0, entitled - usedDays),
    serviceText: `${years} 年 ${months} 個月`
  };
}

function annualLeaveDays(years, months) {
  if (years === 0) return months >= 6 ? 3 : 0;
  if (years === 1) return 7;
  if (years === 2) return 10;
  if (years >= 3 && years < 5) return 14;
  if (years >= 5 && years < 10) return 15;
  if (years >= 10) return Math.min(30, 16 + (years - 10));
  return 0;
}

function parseLocalDate(value) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function addYears(date, years) {
  const result = new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
  if (result.getMonth() !== date.getMonth()) result.setDate(0);
  return result;
}

function completeMonthsBetween(start, end) {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

function formatDays(value) {
  return Number(value).toLocaleString("zh-TW", { maximumFractionDigits: 1 });
}

function reset() {
  $("salary").value = 40000;
  $("dependents").value = "0";
  $("hireDate").value = "";
  $("terminationDate").value = "";
  $("calculationDate").value = todayValue();
  $("usedLeaveDays").value = "0";
  calculate();
  $("salary").focus();
}

async function downloadResult() {
  const button = $("downloadButton");
  button.disabled = true;

  try {
    if (document.fonts?.ready) await document.fonts.ready;

    const canvas = document.createElement("canvas");
    const scale = 2;
    const width = 1200;
    const height = 1260;
    canvas.width = width * scale;
    canvas.height = height * scale;

    const context = canvas.getContext("2d");
    context.scale(scale, scale);
    context.textBaseline = "alphabetic";

    const salaryAmount = Number($("salary").value) || 0;
    const salaryText = money(salaryAmount);
    const insuredBase = Math.max(
      bracketFor(salaryAmount, laborBrackets),
      bracketFor(salaryAmount, healthBrackets)
    );
    const insuranceLabels = insuranceScaleLabels(insuredBase);
    const insuranceMarker = insuranceMarkerLeft(salaryAmount, insuranceLabels);
    const rows = [
      ["勞工保險", $("laborEmployee").textContent, $("laborEmployer").textContent],
      ["全民健康保險", $("healthEmployee").textContent, $("healthEmployer").textContent],
      ["勞工退休金", "—", $("pensionEmployer").textContent]
    ];

    context.fillStyle = "#f3f0e8";
    context.fillRect(0, 0, width, height);
    drawDots(context, width, height);

    roundRect(context, 48, 48, 1104, 1164, 30, "#fffefa");

    context.fillStyle = "#0f765e";
    context.font = '800 18px "Noto Sans TC", sans-serif';
    context.fillText(OFFICE_NAME, 96, 112);

    context.fillStyle = "#17242b";
    context.font = '800 42px "Noto Sans TC", sans-serif';
    context.fillText("薪資勞健保試算", 96, 166);
    context.fillStyle = "#68767d";
    context.font = '700 16px "Noto Sans TC", sans-serif';
    context.fillText(TOOL_NAME, 96, 196);

    drawInsuranceScale(context, 764, 104, 340, insuranceLabels, insuranceMarker);

    drawSummaryCard(context, 96, 210, 492, 224, "#0f765e",
      "員工實領", $("takeHome").textContent, "月薪－勞保自付－健保自付");
    drawSummaryCard(context, 612, 210, 492, 224, "#17242b",
      "雇主每月總成本", $("employerTotal").textContent, "月薪＋雇主負擔勞健保＋勞退");

    roundRect(context, 96, 462, 1008, 100, 18, "#fff7e8");
    context.fillStyle = "#9b5e08";
    context.font = '800 20px "Noto Sans TC", sans-serif';
    context.fillText("未休特休折算現金", 124, 502);
    context.font = '500 14px "Noto Sans TC", sans-serif';
    context.fillText(
      `應有 ${$("entitledLeaveDays").textContent} 天｜已休 ${$("usedLeaveResult").textContent} 天｜剩餘 ${$("leaveDaysLabel").textContent} 天`,
      124,
      532
    );
    context.textAlign = "right";
    context.font = '800 34px "Noto Sans TC", sans-serif';
    context.fillText($("leaveCash").textContent, 1076, 520);
    context.textAlign = "left";

    context.fillStyle = "#68767d";
    context.font = '600 15px "Noto Sans TC", sans-serif';
    context.fillText(`輸入月薪 ${salaryText}｜${$("dependentLabel").textContent}`, 96, 608);

    context.strokeStyle = "#dfe7e5";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(96, 642);
    context.lineTo(1104, 642);
    context.stroke();

    context.fillStyle = "#68767d";
    context.font = '700 14px "Noto Sans TC", sans-serif';
    context.fillText("費用項目", 96, 680);
    context.textAlign = "right";
    context.fillText("員工負擔", 830, 680);
    context.fillText("雇主負擔", 1104, 680);

    rows.forEach((row, index) => {
      const y = 732 + index * 112;
      context.textAlign = "left";
      context.fillStyle = "#17242b";
      context.font = '700 22px "Noto Sans TC", sans-serif';
      context.fillText(row[0], 96, y);

      context.textAlign = "right";
      context.font = '800 23px "Noto Sans TC", sans-serif';
      context.fillText(row[1], 830, y);
      context.fillText(row[2], 1104, y);

      context.strokeStyle = "#dfe7e5";
      context.beginPath();
      context.moveTo(96, y + 42);
      context.lineTo(1104, y + 42);
      context.stroke();
    });

    roundRect(context, 96, 1034, 492, 56, 12, "rgba(15,118,94,.08)");
    roundRect(context, 612, 1034, 492, 56, 12, "rgba(23,36,43,.06)");
    context.textAlign = "left";
    context.fillStyle = "#17242b";
    context.font = '800 18px "Noto Sans TC", sans-serif';
    context.fillText("員工自付合計", 118, 1070);
    context.fillText("雇主負擔合計", 634, 1070);
    context.textAlign = "right";
    context.fillStyle = "#0f765e";
    context.font = '800 26px "Noto Sans TC", sans-serif';
    context.fillText($("employeeContributionTotal").textContent, 566, 1070);
    context.fillStyle = "#17242b";
    context.fillText($("employerContributionTotal").textContent, 1082, 1070);

    roundRect(context, 96, 1106, 1008, 68, 12, "#f3f6f4");
    context.textAlign = "left";
    context.fillStyle = "#68767d";
    context.font = '500 13px "Noto Sans TC", sans-serif';
    context.fillText("特休折現以固定月薪 ÷ 30 × 未休日數估算；其他金額仍以主管機關核定為準。", 118, 1136);
    context.fillText(COPYRIGHT_TEXT, 118, 1158);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) throw new Error("無法建立圖片");

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `薪資勞健保試算-${new Date().toISOString().slice(0, 10)}.jpg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("試算圖已下載");
  } catch (error) {
    console.error(error);
    showToast("下載失敗，請再試一次");
  } finally {
    button.disabled = false;
  }
}

function roundRect(context, x, y, width, height, radius, fill) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
}

function drawSummaryCard(context, x, y, width, height, color, label, amount, note) {
  roundRect(context, x, y, width, height, 22, color);
  context.fillStyle = "rgba(255,255,255,.85)";
  context.font = '700 18px "Noto Sans TC", sans-serif';
  context.fillText(label, x + 30, y + 48);
  context.fillStyle = "#ffffff";
  context.font = '800 49px "Noto Sans TC", sans-serif';
  context.fillText(amount, x + 30, y + 120);
  context.fillStyle = "rgba(255,255,255,.7)";
  context.font = '500 14px "Noto Sans TC", sans-serif';
  context.fillText(note, x + 30, y + 164);
}

function drawInsuranceScale(context, x, y, width, labels, markerLeft) {
  context.textAlign = "right";
  context.fillStyle = "#68767d";
  context.font = '600 16px "Noto Sans TC", sans-serif';
  context.fillText("投保級距", x + width, y);

  const trackY = y + 30;
  const trackHeight = 10;
  const gradient = context.createLinearGradient(x, trackY, x + width, trackY);
  gradient.addColorStop(0, "rgba(15,118,94,.16)");
  gradient.addColorStop(1, "rgba(15,118,94,.92)");
  roundRect(context, x, trackY, width, trackHeight, 999, gradient);

  context.fillStyle = "#ffffff";
  context.strokeStyle = "rgba(15,118,94,.28)";
  context.lineWidth = 2;
  [x, x + width].forEach((dotX) => {
    context.beginPath();
    context.arc(dotX, trackY + trackHeight / 2, 4, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });

  const markerX = x + width * markerLeft / 100;
  context.beginPath();
  context.moveTo(markerX, trackY - 4);
  context.lineTo(markerX - 8, trackY - 16);
  context.lineTo(markerX + 8, trackY - 16);
  context.closePath();
  context.fillStyle = "#17242b";
  context.fill();

  context.fillStyle = "#68767d";
  context.font = '700 12px "Noto Sans TC", sans-serif';
  labels.forEach((amount, index) => {
    const labelX = x + (width * index) / (labels.length - 1);
    context.textAlign = index === 0 ? "left" : index === labels.length - 1 ? "right" : "center";
    context.fillText(amount.toLocaleString("zh-TW"), labelX, trackY + 34);
  });
  context.textAlign = "left";
}

function drawDots(context, width, height) {
  context.fillStyle = "rgba(15,118,94,.08)";
  for (let x = 12; x < width; x += 24) {
    for (let y = 12; y < height; y += 24) {
      context.beginPath();
      context.arc(x, y, 1, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function createPayslipItem(container, name = "", amount = 0, systemKey = "") {
  const row = document.createElement("div");
  row.className = `custom-item${systemKey ? " system" : ""}`;
  if (systemKey) row.dataset.system = systemKey;

  const nameInput = document.createElement("input");
  nameInput.className = "item-name";
  nameInput.type = "text";
  nameInput.placeholder = container.id === "earningItems" ? "例如：三節獎金" : "例如：遲到扣薪";
  nameInput.value = name;
  nameInput.readOnly = Boolean(systemKey);
  nameInput.setAttribute("aria-label", "薪資項目名稱");

  const amountInput = document.createElement("input");
  amountInput.className = "item-amount";
  amountInput.type = "number";
  amountInput.min = "0";
  amountInput.step = "1";
  amountInput.inputMode = "numeric";
  amountInput.placeholder = "金額";
  amountInput.value = Math.max(0, Math.round(amount));
  amountInput.readOnly = Boolean(systemKey);
  amountInput.setAttribute("aria-label", "薪資項目金額");

  const removeButton = document.createElement("button");
  removeButton.className = "remove-item";
  removeButton.type = "button";
  removeButton.textContent = "×";
  removeButton.title = "移除此項";
  removeButton.setAttribute("aria-label", "移除此項");

  row.append(nameInput, amountInput, removeButton);
  container.appendChild(row);
  if (!systemKey) nameInput.focus();
}

function initializePayslip() {
  createPayslipItem($("earningItems"), "基本薪資", Number($("salary").value), "salary");
  createPayslipItem($("deductionItems"), "勞保費", amountFromText($("laborEmployee").textContent), "labor");
  createPayslipItem($("deductionItems"), "健保費", amountFromText($("healthEmployee").textContent), "health");
  $("payrollMonth").value = todayValue().slice(0, 7);
  $("payDate").value = todayValue();
}

function syncPayslipFromCalculator() {
  setSystemItemAmount("salary", Number($("salary").value) || 0);
  setSystemItemAmount("labor", amountFromText($("laborEmployee").textContent));
  setSystemItemAmount("health", amountFromText($("healthEmployee").textContent));
}

function setSystemItemAmount(key, amount) {
  const input = document.querySelector(`[data-system="${key}"] .item-amount`);
  if (input) input.value = Math.max(0, Math.round(amount));
}

function amountFromText(text) {
  return Number(String(text).replace(/[^\d.-]/g, "")) || 0;
}

function readPayslipItems(containerId) {
  return [...$(containerId).querySelectorAll(".custom-item")]
    .map((row) => ({
      name: row.querySelector(".item-name").value.trim(),
      amount: Math.max(0, Number(row.querySelector(".item-amount").value) || 0)
    }))
    .filter((item) => item.name || item.amount);
}

function updatePayslip() {
  if (!$("earningItems")) return;

  const earnings = readPayslipItems("earningItems");
  const deductions = readPayslipItems("deductionItems");
  const earningTotal = earnings.reduce((sum, item) => sum + item.amount, 0);
  const deductionTotal = deductions.reduce((sum, item) => sum + item.amount, 0);

  $("previewCompany").textContent = $("companyName").value.trim() || "公司名稱";
  $("previewEmployee").textContent = $("employeeName").value.trim() || "未填寫";
  $("previewMonth").textContent = formatMonth($("payrollMonth").value);
  $("previewPayDate").textContent = formatDate($("payDate").value);
  $("earningTotal").textContent = currency(earningTotal);
  $("deductionTotal").textContent = currency(deductionTotal);
  $("netPay").textContent = currency(earningTotal - deductionTotal);

  renderPayslipLines("earningPreview", earnings);
  renderPayslipLines("deductionPreview", deductions);
}

function renderPayslipLines(containerId, items) {
  const container = $(containerId);
  container.replaceChildren();

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "preview-empty";
    empty.textContent = "尚無項目";
    container.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const line = document.createElement("div");
    line.className = "preview-line";
    const name = document.createElement("span");
    name.textContent = item.name || "未命名項目";
    const amount = document.createElement("strong");
    amount.textContent = currency(item.amount);
    line.append(name, amount);
    container.appendChild(line);
  });
}

function currency(value) {
  const rounded = Math.round(Number(value) || 0);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}NT$${Math.abs(rounded).toLocaleString("zh-TW")}`;
}

function formatMonth(value) {
  if (!value) return "未選擇月份";
  const [year, month] = value.split("-").map(Number);
  return `${year} 年 ${month} 月`;
}

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return `${year}/${month}/${day}`;
}

function resetPayslipCustomItems() {
  document.querySelectorAll(".custom-item:not(.system)").forEach((row) => row.remove());
  updatePayslip();
}

async function downloadPayslip() {
  const button = $("downloadPayslipButton");
  button.disabled = true;

  try {
    if (document.fonts?.ready) await document.fonts.ready;

    const earnings = readPayslipItems("earningItems");
    const deductions = readPayslipItems("deductionItems");
    const earningTotal = earnings.reduce((sum, item) => sum + item.amount, 0);
    const deductionTotal = deductions.reduce((sum, item) => sum + item.amount, 0);
    const rowCount = Math.max(earnings.length, deductions.length, 1);
    const width = 1200;
    const height = 570 + rowCount * 62;
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    context.scale(scale, scale);
    context.textBaseline = "alphabetic";

    context.fillStyle = "#f3f0e8";
    context.fillRect(0, 0, width, height);
    drawDots(context, width, height);
    roundRect(context, 48, 48, 1104, height - 96, 28, "#ffffff");

    context.fillStyle = "#0f765e";
    context.font = '800 18px "Noto Sans TC", sans-serif';
    context.fillText($("companyName").value.trim() || "公司名稱", 96, 108);
    context.fillStyle = "#68767d";
    context.font = '700 14px "Noto Sans TC", sans-serif';
    context.fillText(`由 ${OFFICE_NAME} 產製`, 96, 134);
    context.fillStyle = "#17242b";
    context.font = '800 42px "Noto Sans TC", sans-serif';
    context.fillText("薪資明細表", 96, 180);
    context.textAlign = "right";
    context.font = '800 21px "Noto Sans TC", sans-serif';
    context.fillText(formatMonth($("payrollMonth").value), 1104, 130);
    context.textAlign = "left";

    roundRect(context, 96, 194, 1008, 72, 12, "#f3f6f4");
    context.fillStyle = "#68767d";
    context.font = '600 13px "Noto Sans TC", sans-serif';
    context.fillText("員工姓名", 118, 222);
    context.fillText("發薪日", 660, 222);
    context.fillStyle = "#17242b";
    context.font = '800 19px "Noto Sans TC", sans-serif';
    context.fillText($("employeeName").value.trim() || "未填寫", 118, 250);
    context.fillText(formatDate($("payDate").value), 660, 250);

    drawPayslipColumn(context, 96, 300, 492, "應發項目", earnings, earningTotal, "#0f765e");
    drawPayslipColumn(context, 612, 300, 492, "應扣項目", deductions, deductionTotal, "#a55338");

    const netY = 374 + rowCount * 62;
    roundRect(context, 96, netY, 1008, 92, 12, "#17242b");
    context.fillStyle = "#ffffff";
    context.font = '700 20px "Noto Sans TC", sans-serif';
    context.fillText("本期實發金額", 124, netY + 55);
    context.textAlign = "right";
    context.font = '800 38px "Noto Sans TC", sans-serif';
    context.fillText(currency(earningTotal - deductionTotal), 1076, netY + 58);
    context.textAlign = "center";
    context.fillStyle = "#68767d";
    context.font = '500 12px "Noto Sans TC", sans-serif';
    context.fillText("本薪資條由群利稅務記帳士事務所薪資小幫手產製，金額請以公司實際薪資紀錄為準。", width / 2, netY + 126);
    context.fillText(COPYRIGHT_TEXT, width / 2, netY + 148);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) throw new Error("無法建立薪資條圖片");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const employee = $("employeeName").value.trim() || "員工";
    link.download = `${employee}-${$("payrollMonth").value || "薪資"}薪資條.jpg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("薪資條已下載");
  } catch (error) {
    console.error(error);
    showToast("薪資條下載失敗，請再試一次");
  } finally {
    button.disabled = false;
  }
}

function drawPayslipColumn(context, x, y, width, title, items, total, color) {
  context.fillStyle = `${color}18`;
  context.fillRect(x, y, width, 56);
  context.fillStyle = color;
  context.font = '800 18px "Noto Sans TC", sans-serif';
  context.fillText(title, x + 18, y + 36);
  context.textAlign = "right";
  context.fillText(currency(total), x + width - 18, y + 36);

  const rows = items.length ? items : [{ name: "尚無項目", amount: 0, empty: true }];
  rows.forEach((item, index) => {
    const rowY = y + 56 + index * 62;
    context.fillStyle = item.empty ? "#9aa3a5" : "#68767d";
    context.font = '500 16px "Noto Sans TC", sans-serif';
    context.textAlign = "left";
    context.fillText(item.name || "未命名項目", x + 18, rowY + 38);
    if (!item.empty) {
      context.fillStyle = "#17242b";
      context.font = '800 17px "Noto Sans TC", sans-serif';
      context.textAlign = "right";
      context.fillText(currency(item.amount), x + width - 18, rowY + 38);
    }
    context.strokeStyle = "#dfe7e5";
    context.beginPath();
    context.moveTo(x, rowY + 61);
    context.lineTo(x + width, rowY + 61);
    context.stroke();
  });
  context.textAlign = "left";
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

$("salary").addEventListener("input", calculate);
$("dependents").addEventListener("change", calculate);
$("hireDate").addEventListener("change", calculate);
$("terminationDate").addEventListener("change", calculate);
$("calculationDate").addEventListener("change", calculate);
$("usedLeaveDays").addEventListener("input", calculate);
$("resetButton").addEventListener("click", reset);
$("downloadButton").addEventListener("click", downloadResult);
$("companyName").addEventListener("input", updatePayslip);
$("employeeName").addEventListener("input", updatePayslip);
$("payrollMonth").addEventListener("change", updatePayslip);
$("payDate").addEventListener("change", updatePayslip);
$("earningItems").addEventListener("input", updatePayslip);
$("deductionItems").addEventListener("input", updatePayslip);
$("earningItems").addEventListener("click", (event) => {
  if (event.target.classList.contains("remove-item")) {
    event.target.closest(".custom-item").remove();
    updatePayslip();
  }
});
$("deductionItems").addEventListener("click", (event) => {
  if (event.target.classList.contains("remove-item")) {
    event.target.closest(".custom-item").remove();
    updatePayslip();
  }
});
$("addEarningButton").addEventListener("click", () => createPayslipItem($("earningItems")));
$("addDeductionButton").addEventListener("click", () => createPayslipItem($("deductionItems")));
$("resetPayslipButton").addEventListener("click", resetPayslipCustomItems);
$("downloadPayslipButton").addEventListener("click", downloadPayslip);

function todayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

$("calculationDate").value = todayValue();
initializePayslip();
calculate();
