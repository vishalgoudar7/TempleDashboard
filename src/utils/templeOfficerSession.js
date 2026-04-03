export const getStoredTempleOfficerUser = () => {
  try {
    const raw = localStorage.getItem("templeOfficerUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
};

export const getInitials = (name) => {
  if (!name || typeof name !== "string") return "P";
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const LAST_TEMPLE_OFFICER_ROUTE_KEY = "templeOfficerLastRoute";
const DEFAULT_TEMPLE_OFFICER_ROUTE = "/temple-officer/dashboard";
const ALLOWED_TEMPLE_OFFICER_PATHS = new Set([
  "/temple-officer/dashboard",
  "/temple-officer/requests",
  "/temple-officer/transactions",
  "/temple-officer/reports",
]);

const toNormalizedRoute = (route) => {
  const text = String(route || "").trim();
  if (!text) return "";

  try {
    const parsed = text.startsWith("http://") || text.startsWith("https://")
      ? new URL(text)
      : new URL(text.startsWith("/") ? text : `/${text}`, "https://local.app");

    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    if (!ALLOWED_TEMPLE_OFFICER_PATHS.has(pathname)) {
      return "";
    }

    return `${pathname}${parsed.search}${parsed.hash}`;
  } catch (error) {
    return "";
  }
};

export const setTempleOfficerLastRoute = (route) => {
  const normalizedRoute = toNormalizedRoute(route);
  if (!normalizedRoute) return;
  localStorage.setItem(LAST_TEMPLE_OFFICER_ROUTE_KEY, normalizedRoute);
};

export const getTempleOfficerLastRoute = () => {
  const storedRoute = localStorage.getItem(LAST_TEMPLE_OFFICER_ROUTE_KEY);
  return toNormalizedRoute(storedRoute);
};

export const getTempleOfficerLoginRedirectRoute = () =>
  getTempleOfficerLastRoute() || DEFAULT_TEMPLE_OFFICER_ROUTE;


