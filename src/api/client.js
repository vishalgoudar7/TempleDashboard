import axios from "axios";
import { API_BASE_URL } from "./config";

const AUTH_SKIP_HEADER = "X-Skip-Auth";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("templeOfficerToken");
  config.headers = config.headers || {};

  const shouldSkipAuth = Boolean(config.headers[AUTH_SKIP_HEADER]);
  if (shouldSkipAuth) {
    delete config.headers[AUTH_SKIP_HEADER];
    return config;
  }

  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }

  return config;
});


