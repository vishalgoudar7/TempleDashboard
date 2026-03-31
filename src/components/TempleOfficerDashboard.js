import React, { useMemo, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/config";
import { getApiErrorMessage } from "../api/errors";
import {
  fetchAllPoojaRequestRows,
  fetchTempleById,
  fetchTempleOfficerDashboard,
} from "../api/templeOfficerApi";
import {
  getInitials,
  getStoredTempleOfficerUser,
  setTempleOfficerLastRoute,
} from "../utils/templeOfficerSession";
import DashboardCharts from "./DashboardCharts";
import templeNameLogo from "../asset/logi csc.png";
import sidebarBrandLogo from "../asset/NewLogo.png";
import "../Styles/TempleOfficerDashboard.css";

const ThreeDotsIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

const MenuLinesIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="20" y2="17" />
  </svg>
);

const getAssociatedTempleName = (data) => {
  if (!data) return "";

  const directCandidates = [
    data.associated_temple,
    data.associatedTemple,
    data.temple_name,
    data.templeName,
    data.temple,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (candidate && typeof candidate === "object") {
      const nestedName = candidate.name || candidate.temple_name || candidate.templeName;
      if (typeof nestedName === "string" && nestedName.trim()) {
        return nestedName.trim();
      }
    }
  }

  const nestedCandidates = [
    data.templeOfficer,
    data.profile,
    data.user,
    data.data,
    data.result,
  ];

  for (const nested of nestedCandidates) {
    if (!nested || typeof nested !== "object") continue;
    const nestedTemple = nested.temple || nested.associated_temple || nested.temple_name;

    if (typeof nestedTemple === "string" && nestedTemple.trim()) {
      return nestedTemple.trim();
    }

    if (nestedTemple && typeof nestedTemple === "object") {
      const nestedName = nestedTemple.name || nestedTemple.temple_name || nestedTemple.templeName;
      if (typeof nestedName === "string" && nestedName.trim()) {
        return nestedName.trim();
      }
    }
  }

  return "";
};
const getAssociatedTempleId = (data) => {
  if (!data || typeof data !== "object") return "";

  const directCandidates = [
    data.temple_id,
    data.templeId,
    data.associated_temple_id,
    data.associatedTempleId,
    data["temple id"],
  ];

  for (const candidate of directCandidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
      return String(candidate).trim();
    }
  }

  const templeLikeObjects = [
    data.temple,
    data.associated_temple,
    data.associatedTemple,
    data.temple_details,
    data.templeDetails,
  ];

  for (const templeLikeObject of templeLikeObjects) {
    if (!templeLikeObject || typeof templeLikeObject !== "object") continue;
    const candidateValues = [
      templeLikeObject.temple_id,
      templeLikeObject.templeId,
      templeLikeObject.id,
      templeLikeObject.code,
      templeLikeObject.temple_code,
    ];

    for (const candidate of candidateValues) {
      if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
        return String(candidate).trim();
      }
    }
  }

  const nestedCandidates = [data.templeOfficer, data.profile, data.user, data.data, data.result];

  for (const nested of nestedCandidates) {
    const nestedId = getAssociatedTempleId(nested);
    if (nestedId) {
      return nestedId;
    }
  }

  return "";
};

const toAbsoluteMediaUrl = (value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  if (/^https?:\/\//i.test(rawValue) || rawValue.startsWith("data:image/")) {
    return rawValue;
  }

  try {
    return new URL(rawValue, API_BASE_URL).href;
  } catch {
    return rawValue;
  }
};

const getImageValueFromObject = (value) => {
  if (!value || typeof value !== "object") return "";

  const objectCandidates = [
    value.image,
    value.img,
    value.url,
    value.src,
    value.path,
    value.photo,
    value.thumbnail,
    value.logo,
  ];

  for (const candidate of objectCandidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
      return String(candidate).trim();
    }
  }

  return "";
};

const getTempleImageUrl = (data) => {
  if (!data || typeof data !== "object") return "";

  if (Array.isArray(data.images)) {
    for (const imageItem of data.images) {
      if (typeof imageItem === "string" && imageItem.trim()) {
        return toAbsoluteMediaUrl(imageItem.trim());
      }

      const galleryImageUrl = getImageValueFromObject(imageItem);
      if (galleryImageUrl) {
        return toAbsoluteMediaUrl(galleryImageUrl);
      }
    }
  }

  const directCandidates = [
    data.image,
    data.img,
    data.temple_img,
    data.temple_image,
    data.templeImage,
    data.temple_image_url,
    data.templeImageUrl,
    data.image_url,
    data.photo,
    data.logo,
    data.thumbnail,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return toAbsoluteMediaUrl(candidate.trim());
    }
    if (candidate && typeof candidate === "object") {
      const objectUrl = getImageValueFromObject(candidate);
      if (objectUrl) {
        return toAbsoluteMediaUrl(objectUrl);
      }
    }
  }

  const nestedCandidates = [data.temple, data.data, data.result, data.details];

  for (const nested of nestedCandidates) {
    const nestedImage = getTempleImageUrl(nested);
    if (nestedImage) {
      return nestedImage;
    }
  }

  return "";
};

const stripHtml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
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

const extractTempleIdFromPoojaRow = (row) => {
  if (Array.isArray(row)) {
    const cleaned = row.map((cell) => stripHtml(cell));
    const offset = cleaned.length >= 14 ? 1 : 0;
    const templeIdFromArray = cleaned[offset + 1] || "";
    return String(templeIdFromArray).trim();
  }

  const templeIdCandidates = [
    row?.temple?.id,
    row?.temple?.temple_id,
    row?.temple?.templeId,
    row?.temple_id,
    row?.templeId,
    row?.associated_temple_id,
    pickField(row, ["temple_id", "temple_code", "associated_temple_id"]),
  ];

  for (const candidate of templeIdCandidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
      return String(candidate).trim();
    }
  }

  return "";
};

const extractTempleIdFromPoojaRows = (rows) => {
  if (!Array.isArray(rows)) return "";

  for (const row of rows) {
    const templeId = extractTempleIdFromPoojaRow(row);
    if (templeId) {
      return templeId;
    }
  }

  return "";
};

const normalizeStatus = (value) => stripHtml(value).toLowerCase();
const toCanonicalStatus = (value) => normalizeStatus(value);
const parseFlexibleDate = (value) => {
  const text = stripHtml(value);
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const dmy = text.match(/(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const DASHBOARD_STATUS_CARDS = [
  {
    key: "todayReceived",
    label: "Today Received Orders",
    className: "card-today-received",
    iconClass: "bi-calendar-check",
    filterStatus: "",
    recentDays: 3,
    helperText: "Open last 3 days order list",
  },
  {
    key: "pending",
    label: "Pending Orders",
    className: "card-pending",
    iconClass: "bi-hourglass-split",
    filterStatus: "pending",
    helperText: "Open pending status list",
  },
  {
    key: "processing",
    label: "Processing Requests",
    className: "card-processing",
    iconClass: "bi-arrow-repeat",
    filterStatus: "processing",
    helperText: "Open processing status list",
  },
  {
    key: "total",
    label: "Total Pooja Requests",
    className: "card-total",
    iconClass: "bi-list-check",
    filterStatus: "",
    helperText: "View all request entries",
  },
  {
    key: "dispatched",
    label: "Dispatched Requests",
    className: "card-dispatched",
    iconClass: "bi-truck",
    filterStatus: "dispatched",
    helperText: "Open dispatched status list",
  },
  {
    key: "completed",
    label: "Completed Requests",
    className: "card-completed",
    iconClass: "bi-check-circle",
    filterStatus: "completed",
    helperText: "Open completed status list",
  },
];

const extractRowStatus = (row) => {
  if (Array.isArray(row)) {
    const cleaned = row.map((cell) => stripHtml(cell));
    const offset = cleaned.length >= 14 ? 1 : 0;
    return toCanonicalStatus(cleaned[offset + 7] || "");
  }

  return toCanonicalStatus(pickField(row, ["status", "request_status", "state"]));
};

const extractRowCreatedDate = (row) => {
  if (Array.isArray(row)) {
    const cleaned = row.map((cell) => stripHtml(cell));
    const offset = cleaned.length >= 14 ? 1 : 0;
    return parseFlexibleDate(cleaned[offset + 10] || "");
  }

  return parseFlexibleDate(
    pickField(row, ["created_at", "created_on", "requested_at", "date", "created"])
  );
};

const getPoojaCounts = (rows) => {
  const today = new Date();
  const counts = {
    total: rows.length,
    accepted: 0,
    pending: 0,
    processing: 0,
    dispatched: 0,
    completed: 0,
    todayReceived: 0,
  };

  rows.forEach((row) => {
    const status = extractRowStatus(row);
    if (Object.prototype.hasOwnProperty.call(counts, status)) {
      counts[status] += 1;
    }

    const createdDate = extractRowCreatedDate(row);
    if (createdDate && isSameDay(createdDate, today)) {
      counts.todayReceived += 1;
    }
  });

  return counts;
};

const formatCount = (value) => Number(value || 0).toLocaleString("en-IN");
const EMPTY_POOJA_COUNTS = {
  total: 0,
  accepted: 0,
  pending: 0,
  processing: 0,
  dispatched: 0,
  completed: 0,
  todayReceived: 0,
};

const toCountValue = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return null;

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue) || numericValue < 0) return null;
  return Math.floor(numericValue);
};

const pickCountFromSource = (source, keys) => {
  if (!source || typeof source !== "object") return null;

  for (const key of keys) {
    const countValue = toCountValue(source[key]);
    if (countValue !== null) {
      return countValue;
    }
  }

  return null;
};

const getCountsFromDashboardPayload = (payload) => {
  const sources = [
    payload,
    payload?.data,
    payload?.result,
    payload?.stats,
    payload?.counts,
    payload?.summary,
    payload?.dashboard,
  ];

  const countMap = {
    total: ["total", "total_count", "total_requests", "total_pooja_requests", "pooja_requests_total"],
    accepted: ["accepted", "accepted_count", "accepted_requests"],
    pending: ["pending", "pending_count", "pending_requests"],
    processing: ["processing", "processing_count", "processing_requests", "in_progress"],
    dispatched: ["dispatched", "dispatched_count", "dispatched_requests"],
    completed: ["completed", "completed_count", "completed_requests", "success_count"],
    todayReceived: [
      "today_received",
      "todayReceived",
      "today_count",
      "today_requests",
      "today_received_orders",
    ],
  };

  const extractedCounts = {};
  let hasAnyCount = false;

  for (const [countKey, candidateKeys] of Object.entries(countMap)) {
    for (const source of sources) {
      const countValue = pickCountFromSource(source, candidateKeys);
      if (countValue !== null) {
        extractedCounts[countKey] = countValue;
        hasAnyCount = true;
        break;
      }
    }
  }

  if (!hasAnyCount) {
    return null;
  }

  return {
    ...EMPTY_POOJA_COUNTS,
    ...extractedCounts,
  };
};

const TempleOfficerDashboard = () => {
  const storedUser = getStoredTempleOfficerUser();
  const storedTempleId = getAssociatedTempleId(storedUser);
  const [dashboardData, setDashboardData] = useState({});
  const [templeImageUrl, setTempleImageUrl] = useState("");
  const [poojaCounts, setPoojaCounts] = useState(EMPTY_POOJA_COUNTS);
  const [poojaRows, setPoojaRows] = useState([]);
  const [isChartsLoading, setIsChartsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const templeSearchText = storedUser?.templeName || storedUser?.templeAssociated || "";
  const activeSidebarPage = useMemo(() => {
    const view = new URLSearchParams(location.search).get("view");
    return view === "user-pages" ? "userPages" : "dashboard";
  }, [location.search]);

  useEffect(() => {
    const token = localStorage.getItem("templeOfficerToken");
    if (!token) {
      setTempleOfficerLastRoute("/temple-officer/dashboard");
      navigate("/"); // redirect to login if not logged in
      return;
    }

    let isMounted = true;

    const loadTempleImage = async (templeId) => {
      if (!templeId) {
        setTempleImageUrl("");
        return;
      }

      try {
        const templeResponse = await fetchTempleById(templeId);
        if (!isMounted) return;
        setTempleImageUrl(getTempleImageUrl(templeResponse?.data));
      } catch (templeError) {
        console.error("Unable to load temple image", templeError);
        if (!isMounted) return;
        setTempleImageUrl("");
      }
    };

    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dashboardResponse = await fetchTempleOfficerDashboard();
        if (!isMounted) return;

        const dashboardPayload = dashboardResponse?.data || {};
        setDashboardData(dashboardPayload);
        const dashboardCounts = getCountsFromDashboardPayload(dashboardPayload);
        if (dashboardCounts) {
          setPoojaCounts(dashboardCounts);
        }

        const templeIdFromDashboard = storedTempleId || getAssociatedTempleId(dashboardPayload);
        void loadTempleImage(templeIdFromDashboard);
        setIsLoading(false);
        setIsChartsLoading(true);

        const poojaRows = await fetchAllPoojaRequestRows({
          search: templeSearchText,
          size: 100,
          maxPages: 50,
          concurrency: 6,
        });
        if (!isMounted) return;
        setPoojaRows(poojaRows);
        setPoojaCounts(getPoojaCounts(poojaRows));
        setIsChartsLoading(false);

        if (!templeIdFromDashboard) {
          const templeIdFromPoojaList = extractTempleIdFromPoojaRows(poojaRows);
          if (templeIdFromPoojaList) {
            void loadTempleImage(templeIdFromPoojaList);
          }
        }
      } catch (error) {
        console.error(error);
        if (!isMounted) return;
        setPoojaRows([]);
        setIsChartsLoading(false);
        setError(getApiErrorMessage(error, "Error loading dashboard"));
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [navigate, templeSearchText, storedTempleId]);

  useEffect(() => {
    setTempleOfficerLastRoute(`${location.pathname}${location.search}${location.hash}`);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    const loginMessage = location.state?.loginMessage;
    if (typeof loginMessage === "string" && loginMessage.trim()) {
      setSuccessMessage(loginMessage.trim());
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timeoutId = setTimeout(() => {
      setSuccessMessage("");
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [successMessage]);

  const handleLogout = () => {
    localStorage.removeItem("templeOfficerToken");
    localStorage.removeItem("templeOfficerUser");
    localStorage.removeItem("firebaseIdToken");
    localStorage.removeItem("templeOfficerPhone");
    localStorage.removeItem("portalSessionAuth");
    navigate("/");
  };

  const handleOpenRequestList = ({ status = "", recentDays = 0 } = {}) => {
    const query = new URLSearchParams();
    if (status) {
      query.set("status", status);
    }
    if (Number.isInteger(recentDays) && recentDays > 0) {
      query.set("recent_days", String(recentDays));
    }
    const queryText = query.toString();
    navigate(`/temple-officer/requests${queryText ? `?${queryText}` : ""}`);
  };

  const handleCardKeyDown = (event, card) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenRequestList({ status: card.filterStatus, recentDays: card.recentDays || 0 });
    }
  };

  const handleOpenUserPages = () => {
    navigate("/temple-officer/dashboard?view=user-pages");
    if (window.innerWidth <= 900) {
      setSidebarOpen(false);
    }
  };

  const handleOpenDashboardPage = () => {
    navigate("/temple-officer/dashboard");
    if (window.innerWidth <= 900) {
      setSidebarOpen(false);
    }
  };

  if (error) return <div className="state-text">Error: {error}</div>;
  if (isLoading) return <div className="state-text">Loading dashboard...</div>;
  const templeName =
    storedUser?.templeName ||
    storedUser?.templeAssociated ||
    getAssociatedTempleName(dashboardData) ||
    "";
  const username = storedUser?.username || "Temple Officer Panel";
  const email = storedUser?.email || "Temple Dashboard";
  const userId = storedUser?.userId ? `ID: ${storedUser.userId}` : "Temple Dashboard";
  const avatarText = getInitials(username);

  return (
    <div className={`dashboard-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <aside className="sidebar-menu">
        <div className="sidebar-top">
          <div className="sidebar-brand-wrap">
            <img src={sidebarBrandLogo} alt="Devalayas" className="sidebar-brand-image" />
          </div>
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? (
              <ThreeDotsIcon className="sidebar-icon-dots" />
            ) : (
              <MenuLinesIcon className="sidebar-icon-lines" />
            )}
          </button>
        </div>

        <div className="sidebar-profile">
          <div className="profile-avatar">{avatarText}</div>
          <div>
            <div className="profile-name">{username}</div>
            <div className="profile-role">{userId}</div>
          </div>
        </div>

        <div className="sidebar-nav-title">Navigation</div>
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-nav-btn ${activeSidebarPage === "dashboard" ? "active" : ""}`}
            data-label="Dashboard"
            onClick={handleOpenDashboardPage}
          >
            <span className="sidebar-nav-icon">DB</span>
            <span className="sidebar-nav-text">Dashboard</span>
          </button>
          <button
            type="button"
            className="sidebar-nav-btn"
            onClick={() => navigate("/temple-officer/requests")}
            data-label="Pooja Requests"
          >
            <span className="sidebar-nav-icon">PR</span>
            <span className="sidebar-nav-text">Pooja Requests</span>
          </button>
          <button
            type="button"
            className="sidebar-nav-btn"
            data-label="Transactions"
            onClick={() => navigate("/temple-officer/transactions")}
          >
            <span className="sidebar-nav-icon">TR</span>
            <span className="sidebar-nav-text">Transactions</span>
          </button>
          <button type="button" className="sidebar-nav-btn" data-label="Reports">
            <span className="sidebar-nav-icon">RP</span>
            <span className="sidebar-nav-text">Reports</span>
          </button>
          <button
            type="button"
            className={`sidebar-nav-btn ${activeSidebarPage === "userPages" ? "active" : ""}`}
            data-label="User Pages"
            onClick={handleOpenUserPages}
          >
            <span className="sidebar-nav-icon">UP</span>
            <span className="sidebar-nav-text">User Pages</span>
          </button>
          <button type="button" className="sidebar-nav-btn" data-label="Documentation">
            <span className="sidebar-nav-icon">DC</span>
            <span className="sidebar-nav-text">Documentation</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-profile">
            <div className="profile-avatar">{avatarText}</div>
            <div className="sidebar-footer-text">
              <div className="profile-name">{username}</div>
              <div className="profile-role">{email}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="dashboard-container">
        {activeSidebarPage !== "userPages" && (
          <div className="dashboard-top-navbar">
            <div className="dashboard-top-navbar-center">
              <img
                src={templeNameLogo}
                alt="Devalayas logo"
                className="dashboard-top-navbar-name-logo"
                loading="lazy"
              />
              <h2 className="dashboard-top-navbar-temple-name">
                {templeName || "Temple Name"}
              </h2>
            </div>
            <div className="dashboard-top-navbar-right">
              {templeImageUrl ? (
                <img
                  src={templeImageUrl}
                  alt={templeName ? `${templeName} temple` : "Temple image"}
                  className="dashboard-top-navbar-image"
                  loading="lazy"
                />
              ) : (
                <div className="dashboard-top-navbar-image dashboard-top-navbar-image-placeholder">
                  No Image
                </div>
              )}
            </div>
          </div>
        )}

        {(activeSidebarPage !== "userPages" || !sidebarOpen) && (
          <div className="dashboard-header">
            <div className="dashboard-header-left">
              {!sidebarOpen && (
                <button
                  type="button"
                  className="sidebar-open-btn"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open sidebar"
                >
                  <MenuLinesIcon className="sidebar-icon-lines" />
                  <span className="sr-only">Open menu</span>
                </button>
              )}
              <div>
                {activeSidebarPage !== "userPages" && (
                  <p className="dashboard-title">Temple Officer Dashboard</p>
                )}
              </div>
            </div>
          </div>
        )}

        {successMessage && <div className="success-banner">{successMessage}</div>}

        {activeSidebarPage === "dashboard" ? (
          <div className="dashboard-cards row g-3 mt-1">
            {DASHBOARD_STATUS_CARDS.map((card) => (
              <div key={card.key} className="col-12 col-md-6 col-xl-4">
                <div
                  className={`dashboard-stat-card ${card.className} card-clickable`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenRequestList({ status: card.filterStatus, recentDays: card.recentDays || 0 })}
                  onKeyDown={(event) => handleCardKeyDown(event, card)}
                >
                  <div className="dashboard-stat-card-top">
                    <h3>{card.label}</h3>
                    <span className="dashboard-stat-card-icon" aria-hidden="true">
                      <i className={`bi ${card.iconClass}`} />
                    </span>
                  </div>
                  <p>{formatCount(poojaCounts[card.key])}</p>
                  <span className="card-meta">{card.helperText}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <section id="user-pages-charts" style={{ paddingBottom: 96 }}>
            <DashboardCharts rows={poojaRows} isLoading={isChartsLoading} />
          </section>
        )}

        <button onClick={handleLogout} className="logout-btn dashboard-logout-floating">Logout</button>
      </div>
    </div>
  );
};

export default TempleOfficerDashboard;

