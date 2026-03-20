import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/config";
import { getApiErrorMessage } from "../api/errors";
import { fetchPoojaRequestList, fetchTempleById, fetchTempleOfficerDashboard } from "../api/templeOfficerApi";
import { getInitials, getStoredTempleOfficerUser } from "../utils/templeOfficerSession";
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

const extractPoojaRows = (rawData) => {
  if (Array.isArray(rawData)) return rawData;
  if (Array.isArray(rawData?.data)) return rawData.data;
  if (Array.isArray(rawData?.results)) return rawData.results;
  if (Array.isArray(rawData?.orders)) return rawData.orders;
  if (Array.isArray(rawData?.data?.data)) return rawData.data.data;
  if (Array.isArray(rawData?.data?.results)) return rawData.data.results;
  return [];
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
    filterStatus: "",
    recentDays: 3,
    helperText: "Open last 3 days order list",
  },
  {
    key: "accepted",
    label: "Accepted Requests",
    className: "card-accepted",
    filterStatus: "accepted",
    helperText: "Open accepted status list",
  },
  {
    key: "processing",
    label: "Processing Requests",
    className: "card-processing",
    filterStatus: "processing",
    helperText: "Open processing status list",
  },
  {
    key: "total",
    label: "Total Pooja Requests",
    className: "card-total",
    filterStatus: "",
    helperText: "View all request entries",
  },
  {
    key: "dispatched",
    label: "Dispatched Requests",
    className: "card-dispatched",
    filterStatus: "dispatched",
    helperText: "Open dispatched status list",
  },
  {
    key: "completed",
    label: "Completed Requests",
    className: "card-completed",
    filterStatus: "completed",
    helperText: "Open completed status list",
  },
];

const extractRowStatus = (row) => {
  if (Array.isArray(row)) {
    const cleaned = row.map((cell) => stripHtml(cell));
    const offset = cleaned.length >= 14 ? 1 : 0;
    return normalizeStatus(cleaned[offset + 7] || "");
  }

  return normalizeStatus(pickField(row, ["status", "request_status", "state"]));
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

const fetchAllPoojaRequests = async (search = "") => {
  const allRows = [];
  let page = 1;
  const maxPages = 50;

  while (page <= maxPages) {
    const response = await fetchPoojaRequestList({ page, search });
    const payload = response?.data;
    const pageRows = extractPoojaRows(payload);

    if (!pageRows.length) {
      break;
    }

    allRows.push(...pageRows);

    const container =
      payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
        ? payload.data
        : payload;

    const totalPages = Number(container?.total_pages || container?.pages || container?.totalPages || 0);
    const currentPage = Number(container?.current_page || container?.page || page);
    const hasNext = Boolean(container?.next);

    if (hasNext) {
      page += 1;
      continue;
    }

    if (totalPages && currentPage < totalPages) {
      page = currentPage + 1;
      continue;
    }

    break;
  }

  return allRows;
};

const TempleOfficerDashboard = () => {
  const storedUser = getStoredTempleOfficerUser();
  const storedTempleId = getAssociatedTempleId(storedUser);
  const [dashboardData, setDashboardData] = useState({});
  const [templeImageUrl, setTempleImageUrl] = useState("");
  const [poojaCounts, setPoojaCounts] = useState({
    total: 0,
    accepted: 0,
    processing: 0,
    dispatched: 0,
    completed: 0,
    todayReceived: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const templeSearchText = storedUser?.templeName || storedUser?.templeAssociated || "";

  useEffect(() => {
    const token = localStorage.getItem("templeOfficerToken");
    if (!token) {
      navigate("/"); // redirect to login if not logged in
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [dashboardResponse, poojaRows] = await Promise.all([
          fetchTempleOfficerDashboard(),
          fetchAllPoojaRequests(templeSearchText),
        ]);
        const dashboardPayload = dashboardResponse?.data || {};
        setDashboardData(dashboardPayload);
        setPoojaCounts(getPoojaCounts(poojaRows));

        const templeIdFromPoojaList = extractTempleIdFromPoojaRows(poojaRows);
        const templeId =
          templeIdFromPoojaList || storedTempleId || getAssociatedTempleId(dashboardPayload);

        if (!templeId) {
          setTempleImageUrl("");
          return;
        }

        try {
          const templeResponse = await fetchTempleById(templeId);
          setTempleImageUrl(getTempleImageUrl(templeResponse?.data));
        } catch (templeError) {
          console.error("Unable to load temple image", templeError);
          setTempleImageUrl("");
        }
      } catch (error) {
        console.error(error);
        setError(getApiErrorMessage(error, "Error loading dashboard"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate, templeSearchText, storedTempleId]);

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
            <div className="sidebar-brand-logo">D</div>
            <h3 className="sidebar-brand">Devalayas</h3>
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
          <button type="button" className="sidebar-nav-btn active" data-label="Dashboard">
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
          <button type="button" className="sidebar-nav-btn" data-label="User Pages">
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
        <div className="dashboard-top-navbar">
          <div className="dashboard-top-navbar-center">
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
              <p className="dashboard-title">Temple Officer Dashboard</p>
            </div>
          </div>
        </div>

        {successMessage && <div className="success-banner">{successMessage}</div>}

        <div className="dashboard-cards">
          {DASHBOARD_STATUS_CARDS.map((card) => (
            <div
              key={card.key}
              className={`card ${card.className} card-clickable`}
              role="button"
              tabIndex={0}
              onClick={() => handleOpenRequestList({ status: card.filterStatus, recentDays: card.recentDays || 0 })}
              onKeyDown={(event) => handleCardKeyDown(event, card)}
            >
              <h3>{card.label}</h3>
              <p>{formatCount(poojaCounts[card.key])}</p>
              <span className="card-meta">{card.helperText}</span>
            </div>
          ))}
        </div>

        <button onClick={handleLogout} className="logout-btn dashboard-logout-floating">Logout</button>
      </div>
    </div>
  );
};

export default TempleOfficerDashboard;

