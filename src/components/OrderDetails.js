import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getInitials, getStoredTempleOfficerUser } from "../utils/templeOfficerSession";
import "../Styles/TempleOfficerDashboard.css";
import "../Styles/OrderDetails.css";

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

const ORDER_DETAILS_STORAGE_KEY = "templeOfficerOrderDetails";
const getOrderDetailsStorageKey = (identifier) => `${ORDER_DETAILS_STORAGE_KEY}:${identifier}`;
const getOrderIdentifier = (order) =>
  String(order?.requestId || order?.orderId || order?.rowId || "").trim();

const toDisplayValue = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "-";
  }
  return String(value);
};

const ORDER_DETAIL_FIELDS = [
  { label: "Order ID", key: "orderId" },
  { label: "Request ID", key: "requestId" },
  { label: "Temple ID", key: "templeId" },
  { label: "Temple Name", key: "templeName" },
  { label: "Puja Name", key: "pujaName" },
  { label: "Puja For", key: "pujaFor" },
  { label: "Devotee", key: "devotee" },
  { label: "Mobile", key: "mobile" },
  { label: "CSC ID", key: "cscId" },
  { label: "Status", key: "status" },
  { label: "Payment", key: "payment" },
  { label: "Total Cost", key: "totalCost" },
  { label: "Puja Date", key: "pujaDate" },
  { label: "Created At", key: "createdAt" },
  { label: "Docket Number", key: "docketNumber" },
  { label: "Courier Name", key: "courierName" },
];

const OrderDetails = () => {
  const storedUser = getStoredTempleOfficerUser();
  const templeName = storedUser?.templeName || storedUser?.templeAssociated || "";
  const username = storedUser?.username || "Temple Officer Panel";
  const email = storedUser?.email || "Temple Dashboard";
  const userId = storedUser?.userId ? `ID: ${storedUser.userId}` : "Temple Dashboard";
  const avatarText = getInitials(username);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const routeOrderId = useMemo(() => {
    const raw = String(params.requestId || "").trim();
    if (!raw) return "";
    try {
      return decodeURIComponent(raw);
    } catch (decodeError) {
      return raw;
    }
  }, [params.requestId]);

  useEffect(() => {
    if (!localStorage.getItem("templeOfficerToken")) {
      navigate("/");
      return;
    }

    const orderFromState = location.state?.order;
    const stateIdentifier =
      String(location.state?.orderIdentifier || "").trim() || getOrderIdentifier(orderFromState);
    const storageIdentifier = stateIdentifier || routeOrderId;
    const storageKey = storageIdentifier ? getOrderDetailsStorageKey(storageIdentifier) : "";

    if (orderFromState && typeof orderFromState === "object") {
      setOrder(orderFromState);
      setLoadError("");
      if (storageKey) {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(orderFromState));
        } catch (storageError) {
          console.error("Unable to cache order details in session storage.", storageError);
        }
      }
      return;
    }

    if (storageKey) {
      try {
        const cached = sessionStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            setOrder(parsed);
            setLoadError("");
            return;
          }
        }
      } catch (storageError) {
        console.error("Unable to restore order details from session storage.", storageError);
      }
    }

    setOrder(null);
    setLoadError("Order details are not available. Please open details from the requests list.");
  }, [location.state, navigate, routeOrderId]);

  const handleLogout = () => {
    localStorage.removeItem("templeOfficerToken");
    localStorage.removeItem("templeOfficerUser");
    localStorage.removeItem("firebaseIdToken");
    localStorage.removeItem("templeOfficerPhone");
    localStorage.removeItem("portalSessionAuth");
    navigate("/");
  };

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
          <button
            type="button"
            className="sidebar-nav-btn"
            data-label="Dashboard"
            onClick={() => navigate("/temple-officer/dashboard")}
          >
            <span className="sidebar-nav-icon">DB</span>
            <span className="sidebar-nav-text">Dashboard</span>
          </button>
          <button
            type="button"
            className="sidebar-nav-btn active"
            data-label="Pooja Requests"
            onClick={() => navigate("/temple-officer/requests")}
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
        {templeName && (
          <div className="dashboard-temple-wrap">
            <h2 className="dashboard-temple-badge">{templeName}</h2>
          </div>
        )}

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
            <h2 className="dashboard-title">Order Details</h2>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>

        <div className="order-details-card">
          <div className="order-details-actions">
            <button
              type="button"
              className="pr-btn pr-btn-ghost"
              onClick={() => navigate("/temple-officer/requests")}
            >
              Back to Requests
            </button>
          </div>

          {loadError ? (
            <p className="order-details-error">{loadError}</p>
          ) : (
            <div className="order-details-grid">
              {ORDER_DETAIL_FIELDS.map((field) => (
                <div key={field.key} className="order-details-item">
                  <span className="order-details-label">{field.label}</span>
                  <span className="order-details-value">{toDisplayValue(order?.[field.key])}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
