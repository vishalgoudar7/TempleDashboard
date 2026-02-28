import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import { fetchTempleOfficerDashboard } from "../api/templeOfficerApi";
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

const TempleOfficerDashboard = () => {
  const storedUser = getStoredTempleOfficerUser();
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("templeOfficerToken");
    if (!token) {
      navigate("/"); // redirect to login if not logged in
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const response = await fetchTempleOfficerDashboard();
        setDashboardData(response.data);
      } catch (error) {
        console.error(error);
        setError(getApiErrorMessage(error, "Error loading dashboard"));
      }
    };

    fetchDashboardData();
  }, [navigate]);

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

  if (error) return <div className="state-text">Error: {error}</div>;
  if (!dashboardData) return <div className="state-text">Loading dashboard...</div>;
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
          <button type="button" className="sidebar-nav-btn" data-label="Transactions">
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
        <div className="dashboard-temple-wrap">
          <h2 className="dashboard-temple-badge">
            {templeName || "Not Available"}
          </h2>
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
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>

        {successMessage && <div className="success-banner">{successMessage}</div>}

        <div className="dashboard-cards">
          <div className="card card-total">
            <h3>Total Pooja Requests</h3>
            <p>{dashboardData.pooja_requests?.total || 0}</p>
          </div>
          <div className="card card-pending">
            <h3>Pending Requests</h3>
            <p>{dashboardData.pooja_requests?.pending || 0}</p>
          </div>
          <div className="card card-processing">
            <h3>Accepted Requests</h3>
            <p>{dashboardData.pooja_requests?.accepted || 0}</p>
          </div>
          <div className="card card-prasadam">
            <h3>Total Prasadam</h3>
            <p>{dashboardData.total_prasadam || 0}</p>
          </div>
          <div className="card card-amount">
            <h3>Total Amount Transferred</h3>
            <p>Rs {dashboardData.total_amount || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TempleOfficerDashboard;

