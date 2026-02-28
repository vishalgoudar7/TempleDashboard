import axios from "axios";

const extractFromPayload = (payload) => {
  if (!payload || typeof payload !== "object") return "";

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const firstError = payload.errors[0];
    const firstMessage = firstError?.message;
    if (Array.isArray(firstMessage) && firstMessage.length > 0 && typeof firstMessage[0] === "string") {
      return firstMessage[0];
    }
    if (typeof firstMessage === "string" && firstMessage.trim()) {
      return firstMessage.trim();
    }
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  const keys = ["detail", "error", "non_field_errors", "email", "username", "password"];
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
      return value[0];
    }
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

export const getApiErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again."
) => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;
    const payloadMessage = extractFromPayload(payload);
    if (payloadMessage) return payloadMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};
