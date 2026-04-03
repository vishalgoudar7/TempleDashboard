const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const stripHtml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const pickField = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const parseDate = (value) => {
  const text = stripHtml(value);
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getRowDate = (row) => {
  if (Array.isArray(row)) {
    const cleaned = row.map((cell) => stripHtml(cell));
    const offset = cleaned.length >= 14 ? 1 : 0;
    return parseDate(cleaned[offset + 10] || cleaned[offset + 9] || "");
  }

  return (
    parseDate(pickField(row, ["created_at", "created_on", "requested_at"])) ||
    parseDate(pickField(row, ["pooja_date", "puja_date", "date"]))
  );
};

const getRowAmount = (row) => {
  if (Array.isArray(row)) {
    return toNumber(row[row.length - 1]);
  }

  return toNumber(
    row?.total_cost ??
      row?.transaction?.total_cost ??
      row?.cost ??
      row?.amount ??
      pickField(row, ["total_cost", "cost", "amount"])
  );
};

const getRowStatus = (row) => {
  if (Array.isArray(row)) {
    const cleaned = row.map((cell) => stripHtml(cell));
    const offset = cleaned.length >= 14 ? 1 : 0;
    return stripHtml(cleaned[offset + 7]).toLowerCase();
  }

  return stripHtml(pickField(row, ["status", "request_status", "state"])).toLowerCase();
};

const toStatusBucket = (statusText) => {
  if (!statusText) return "Processing";
  if (statusText.includes("complete")) return "Completed";
  if (statusText.includes("pending")) return "Pending";
  if (statusText.includes("accept") || statusText.includes("process") || statusText.includes("dispatch")) {
    return "Processing";
  }
  if (
    statusText.includes("cancel") ||
    statusText.includes("expire") ||
    statusText.includes("reject") ||
    statusText.includes("fail")
  ) {
    return "Cancelled";
  }
  return "Processing";
};

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const buildLast12Months = (anchorDate) => {
  const anchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const months = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthDate = new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1);
    months.push({
      key: getMonthKey(monthDate),
      label: MONTH_LABELS[monthDate.getMonth()],
    });
  }

  return months;
};

export const buildDashboardDataFromPoojaRows = (rows) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const rowDates = safeRows.map((row) => getRowDate(row)).filter(Boolean);
  const latestDate = rowDates.length
    ? rowDates.reduce((latest, current) => (current > latest ? current : latest), rowDates[0])
    : new Date();
  const currentYear = latestDate.getFullYear();

  const monthBuckets = buildLast12Months(latestDate);
  const monthlyRevenueMap = new Map(monthBuckets.map((month) => [month.key, 0]));
  const monthlyOrderMap = new Map(monthBuckets.map((month) => [month.key, 0]));
  const yearlyLabels = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
  const yearlyRevenueMap = new Map(yearlyLabels.map((year) => [year, 0]));
  const weekdayMap = new Map(DAY_LABELS.map((day) => [day, 0]));
  const statusCounts = {
    Completed: 0,
    Pending: 0,
    Processing: 0,
    Cancelled: 0,
  };

  safeRows.forEach((row) => {
    const amount = getRowAmount(row);
    const rowDate = getRowDate(row);
    const normalizedStatus = toStatusBucket(getRowStatus(row));
    statusCounts[normalizedStatus] += 1;

    if (rowDate) {
      const monthKey = getMonthKey(rowDate);
      if (monthlyRevenueMap.has(monthKey)) {
        monthlyRevenueMap.set(monthKey, monthlyRevenueMap.get(monthKey) + amount);
        monthlyOrderMap.set(monthKey, monthlyOrderMap.get(monthKey) + 1);
      }

      if (yearlyRevenueMap.has(rowDate.getFullYear())) {
        yearlyRevenueMap.set(rowDate.getFullYear(), yearlyRevenueMap.get(rowDate.getFullYear()) + amount);
      }

      const dayIndex = rowDate.getDay();
      const dayLabel = DAY_LABELS[(dayIndex + 6) % 7];
      weekdayMap.set(dayLabel, weekdayMap.get(dayLabel) + 1);
    }
  });

  return {
    monthlyRevenue: {
      labels: monthBuckets.map((month) => month.label),
      data: monthBuckets.map((month) => Math.round(monthlyRevenueMap.get(month.key))),
    },
    ordersByStatus: [
      { name: "Completed", value: statusCounts.Completed },
      { name: "Pending", value: statusCounts.Pending },
      { name: "Processing", value: statusCounts.Processing },
      { name: "Cancelled", value: statusCounts.Cancelled },
    ],
    monthlyOrders: {
      labels: monthBuckets.map((month) => month.label),
      data: monthBuckets.map((month) => monthlyOrderMap.get(month.key)),
    },
    yearlyRevenue: {
      labels: yearlyLabels,
      data: yearlyLabels.map((year) => Math.round(yearlyRevenueMap.get(year))),
    },
    dailyOrders: {
      labels: DAY_LABELS,
      data: DAY_LABELS.map((day) => weekdayMap.get(day)),
    },
  };
};
