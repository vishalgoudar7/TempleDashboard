import { apiClient } from "./client";

const TEMPLE_OFFICER_LOGIN_URL = "/api/v1/auth/temple-officer/";
const TEMPLE_OFFICER_DASHBOARD_URL = "/api/v1/pujari/dashboard/";
const POOJA_REQUEST_LIST_URL = "/api/v1/devotee/pooja_request/list/";

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

const encodeSearchForUrl = (value) =>
  encodeURIComponent(value)
    .replace(/%20/g, "%20")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");

export const fetchPoojaRequestList = ({ page = 1, search = "" } = {}) =>
  apiClient.get(
    `${POOJA_REQUEST_LIST_URL}?page=${page}${
      search ? `&search=${encodeSearchForUrl(search)}` : ""
    }`
  );

