import { apiClient } from "./client";

const TEMPLE_OFFICER_LOGIN_URL = "/api/v1/auth/temple-officer/";
const TEMPLE_OFFICER_DASHBOARD_URL = "/api/v1/pujari/dashboard/";
const POOJA_REQUEST_LIST_URL = "/api/v1/devotee/pooja_request/list/";
const EXPORT_POOJA_REPORT_URL = "/api/v1/pdf/export-pooja-report/";
const DEVOTEE_TEMPLE_URL = "/api/v1/devotee/temple";
const POOJA_REQUEST_BULK_UPDATE_STATUS_URL = "/api/v1/request/bulk-update-status/";
const BULK_STATUS_CHOICES = new Set(["Accepted", "Processing", "Dispatched", "Completed"]);

const templeOfficerLoginRequest = (credentials) =>
  apiClient.post(TEMPLE_OFFICER_LOGIN_URL, credentials, {
    headers: {
      "X-Skip-Auth": "1",
    },
  });

export const loginTempleOfficer = async ({ email, password }) => {
  try {
    return await templeOfficerLoginRequest({ email, password });
  } catch (error) {
    if (error?.response?.status === 400) {
      return templeOfficerLoginRequest({ username: email, password });
    }
    throw error;
  }
};

export const fetchTempleOfficerDashboard = () =>
  apiClient.get(TEMPLE_OFFICER_DASHBOARD_URL);

export const exportPoojaReportPdf = ({ temple, from_date, to_date }) =>
  apiClient.post(
    EXPORT_POOJA_REPORT_URL,
    { temple, from_date, to_date },
    {
      responseType: "blob",
    }
  );

export const fetchTempleById = async (templeId) => {
  const normalizedTempleId = String(templeId || "").trim();

  if (!normalizedTempleId) {
    throw new Error("Temple ID is required.");
  }

  const encodedTempleId = encodeURIComponent(normalizedTempleId);

  try {
    return await apiClient.get(`${DEVOTEE_TEMPLE_URL}/${encodedTempleId}/`);
  } catch (error) {
    if (error?.response?.status === 404) {
      return apiClient.get(`${DEVOTEE_TEMPLE_URL}/${encodedTempleId}`);
    }
    throw error;
  }
};

const encodeSearchForUrl = (value) =>
  encodeURIComponent(value)
    .replace(/%20/g, "%20")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");

const extractPoojaRows = (rawData) => {
  if (Array.isArray(rawData)) return rawData;
  if (Array.isArray(rawData?.data)) return rawData.data;
  if (Array.isArray(rawData?.results)) return rawData.results;
  if (Array.isArray(rawData?.orders)) return rawData.orders;
  if (Array.isArray(rawData?.data?.data)) return rawData.data.data;
  if (Array.isArray(rawData?.data?.results)) return rawData.data.results;
  return [];
};

const extractPoojaContainer = (payload) =>
  payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
    ? payload.data
    : payload;

const getTotalPagesFromContainer = (container) => {
  const totalPages = Number(
    container?.total_pages || container?.pages || container?.totalPages || container?.last_page || 0
  );
  return Number.isFinite(totalPages) && totalPages > 0 ? Math.floor(totalPages) : 0;
};

export const fetchPoojaRequestList = async ({ page = 1, size = 25, status = "", search = "" } = {}) => {
  const response = await apiClient.get(
    `${POOJA_REQUEST_LIST_URL}?page=${page}&size=${size}${
      status
        ? `&status=${encodeSearchForUrl(status)}&request_status=${encodeSearchForUrl(status)}`
        : ""
    }${search ? `&search=${encodeSearchForUrl(search)}` : ""}`
  );

  return response;
};

export const fetchAllPoojaRequestRows = async ({
  search = "",
  status = "",
  size = 100,
  maxPages = 100,
  concurrency = 6,
} = {}) => {
  const safePageSize = Number.isInteger(size) && size > 0 ? size : 100;
  const safeMaxPages = Number.isInteger(maxPages) && maxPages > 0 ? maxPages : 100;
  const safeConcurrency = Number.isInteger(concurrency) && concurrency > 0 ? concurrency : 4;

  const firstResponse = await fetchPoojaRequestList({
    page: 1,
    size: safePageSize,
    status,
    search,
  });
  const firstPayload = firstResponse?.data;
  const firstRows = extractPoojaRows(firstPayload);
  const firstContainer = extractPoojaContainer(firstPayload);
  const reportedTotalPages = getTotalPagesFromContainer(firstContainer);
  const totalPages = reportedTotalPages ? Math.min(reportedTotalPages, safeMaxPages) : 0;

  if (!firstRows.length) {
    return [];
  }

  if (totalPages <= 1) {
    if (!totalPages && firstContainer?.next) {
      const allRows = [...firstRows];
      for (let page = 2; page <= safeMaxPages; page += 1) {
        const response = await fetchPoojaRequestList({
          page,
          size: safePageSize,
          status,
          search,
        });
        const payload = response?.data;
        const pageRows = extractPoojaRows(payload);
        if (!pageRows.length) break;

        allRows.push(...pageRows);
        const container = extractPoojaContainer(payload);
        if (!container?.next && pageRows.length < safePageSize) break;
      }
      return allRows;
    }

    return firstRows;
  }

  const rowsByPage = new Map([[1, firstRows]]);
  const pages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
  const workerCount = Math.min(safeConcurrency, pages.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < pages.length) {
      const pageIndex = cursor;
      cursor += 1;
      const page = pages[pageIndex];
      const response = await fetchPoojaRequestList({
        page,
        size: safePageSize,
        status,
        search,
      });
      rowsByPage.set(page, extractPoojaRows(response?.data));
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const allRows = [];
  for (let page = 1; page <= totalPages; page += 1) {
    const pageRows = rowsByPage.get(page);
    if (Array.isArray(pageRows) && pageRows.length) {
      allRows.push(...pageRows);
    }
  }

  return allRows;
};

export const bulkUpdatePoojaRequestStatus = async ({ requestIds, status }) => {
  const integerIds = Array.isArray(requestIds)
    ? [
      ...new Set(
        requestIds
          .map((id) => Number.parseInt(String(id), 10))
          .filter((id) => Number.isInteger(id) && id > 0)
      ),
    ]
    : [];

  if (!integerIds.length) {
    throw new Error("No valid request IDs selected for status update.");
  }

  if (!BULK_STATUS_CHOICES.has(String(status || "").trim())) {
    throw new Error("Invalid status. Allowed values are Accepted, Processing, Dispatched, Completed.");
  }

  return apiClient.post(POOJA_REQUEST_BULK_UPDATE_STATUS_URL, {
    status: String(status).trim(),
    request_ids: integerIds,
  });
};
