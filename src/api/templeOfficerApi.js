import { apiClient } from "./client";

const TEMPLE_OFFICER_LOGIN_URL = "/api/v1/auth/temple-officer/";
const TEMPLE_OFFICER_DASHBOARD_URL = "/api/v1/pujari/dashboard/";
const POOJA_REQUEST_LIST_URL = "/api/v1/devotee/pooja_request/list/";
const DEVOTEE_TEMPLE_URL = "/api/v1/devotee/temple";
const POOJA_REQUEST_BULK_UPDATE_STATUS_URL = "https://beta.devalayas.com/api/v1/request/bulk-update-status/";

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

export const fetchPoojaRequestList = ({ page = 1, size = 25, status = "", search = "" } = {}) =>
  apiClient.get(
    `${POOJA_REQUEST_LIST_URL}?page=${page}&size=${size}${
      status
        ? `&status=${encodeSearchForUrl(status)}&request_status=${encodeSearchForUrl(status)}`
        : ""
    }${search ? `&search=${encodeSearchForUrl(search)}` : ""}`
  );

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

  const stringIds = Array.isArray(requestIds)
    ? [...new Set(requestIds.map((id) => String(id).trim()).filter(Boolean))]
    : [];

  if (!integerIds.length && !stringIds.length) {
    throw new Error("No valid request IDs selected for status update.");
  }

  const payloads = [
    { request_ids: integerIds, status },
    { request_ids: stringIds, status },
    { request_id: integerIds, status },
    { ids: integerIds, status },
  ].filter((payload) => Array.isArray(Object.values(payload)[0]) && Object.values(payload)[0].length > 0);

  let latestError = null;

  for (let payloadIndex = 0; payloadIndex < payloads.length; payloadIndex += 1) {
    const payload = payloads[payloadIndex];

    try {
      return await apiClient.options(POOJA_REQUEST_BULK_UPDATE_STATUS_URL, {
        data: payload,
      });
    } catch (error) {
      latestError = error;
      const statusCode = error?.response?.status;
      const isValidationError = statusCode === 400;

      if (isValidationError && payloadIndex < payloads.length - 1) {
        continue;
      }

      throw error;
    }
  }

  throw latestError || new Error("Unable to update status.");
};
