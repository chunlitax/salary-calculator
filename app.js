const MINIMUM_WAGE = 29500;
const LABOR_ORDINARY_RATE = 0.115;
const EMPLOYMENT_RATE = 0.01;
const LABOR_RATE = LABOR_ORDINARY_RATE + EMPLOYMENT_RATE;
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

function numericInputValue(id) {
  return Number(String($(id).value).replace(/,/g, "")) || 0;
}

function formatNumberInput(input) {
  const digits = input.value.replace(/[^\d]/g, "");
  input.value = digits ? Number(digits).toLocaleString("zh-TW") : "";
}

function bracketFor(salary, brackets) {
  const normalized = Math.max(MINIMUM_WAGE, salary || 0);
  return brackets.find((amount) => normalized <= amount) ?? brackets.at(-1);
}

function calculate() {
  const salary = Math.max(0, numericInputValue("salary"));
  const dependents = Number($("dependents").value);
  const occupationalRate = Math.max(0, Number($("occupationalRate").value) || 0) / 100;
  const laborCoverage = calculateLaborCoverageDays(
    $("hireDate").value,
    $("terminationDate").value,
    $("salaryMonth").value
  );
  const leave = calculateAnnualLeave(
    $("hireDate").value,
    monthEndDateValue($("salaryMonth").value),
    Math.max(0, Number($("usedLeaveDays").value) || 0),
    $("leaveSystem").value
  );
  const unusedLeaveDays = leave.remaining;
  const laborBase = bracketFor(salary, laborBrackets);
  const healthBase = bracketFor(salary, healthBrackets);
  const pensionBase = bracketFor(salary, pensionBrackets);
  const healthCoverage = calculateHealthCoverage(
    $("hireDate").value,
    $("terminationDate").value,
    $("salaryMonth").value
  );

  const laborOrdinaryEmployee = Math.round(laborBase * LABOR_ORDINARY_RATE * 0.2 * laborCoverage.ratio);
  const laborOrdinaryEmployer = Math.round(laborBase * LABOR_ORDINARY_RATE * 0.7 * laborCoverage.ratio);
  const employmentEmployee = Math.round(laborBase * EMPLOYMENT_RATE * 0.2 * laborCoverage.ratio);
  const employmentEmployer = Math.round(laborBase * EMPLOYMENT_RATE * 0.7 * laborCoverage.ratio);
  const occupationalEmployer = Math.round(laborBase * occupationalRate * laborCoverage.ratio);
  const laborEmployee = laborOrdinaryEmployee + employmentEmployee;
  const laborEmployer = laborOrdinaryEmployer + employmentEmployer + occupationalEmployer;
  const healthEmployee = healthCoverage.covered
    ? Math.round(healthBase * HEALTH_RATE * 0.3 * (1 + dependents))
    : 0;
  const healthEmployer = healthCoverage.covered
    ? Math.round(healthBase * HEALTH_RATE * 0.6 * (1 + EMPLOYER_AVG_DEPENDENTS))
    : 0;
  const pensionEmployer = Math.round(pensionBase * 0.06);
  const employeeTotal = laborEmployee + healthEmployee;
  const employerContribution = laborEmployer + healthEmployer + pensionEmployer;
  const takeHome = salary - employeeTotal;
  const employerTotal = salary + employerContribution;
  const dailyWage = salary / 30;
  const leaveCash = Math.round(dailyWage * unusedLeaveDays);

  updateMinimumWageHint(salary);
  updateInsuranceScale(salary, Math.max(laborBase, healthBase));
  $("takeHome").textContent = money(takeHome);
  $("employerTotal").textContent = money(employerTotal);
  $("laborEmployee").textContent = money(laborEmployee);
  $("laborEmployer").textContent = money(laborEmployer);
  $("laborOrdinaryEmployee").textContent = money(laborOrdinaryEmployee);
  $("laborOrdinaryEmployer").textContent = money(laborOrdinaryEmployer);
  $("employmentEmployee").textContent = money(employmentEmployee);
  $("employmentEmployer").textContent = money(employmentEmployer);
  $("occupationalEmployer").textContent = money(occupationalEmployer);
  $("healthEmployee").textContent = money(healthEmployee);
  $("healthEmployer").textContent = money(healthEmployer);
  $("pensionEmployer").textContent = money(pensionEmployer);
  $("employeeContributionTotal").textContent = money(employeeTotal);
  $("employerContributionTotal").textContent = money(employerContribution);
  $("laborDaysLabel").textContent = laborCoverage.label;
  $("dependentLabel").textContent = healthCoverage.label;
  $("dailyWage").textContent = money(dailyWage);
  $("leaveDaysLabel").textContent = unusedLeaveDays.toLocaleString("zh-TW");
  $("leaveCash").textContent = money(leaveCash);
  $("leavePeriodRange").textContent = leave.periodText;
  $("serviceLength").textContent = leave.serviceText;
  $("entitledLeaveDays").textContent = formatDays(leave.entitled);
  $("usedLeaveResult").textContent = formatDays(leave.used);
  $("remainingLeaveDays").textContent = formatDays(leave.remaining);
  syncPayslipFromCalculator();
  updatePayslip();
}

function updateMinimumWageHint(salary) {
  const hint = $("minimumHint");
  const belowMinimumWage = salary > 0 && salary < MINIMUM_WAGE;
  hint.classList.toggle("warning", belowMinimumWage);
  hint.textContent = belowMinimumWage
    ? "低於 2026 年最低工資 NT$29,500"
    : "2026 年最低工資 NT$29,500｜勞保投保級距上限 NT$45,800";
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

function calculateLaborCoverageDays(hireValue, terminationValue, salaryMonthValue) {
  const salaryMonth = parseLocalMonth(salaryMonthValue) || new Date();
  const monthStart = new Date(salaryMonth.getFullYear(), salaryMonth.getMonth(), 1);
  const monthEnd = new Date(salaryMonth.getFullYear(), salaryMonth.getMonth() + 1, 0);
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

function calculateHealthCoverage(hireValue, terminationValue, salaryMonthValue) {
  const salaryMonth = parseLocalMonth(salaryMonthValue) || new Date();
  const monthEnd = new Date(salaryMonth.getFullYear(), salaryMonth.getMonth() + 1, 0);
  const hire = parseLocalDate(hireValue);
  const termination = parseLocalDate(terminationValue);
  const dependents = Number($("dependents").value);
  const dependentText = dependents === 0 ? "本人" : `本人＋${dependents} 位眷屬`;

  const covered = (!hire || hire <= monthEnd) && (!termination || termination >= monthEnd);

  return {
    covered,
    label: covered ? `${dependentText}｜月底在保` : `${dependentText}｜月底未在保`
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

function calculateAnnualLeave(hireValue, calculationValue, usedDays, system = "anniversary") {
  if (!hireValue || !calculationValue) {
    return { entitled: 0, used: usedDays, remaining: 0, serviceText: "請填到職日", periodText: "請填到職日" };
  }

  const hire = parseLocalDate(hireValue);
  const calculation = parseLocalDate(calculationValue);
  if (!hire || !calculation || calculation < hire) {
    return { entitled: 0, used: usedDays, remaining: 0, serviceText: "日期有誤", periodText: "日期有誤" };
  }

  if (system === "calendar") {
    return calculateCalendarYearLeave(hire, calculation, usedDays);
  }

  return calculateAnniversaryLeave(hire, calculation, usedDays);
}

function calculateAnniversaryLeave(hire, calculation, usedDays) {
  let years = calculation.getFullYear() - hire.getFullYear();
  let anniversary = addYears(hire, years);
  if (calculation < anniversary) {
    years -= 1;
    anniversary = addYears(hire, years);
  }

  const months = completeMonthsBetween(anniversary, calculation);
  const entitled = annualLeaveDays(years, months);
  const period = annualLeavePeriod(hire, years, months);
  return {
    entitled,
    used: usedDays,
    remaining: Math.max(0, entitled - usedDays),
    serviceText: `${years} 年 ${months} 個月`,
    periodText: period
  };
}

function calculateCalendarYearLeave(hire, calculation, usedDays) {
  const yearStart = new Date(calculation.getFullYear(), 0, 1);
  const yearEnd = new Date(calculation.getFullYear(), 11, 31);
  const entitled = annualLeaveCalendarDays(hire, yearStart, yearEnd);

  return {
    entitled,
    used: usedDays,
    remaining: Math.max(0, entitled - usedDays),
    serviceText: serviceLengthText(hire, calculation),
    periodText: `${formatShortDate(yearStart)}－${formatShortDate(yearEnd)}`
  };
}

function annualLeaveCalendarDays(hire, yearStart, yearEnd) {
  let total = 0;

  for (let serviceYears = 0; serviceYears <= 60; serviceYears += 1) {
    const periodStart = serviceYears === 0 ? addMonths(hire, 6) : addYears(hire, serviceYears);
    const periodEnd = serviceYears === 0 ? addDays(addYears(hire, 1), -1) : addDays(addYears(hire, serviceYears + 1), -1);
    const entitlement = annualLeaveDays(serviceYears, serviceYears === 0 ? 6 : 0);
    if (!entitlement) continue;
    if (periodStart > yearEnd) break;
    if (periodEnd < yearStart) continue;

    const overlapStart = periodStart > yearStart ? periodStart : yearStart;
    const overlapEnd = periodEnd < yearEnd ? periodEnd : yearEnd;
    const overlapDays = daysBetweenInclusive(overlapStart, overlapEnd);
    const periodDays = daysBetweenInclusive(periodStart, periodEnd);
    total += entitlement * (overlapDays / periodDays);
  }

  return roundToHalfDay(total);
}

function serviceLengthText(hire, calculation) {
  let years = calculation.getFullYear() - hire.getFullYear();
  let anniversary = addYears(hire, years);
  if (calculation < anniversary) {
    years -= 1;
    anniversary = addYears(hire, years);
  }

  const months = completeMonthsBetween(anniversary, calculation);
  return `${years} 年 ${months} 個月`;
}

function annualLeavePeriod(hire, years, months) {
  if (years === 0 && months < 6) return "尚未滿 6 個月";

  const start = years === 0
    ? addMonths(hire, 6)
    : addYears(hire, years);
  const end = years === 0
    ? addDays(addYears(hire, 1), -1)
    : addDays(addYears(hire, years + 1), -1);

  return `${formatShortDate(start)}－${formatShortDate(end)}`;
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

function parseLocalMonth(value) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, 1);
}

function monthEndDateValue(monthValue) {
  const month = parseLocalMonth(monthValue) || new Date();
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const year = end.getFullYear();
  const monthNumber = String(end.getMonth() + 1).padStart(2, "0");
  const day = String(end.getDate()).padStart(2, "0");
  return `${year}-${monthNumber}-${day}`;
}

function addYears(date, years) {
  const result = new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
  if (result.getMonth() !== date.getMonth()) result.setDate(0);
  return result;
}

function addMonths(date, months) {
  const result = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  if (result.getMonth() !== (date.getMonth() + months) % 12) result.setDate(0);
  return result;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetweenInclusive(start, end) {
  const dayMs = 24 * 60 * 60 * 1000;
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.round((endDate - startDate) / dayMs) + 1);
}

function roundToHalfDay(value) {
  return Math.round((Number(value) || 0) * 2) / 2;
}

function completeMonthsBetween(start, end) {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

function formatDays(value) {
  return Number(value).toLocaleString("zh-TW", { maximumFractionDigits: 1 });
}

function formatShortDate(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function reset() {
  $("salary").value = "29,500";
  $("dependents").value = "0";
  $("occupationalRate").value = "0.16";
  $("salaryMonth").value = todayMonthValue();
  $("hireDate").value = "";
  $("terminationDate").value = "";
  $("usedLeaveDays").value = "0";
  $("leaveSystem").value = "anniversary";
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
    const height = 1220;
    canvas.width = width * scale;
    canvas.height = height * scale;

    const context = canvas.getContext("2d");
    context.scale(scale, scale);
    context.textBaseline = "alphabetic";

    const salaryAmount = numericInputValue("salary");
    const salaryText = money(salaryAmount);
    const insuredBase = Math.max(
      bracketFor(salaryAmount, laborBrackets),
      bracketFor(salaryAmount, healthBrackets)
    );
    const insuranceLabels = insuranceScaleLabels(insuredBase);
    const insuranceMarker = insuranceMarkerLeft(salaryAmount, insuranceLabels);
    const laborDetailRows = [
      ["勞保普通事故", $("laborOrdinaryEmployee").textContent, $("laborOrdinaryEmployer").textContent],
      ["就業保險", $("employmentEmployee").textContent, $("employmentEmployer").textContent],
      ["職災保險", "—", $("occupationalEmployer").textContent]
    ];
    const rows = [
      { name: "勞工保險", employee: $("laborEmployee").textContent, employer: $("laborEmployer").textContent, details: laborDetailRows },
      { name: "全民健康保險", employee: $("healthEmployee").textContent, employer: $("healthEmployer").textContent },
      { name: "勞工退休金", employee: "—", employer: $("pensionEmployer").textContent }
    ];

    context.fillStyle = "#f3f0e8";
    context.fillRect(0, 0, width, height);
    drawDots(context, width, height);

    roundRect(context, 48, 48, 1104, 1124, 30, "#fffefa");

    context.fillStyle = "#0f765e";
    context.font = '800 18px "Noto Sans TC", sans-serif';
    context.fillText(OFFICE_NAME, 96, 112);

    context.fillStyle = "#17242b";
    context.font = '800 42px "Noto Sans TC", sans-serif';
    context.fillText("勞健保試算", 96, 166);
    context.fillStyle = "#68767d";
    context.font = '700 16px "Noto Sans TC", sans-serif';
    context.fillText(TOOL_NAME, 96, 196);

    drawInsuranceScale(context, 764, 104, 340, insuranceLabels, insuranceMarker);

    drawInputSalaryCard(context, 96, 210, 324, 170, salaryText, $("dependentLabel").textContent);
    drawSummaryCard(context, 438, 210, 324, 170, "#0f765e",
      "員工實領", $("takeHome").textContent, "月薪－勞保自付－健保自付");
    drawSummaryCard(context, 780, 210, 324, 170, "#17242b",
      "雇主每月總成本", $("employerTotal").textContent, "月薪＋雇主負擔勞健保＋勞退");

    context.strokeStyle = "#dfe7e5";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(96, 430);
    context.lineTo(1104, 430);
    context.stroke();

    context.fillStyle = "#68767d";
    context.font = '800 17px "Noto Sans TC", sans-serif';
    context.fillText("費用項目", 96, 468);
    context.textAlign = "right";
    context.fillText("員工負擔", 830, 468);
    context.fillText("雇主負擔", 1104, 468);

    let rowTop = 496;
    rows.forEach((row) => {
      const rowHeight = row.details ? 216 : 118;
      const mainCenter = row.details ? rowTop + 38 : rowTop + rowHeight / 2;

      context.textBaseline = "middle";
      context.textAlign = "left";
      context.fillStyle = "#17242b";
      context.font = '800 27px "Noto Sans TC", sans-serif';
      context.fillText(row.name, 96, mainCenter);

      context.textAlign = "right";
      context.font = '800 28px "Noto Sans TC", sans-serif';
      context.fillText(row.employee, 830, mainCenter);
      context.fillText(row.employer, 1104, mainCenter);
      context.textBaseline = "alphabetic";

      if (row.details) {
        drawLaborDetailOnCanvas(context, 96, rowTop + 76, row.details);
      }

      context.strokeStyle = "#dfe7e5";
      context.beginPath();
      context.moveTo(96, rowTop + rowHeight);
      context.lineTo(1104, rowTop + rowHeight);
      context.stroke();
      rowTop += rowHeight;
    });

    roundRect(context, 96, 958, 492, 64, 12, "rgba(15,118,94,.08)");
    roundRect(context, 612, 958, 492, 64, 12, "rgba(23,36,43,.06)");
    context.textAlign = "left";
    context.fillStyle = "#17242b";
    context.font = '800 22px "Noto Sans TC", sans-serif';
    context.fillText("員工自付合計", 118, 999);
    context.fillText("雇主負擔合計", 634, 999);
    context.textAlign = "right";
    context.fillStyle = "#0f765e";
    context.font = '800 30px "Noto Sans TC", sans-serif';
    context.fillText($("employeeContributionTotal").textContent, 566, 1001);
    context.fillStyle = "#17242b";
    context.fillText($("employerContributionTotal").textContent, 1082, 1001);

    roundRect(context, 96, 1046, 1008, 100, 12, "#f3f6f4");
    context.textAlign = "left";
    context.fillStyle = "#68767d";
    context.font = '500 16px "Noto Sans TC", sans-serif';
    context.fillText("本工具未納入薪資所得扣繳試算；是否扣繳及扣繳金額，請依相關稅務規定辦理。", 118, 1080);
    context.fillText("職災保險依輸入費率估算；試算未含工資墊償基金及補充保費。", 118, 1108);
    context.fillText(COPYRIGHT_TEXT, 118, 1136);

    await deliverCanvasImage(
      createResultWallpaperCanvas(salaryText, insuranceLabels, insuranceMarker, rows),
      `薪資勞健保試算-${new Date().toISOString().slice(0, 10)}.jpg`,
      "試算圖已下載",
      "長按圖片即可儲存到手機相簿",
      true
    );
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
  context.font = '700 16px "Noto Sans TC", sans-serif';
  context.fillText(label, x + 26, y + 40);
  context.fillStyle = "#ffffff";
  context.font = '800 38px "Noto Sans TC", sans-serif';
  context.fillText(amount, x + 26, y + 101);
  context.fillStyle = "rgba(255,255,255,.7)";
  context.font = '500 12px "Noto Sans TC", sans-serif';
  context.fillText(note, x + 26, y + 136);
}

function drawInputSalaryCard(context, x, y, width, height, salaryText, dependentText) {
  roundRect(context, x, y, width, height, 22, "#f3f6f4");
  context.fillStyle = "#0f765e";
  context.font = '800 16px "Noto Sans TC", sans-serif';
  context.fillText("輸入月薪", x + 26, y + 40);
  context.fillStyle = "#17242b";
  context.font = '800 38px "Noto Sans TC", sans-serif';
  context.fillText(salaryText, x + 26, y + 101);
  context.fillStyle = "#68767d";
  context.font = '600 12px "Noto Sans TC", sans-serif';
  context.fillText(dependentText, x + 26, y + 136);
}

function createResultWallpaperCanvas(salaryText, insuranceLabels, insuranceMarker, rows) {
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.textBaseline = "alphabetic";

  context.fillStyle = "#f3f0e8";
  context.fillRect(0, 0, width, height);
  drawDots(context, width, height);

  roundRect(context, 44, 56, 992, 1808, 34, "#fffefa");

  context.fillStyle = "#0f765e";
  context.font = '800 24px "Noto Sans TC", sans-serif';
  context.fillText(OFFICE_NAME, 86, 118);
  context.fillStyle = "#17242b";
  context.font = '800 58px "Noto Sans TC", sans-serif';
  context.fillText("勞健保試算", 86, 190);
  context.fillStyle = "#68767d";
  context.font = '700 22px "Noto Sans TC", sans-serif';
  context.fillText(TOOL_NAME, 86, 230);

  drawInsuranceScale(context, 586, 116, 390, insuranceLabels, insuranceMarker);

  drawMobileInfoCard(context, 86, 284, 908, 138, "輸入月薪", salaryText, $("dependentLabel").textContent);
  drawMobileSummaryCard(context, 86, 446, 908, 168, "#0f765e",
    "員工實領", $("takeHome").textContent, "月薪－勞保自付－健保自付");
  drawMobileSummaryCard(context, 86, 638, 908, 168, "#17242b",
    "雇主每月總成本", $("employerTotal").textContent, "月薪＋雇主負擔勞健保＋勞退");

  context.fillStyle = "#68767d";
  context.font = '800 22px "Noto Sans TC", sans-serif';
  context.fillText("費用項目", 86, 875);
  context.textAlign = "right";
  context.fillText("員工負擔", 742, 875);
  context.fillText("雇主負擔", 994, 875);
  context.textAlign = "left";

  let y = 914;
  rows.forEach((row) => {
    const rowHeight = row.details ? 270 : 124;
    drawMobileBreakdownRow(context, 86, y, 908, rowHeight, row);
    y += rowHeight + 16;
  });

  drawMobileTotalCard(context, 86, y + 10, 908, $("employeeContributionTotal").textContent, $("employerContributionTotal").textContent);

  roundRect(context, 86, y + 154, 908, 150, 18, "#f3f6f4");
  context.fillStyle = "#68767d";
  context.font = '500 18px "Noto Sans TC", sans-serif';
  context.fillText("本工具未納入薪資所得扣繳試算；是否扣繳及扣繳金額，請依相關稅務規定辦理。", 112, y + 196);
  context.fillText("職災保險依輸入費率估算；試算未含工資墊償基金及補充保費。", 112, y + 228);
  context.fillText(COPYRIGHT_TEXT, 112, y + 260);

  return canvas;
}

function drawMobileInfoCard(context, x, y, width, height, label, amount, note) {
  roundRect(context, x, y, width, height, 22, "#f3f6f4");
  context.fillStyle = "#0f765e";
  context.font = '800 22px "Noto Sans TC", sans-serif';
  context.fillText(label, x + 28, y + 42);
  context.fillStyle = "#17242b";
  context.font = '800 46px "Noto Sans TC", sans-serif';
  context.fillText(amount, x + 28, y + 98);
  context.fillStyle = "#68767d";
  context.font = '700 18px "Noto Sans TC", sans-serif';
  context.fillText(note, x + 28, y + 124);
}

function drawMobileSummaryCard(context, x, y, width, height, color, label, amount, note) {
  roundRect(context, x, y, width, height, 24, color);
  context.fillStyle = "rgba(255,255,255,.85)";
  context.font = '800 24px "Noto Sans TC", sans-serif';
  context.fillText(label, x + 32, y + 48);
  context.fillStyle = "#ffffff";
  context.font = '800 56px "Noto Sans TC", sans-serif';
  context.fillText(amount, x + 32, y + 116);
  context.fillStyle = "rgba(255,255,255,.72)";
  context.font = '600 18px "Noto Sans TC", sans-serif';
  context.fillText(note, x + 32, y + 146);
}

function drawMobileBreakdownRow(context, x, y, width, height, row) {
  roundRect(context, x, y, width, height, 18, "#ffffff");
  context.strokeStyle = "#dfe7e5";
  context.strokeRect(x, y, width, height);

  context.textBaseline = "middle";
  context.textAlign = "left";
  context.fillStyle = "#17242b";
  context.font = '800 30px "Noto Sans TC", sans-serif';
  context.fillText(row.name, x + 26, y + 58);

  context.textAlign = "right";
  context.font = '800 30px "Noto Sans TC", sans-serif';
  context.fillText(row.employee, x + width - 252, y + 58);
  context.fillText(row.employer, x + width - 26, y + 58);
  context.textBaseline = "alphabetic";

  if (!row.details) {
    context.textAlign = "left";
    return;
  }

  roundRect(context, x + 24, y + 98, width - 48, 144, 16, "rgba(23,36,43,.035)");
  context.fillStyle = "#0f765e";
  context.font = '800 18px "Noto Sans TC", sans-serif';
  context.textAlign = "left";
  context.fillText("勞保細項（員工／雇主）", x + 48, y + 130);

  row.details.forEach((detail, index) => {
    const detailY = y + 164 + index * 30;
    context.fillStyle = "#68767d";
    context.font = '700 18px "Noto Sans TC", sans-serif';
    context.textAlign = "left";
    context.fillText(detail[0], x + 48, detailY);
    context.fillStyle = "#17242b";
    context.font = '800 19px "Noto Sans TC", sans-serif';
    context.textAlign = "right";
    context.fillText(`${detail[1]}／${detail[2]}`, x + width - 48, detailY);
  });
  context.textAlign = "left";
}

function drawMobileTotalCard(context, x, y, width, employeeTotal, employerTotal) {
  roundRect(context, x, y, width, 112, 18, "#f3f6f4");
  context.textAlign = "left";
  context.fillStyle = "#17242b";
  context.font = '800 22px "Noto Sans TC", sans-serif';
  context.fillText("員工自付合計", x + 28, y + 44);
  context.fillText("雇主負擔合計", x + 28, y + 88);
  context.textAlign = "right";
  context.fillStyle = "#0f765e";
  context.font = '800 28px "Noto Sans TC", sans-serif';
  context.fillText(employeeTotal, x + width - 28, y + 44);
  context.fillStyle = "#17242b";
  context.fillText(employerTotal, x + width - 28, y + 88);
  context.textAlign = "left";
}

function drawLaborDetailOnCanvas(context, x, y, details) {
  roundRect(context, x, y, 1008, 90, 12, "rgba(23,36,43,.04)");

  context.textAlign = "left";
  context.fillStyle = "#0f765e";
  context.font = '800 16px "Noto Sans TC", sans-serif';
  context.fillText("細項", x + 18, y + 52);

  const columns = [
    { x: x + 142, align: "left" },
    { x: x + 452, align: "left" },
    { x: x + 762, align: "left" }
  ];

  details.forEach((detail, index) => {
    const column = columns[index];
    context.textAlign = column.align;
    context.fillStyle = "#68767d";
    context.font = '700 15px "Noto Sans TC", sans-serif';
    context.fillText(detail[0], column.x, y + 34);

    context.fillStyle = "#17242b";
    context.font = '800 17px "Noto Sans TC", sans-serif';
    context.fillText(`${detail[1]}／${detail[2]}`, column.x, y + 64);
  });

  context.textAlign = "left";
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

function createPayslipItem(container, name = "", amount = 0, systemKey = "", options = {}) {
  const row = document.createElement("div");
  const locked = systemKey === "salary";
  row.className = `custom-item${systemKey ? " system" : ""}${locked ? " locked" : ""}`;
  if (systemKey) row.dataset.system = systemKey;
  if (options.manual) row.dataset.manual = "true";

  const nameInput = document.createElement("input");
  nameInput.className = "item-name";
  nameInput.type = "text";
  nameInput.placeholder = container.id === "earningItems" ? "例如：三節獎金" : "例如：遲到扣薪";
  nameInput.value = name;
  nameInput.readOnly = locked;
  nameInput.setAttribute("aria-label", "薪資項目名稱");

  const amountInput = document.createElement("input");
  amountInput.className = "item-amount";
  amountInput.type = "number";
  amountInput.min = "0";
  amountInput.step = "1";
  amountInput.inputMode = "numeric";
  amountInput.placeholder = "金額";
  amountInput.value = Math.max(0, Math.round(amount));
  amountInput.readOnly = locked;
  amountInput.setAttribute("aria-label", "薪資項目金額");

  const removeButton = document.createElement("button");
  removeButton.className = "remove-item";
  removeButton.type = "button";
  removeButton.textContent = "×";
  removeButton.title = "移除此項";
  removeButton.setAttribute("aria-label", "移除此項");

  row.append(nameInput, amountInput, removeButton);
  container.appendChild(row);
  if (!systemKey && options.focus !== false) nameInput.focus();
}

function initializePayslip() {
  createPayslipItem($("earningItems"), "基本薪資", numericInputValue("salary"), "salary");
  createPayslipItem($("deductionItems"), "勞保費", amountFromText($("laborEmployee").textContent), "labor");
  createPayslipItem($("deductionItems"), "健保費", amountFromText($("healthEmployee").textContent), "health");
  $("payrollMonth").value = $("salaryMonth").value || todayMonthValue();
  $("payDate").value = todayValue();
}

function syncPayslipFromCalculator() {
  setSystemItemAmount("salary", numericInputValue("salary"));
  setSystemItemAmount("labor", amountFromText($("laborEmployee").textContent));
  setSystemItemAmount("health", amountFromText($("healthEmployee").textContent));
}

function setSystemItemAmount(key, amount) {
  const row = document.querySelector(`[data-system="${key}"]`);
  if (row?.dataset.manual === "true") return;
  const input = row?.querySelector(".item-amount");
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

function serializePayslipItems(containerId) {
  return [...$(containerId).querySelectorAll(".custom-item")]
    .map((row) => ({
      name: row.querySelector(".item-name").value.trim(),
      amount: Math.max(0, Number(row.querySelector(".item-amount").value) || 0),
      systemKey: row.dataset.system || "",
      manual: row.dataset.manual === "true"
    }))
    .filter((item) => item.name || item.amount || item.systemKey);
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

function exportPayslipConfig() {
  const employee = $("employeeName").value.trim() || "員工";
  const config = {
    version: 1,
    exportedAt: new Date().toISOString(),
    calculator: {
      salary: numericInputValue("salary"),
      dependents: $("dependents").value,
      occupationalRate: $("occupationalRate").value,
      salaryMonth: $("salaryMonth").value,
      hireDate: $("hireDate").value,
      terminationDate: $("terminationDate").value,
      usedLeaveDays: $("usedLeaveDays").value,
      leaveSystem: $("leaveSystem").value
    },
    payslip: {
      companyName: $("companyName").value,
      employeeName: $("employeeName").value,
      payrollMonth: $("payrollMonth").value,
      payDate: $("payDate").value,
      earnings: serializePayslipItems("earningItems"),
      deductions: serializePayslipItems("deductionItems")
    }
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${safeFilename(employee)}-薪資小幫手設定.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("設定檔已匯出");
}

async function importPayslipConfig(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const config = JSON.parse(await file.text());
    const calculator = config.calculator || {};
    const payslip = config.payslip || {};

    if (calculator.salary !== undefined) {
      $("salary").value = Number(calculator.salary || 0).toLocaleString("zh-TW");
    }
    if (calculator.dependents !== undefined) $("dependents").value = String(calculator.dependents);
    if (calculator.occupationalRate !== undefined) $("occupationalRate").value = calculator.occupationalRate;
    if (calculator.salaryMonth !== undefined) $("salaryMonth").value = calculator.salaryMonth;
    if (calculator.hireDate !== undefined) $("hireDate").value = calculator.hireDate;
    if (calculator.terminationDate !== undefined) $("terminationDate").value = calculator.terminationDate;
    if (calculator.usedLeaveDays !== undefined) $("usedLeaveDays").value = calculator.usedLeaveDays;
    if (calculator.leaveSystem !== undefined) $("leaveSystem").value = calculator.leaveSystem;

    $("companyName").value = payslip.companyName || "";
    $("employeeName").value = payslip.employeeName || "";
    $("payrollMonth").value = payslip.payrollMonth || $("salaryMonth").value || todayMonthValue();
    $("payDate").value = payslip.payDate || todayValue();

    $("earningItems").replaceChildren();
    $("deductionItems").replaceChildren();

    const earnings = payslip.earnings?.length
      ? payslip.earnings
      : [{ name: "基本薪資", amount: numericInputValue("salary"), systemKey: "salary" }];
    const deductions = payslip.deductions?.length
      ? payslip.deductions
      : [
          { name: "勞保費", amount: amountFromText($("laborEmployee").textContent), systemKey: "labor" },
          { name: "健保費", amount: amountFromText($("healthEmployee").textContent), systemKey: "health" }
        ];

    earnings.forEach((item) => createPayslipItem($("earningItems"), item.name, item.amount, item.systemKey, {
      manual: item.manual,
      focus: false
    }));
    deductions.forEach((item) => createPayslipItem($("deductionItems"), item.name, item.amount, item.systemKey, {
      manual: item.manual,
      focus: false
    }));

    calculate();
    updatePayslip();
    showToast("設定檔已匯入");
  } catch (error) {
    console.error(error);
    showToast("設定檔格式錯誤");
  } finally {
    event.target.value = "";
  }
}

function safeFilename(value) {
  return String(value || "員工").replace(/[\\/:*?"<>|]/g, "-").trim() || "員工";
}

function handlePayslipItemsInput(event) {
  const row = event.target.closest(".custom-item.system:not(.locked)");
  if (row) row.dataset.manual = "true";
  updatePayslip();
}

function handleSalaryMonthChange() {
  $("payrollMonth").value = $("salaryMonth").value;
  calculate();
}

function handleSalaryInput() {
  formatNumberInput($("salary"));
  calculate();
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
    const height = 660 + rowCount * 62;
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

    const netY = 398 + rowCount * 62;
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

    const employee = $("employeeName").value.trim() || "員工";
    await deliverCanvasImage(
      createPayslipWallpaperCanvas(earnings, deductions, earningTotal, deductionTotal),
      `${employee}-${$("payrollMonth").value || "薪資"}薪資條.jpg`,
      "薪資條已下載",
      "長按薪資條即可儲存到手機相簿",
      true
    );
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

function createPayslipWallpaperCanvas(earnings, deductions, earningTotal, deductionTotal) {
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.textBaseline = "alphabetic";

  context.fillStyle = "#f3f0e8";
  context.fillRect(0, 0, width, height);
  drawDots(context, width, height);
  roundRect(context, 44, 56, 992, 1808, 34, "#ffffff");

  context.fillStyle = "#0f765e";
  context.font = '800 26px "Noto Sans TC", sans-serif';
  context.fillText($("companyName").value.trim() || "公司名稱", 86, 124);
  context.fillStyle = "#68767d";
  context.font = '700 18px "Noto Sans TC", sans-serif';
  context.fillText(`由 ${OFFICE_NAME} 產製`, 86, 158);

  context.fillStyle = "#17242b";
  context.font = '800 64px "Noto Sans TC", sans-serif';
  context.fillText("薪資明細表", 86, 238);
  context.textAlign = "right";
  context.font = '800 28px "Noto Sans TC", sans-serif';
  context.fillText(formatMonth($("payrollMonth").value), 994, 152);
  context.textAlign = "left";

  roundRect(context, 86, 280, 908, 118, 18, "#f3f6f4");
  context.fillStyle = "#68767d";
  context.font = '700 18px "Noto Sans TC", sans-serif';
  context.fillText("員工姓名", 114, 322);
  context.fillText("發薪日", 560, 322);
  context.fillStyle = "#17242b";
  context.font = '800 30px "Noto Sans TC", sans-serif';
  context.fillText($("employeeName").value.trim() || "未填寫", 114, 368);
  context.fillText(formatDate($("payDate").value), 560, 368);

  let y = 446;
  y = drawMobilePayslipSection(context, 86, y, 908, "應發項目", earnings, earningTotal, "#0f765e");
  y += 24;
  y = drawMobilePayslipSection(context, 86, y, 908, "應扣項目", deductions, deductionTotal, "#a55338");
  y += 36;

  roundRect(context, 86, y, 908, 142, 22, "#17242b");
  context.fillStyle = "#ffffff";
  context.font = '800 28px "Noto Sans TC", sans-serif';
  context.fillText("本期實發金額", 120, y + 84);
  context.textAlign = "right";
  context.font = '800 58px "Noto Sans TC", sans-serif';
  context.fillText(currency(earningTotal - deductionTotal), 960, y + 88);
  context.textAlign = "left";

  const noteY = Math.max(y + 190, 1690);
  roundRect(context, 86, noteY, 908, 112, 18, "#f3f6f4");
  context.textAlign = "center";
  context.fillStyle = "#68767d";
  context.font = '500 17px "Noto Sans TC", sans-serif';
  context.fillText("本薪資條由群利稅務記帳士事務所薪資小幫手產製，金額請以公司實際薪資紀錄為準。", width / 2, noteY + 44);
  context.fillText(COPYRIGHT_TEXT, width / 2, noteY + 78);
  context.textAlign = "left";

  return canvas;
}

function drawMobilePayslipSection(context, x, y, width, title, items, total, color) {
  const rows = items.length ? items : [{ name: "尚無項目", amount: 0, empty: true }];
  const rowHeight = 62;
  const height = 78 + rows.length * rowHeight;

  roundRect(context, x, y, width, height, 20, "#ffffff");
  context.fillStyle = `${color}18`;
  roundRect(context, x, y, width, 78, 20, `${color}18`);

  context.fillStyle = color;
  context.font = '800 28px "Noto Sans TC", sans-serif';
  context.fillText(title, x + 28, y + 50);
  context.textAlign = "right";
  context.fillText(currency(total), x + width - 28, y + 50);

  rows.forEach((item, index) => {
    const rowY = y + 78 + index * rowHeight;
    context.textAlign = "left";
    context.fillStyle = item.empty ? "#9aa3a5" : "#68767d";
    context.font = '600 23px "Noto Sans TC", sans-serif';
    context.fillText(item.name || "未命名項目", x + 28, rowY + 40);
    if (!item.empty) {
      context.textAlign = "right";
      context.fillStyle = "#17242b";
      context.font = '800 25px "Noto Sans TC", sans-serif';
      context.fillText(currency(item.amount), x + width - 28, rowY + 40);
    }
    context.strokeStyle = "#dfe7e5";
    context.beginPath();
    context.moveTo(x + 24, rowY + rowHeight - 1);
    context.lineTo(x + width - 24, rowY + rowHeight - 1);
    context.stroke();
  });

  context.textAlign = "left";
  return y + height;
}

async function deliverCanvasImage(canvas, filename, desktopMessage, mobileMessage, alreadyWallpaper = false) {
  const outputCanvas = alreadyWallpaper ? canvas : createWallpaperCanvas(canvas);
  const blob = await new Promise((resolve) => outputCanvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("無法建立圖片");

  const url = URL.createObjectURL(blob);
  if (isMobileDevice()) {
    showImagePreview(url, filename, mobileMessage);
    showToast("圖片已產生，長按即可儲存");
    return;
  }

  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(desktopMessage);
}

function createWallpaperCanvas(sourceCanvas) {
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  context.fillStyle = "#f3f0e8";
  context.fillRect(0, 0, width, height);
  drawDots(context, width, height);

  const maxWidth = 1000;
  const maxHeight = 1780;
  const ratio = Math.min(maxWidth / sourceCanvas.width, maxHeight / sourceCanvas.height);
  const drawWidth = sourceCanvas.width * ratio;
  const drawHeight = sourceCanvas.height * ratio;
  const x = (width - drawWidth) / 2;
  const y = Math.max(52, (height - drawHeight) / 2);

  context.drawImage(sourceCanvas, x, y, drawWidth, drawHeight);
  return canvas;
}

function isMobileDevice() {
  return window.matchMedia("(max-width: 760px)").matches
    || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function showImagePreview(url, filename, message) {
  document.querySelector(".image-preview-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "image-preview-overlay";
  const sheet = document.createElement("div");
  sheet.className = "image-preview-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "圖片預覽");

  const head = document.createElement("div");
  head.className = "image-preview-head";
  const title = document.createElement("strong");
  title.textContent = message;
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "關閉預覽");
  head.append(title, closeButton);

  const hint = document.createElement("p");
  hint.textContent = "iPhone：長按圖片選「加入照片」。Android：長按圖片選「下載圖片」或「儲存圖片」。";

  const image = document.createElement("img");
  image.src = url;
  image.alt = "產生的圖片";

  const fallbackLink = document.createElement("a");
  fallbackLink.download = filename;
  fallbackLink.href = url;
  fallbackLink.textContent = "改用下載檔案";

  sheet.append(head, hint, image, fallbackLink);
  overlay.appendChild(sheet);

  const close = () => {
    overlay.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  closeButton.addEventListener("click", close);
  document.body.appendChild(overlay);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

$("salary").addEventListener("input", handleSalaryInput);
$("dependents").addEventListener("change", calculate);
$("occupationalRate").addEventListener("input", calculate);
$("salaryMonth").addEventListener("change", handleSalaryMonthChange);
$("hireDate").addEventListener("change", calculate);
$("terminationDate").addEventListener("change", calculate);
$("usedLeaveDays").addEventListener("input", calculate);
$("leaveSystem").addEventListener("change", calculate);
$("resetButton").addEventListener("click", reset);
$("downloadButton").addEventListener("click", downloadResult);
$("companyName").addEventListener("input", updatePayslip);
$("employeeName").addEventListener("input", updatePayslip);
$("payrollMonth").addEventListener("change", updatePayslip);
$("payDate").addEventListener("change", updatePayslip);
$("earningItems").addEventListener("input", handlePayslipItemsInput);
$("deductionItems").addEventListener("input", handlePayslipItemsInput);
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
$("exportConfigButton").addEventListener("click", exportPayslipConfig);
$("importConfigInput").addEventListener("change", importPayslipConfig);
$("downloadPayslipButton").addEventListener("click", downloadPayslip);

function todayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayMonthValue() {
  return todayValue().slice(0, 7);
}

$("salaryMonth").value = todayMonthValue();
initializePayslip();
calculate();
