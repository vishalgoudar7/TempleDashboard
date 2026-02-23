import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "../Styles/PujariDashboard.css";

const PujariDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("pujariToken");
    if (!token) {
      navigate("/"); // redirect to login if not logged in
      return;
    }
    localStorage.setItem("pujariToken", token);

    const fetchDashboardData = async () => {
      try {
        const response = await fetch("https://beta.devalayas.com/api/v1/pujari/dashboard/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch dashboard");
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error(error);
        setError("Error loading dashboard");
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Firebase sign out failed:", error);
    }
    localStorage.removeItem("pujariToken");
    localStorage.removeItem("firebaseIdToken");
    localStorage.removeItem("pujariPhone");
    navigate("/");
  };

  if (error) return <div className="state-text">Error: {error}</div>;
  if (!dashboardData) return <div className="state-text">Loading dashboard...</div>;

  return (
    <div className={`dashboard-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <aside className="sidebar-menu">
        <div className="sidebar-top">
          <h3 className="sidebar-brand">DEVALAYAS</h3>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            x
          </button>
        </div>

        <div className="sidebar-profile">
          <div className="profile-avatar">P</div>
          <div>
            <div className="profile-name">Pujari Panel</div>
            <div className="profile-role">Temple Dashboard</div>
          </div>
        </div>

        <div className="sidebar-nav-title">Navigation</div>
        <nav className="sidebar-nav">
          <button type="button" className="sidebar-nav-btn active">Dashboard</button>
          <button type="button" className="sidebar-nav-btn">Pooja Requests</button>
          <button type="button" className="sidebar-nav-btn">Transactions</button>
          <button type="button" className="sidebar-nav-btn">Reports</button>
          <button type="button" className="sidebar-nav-btn">User Pages</button>
          <button type="button" className="sidebar-nav-btn">Documentation</button>
        </nav>
      </aside>

      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            {!sidebarOpen && (
              <button
                type="button"
                className="sidebar-open-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                Menu
              </button>
            )}
            <h2 className="dashboard-title">Pujari Dashboard</h2>
          </div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>

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

export default PujariDashboard;
