import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import { fetchPoojaRequestList } from "../api/templeOfficerApi";
import { getInitials, getStoredTempleOfficerUser } from "../utils/templeOfficerSession";
import "../Styles/TempleOfficerDashboard.css";
import "../Styles/PoojaRequests.css";

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

const parseFlexibleDate = (value) => {
  const text = stripHtml(value);
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const year = iso[1];
    const month = iso[2];
    const day = iso[3];
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const dmy = text.match(/(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (dmy) {
    const day = dmy[1];
    const month = dmy[2];
    const year = dmy[3];
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const asDate = new Date(text);
  if (Number.isNaN(asDate.getTime())) return null;
  return asDate;
};

const normalizeRows = (rawData) => {
  const rows = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.data)
    ? rawData.data
    : Array.isArray(rawData?.results)
      ? rawData.results
      : Array.isArray(rawData?.orders)
        ? rawData.orders
        : [];

  return rows.map((row, index) => {
    if (Array.isArray(row)) {
      const cleaned = row.map((cell) => stripHtml(cell));
      const offset = cleaned.length >= 14 ? 1 : 0;
      return {
        rowId: `${cleaned[offset] || index + 1}-${index}`,
        orderId: cleaned[offset] || "-",
        templeId: cleaned[offset + 1] || "-",
        templeName: cleaned[offset + 1] || "-",
        pujaName: cleaned[offset + 2] || "-",
        pujaFor: cleaned[offset + 3] || "-",
        devotee: cleaned[offset + 4] || "-",
        mobile: cleaned[offset + 5] || "-",
        cscId: cleaned[offset + 6] || "-",
        status: cleaned[offset + 7] || "-",
        payment: cleaned[offset + 8] || "-",
        pujaDate: cleaned[offset + 9] || "-",
        createdAt: cleaned[offset + 10] || "-",
        docketNumber: cleaned[offset + 11] || "-",
        courierName: cleaned[offset + 12] || "-",
      };
    }

    return {
      rowId: `${pickField(row, ["id", "request_id", "order_id"]) || index + 1}-${index}`,
      orderId:
        stripHtml(pickField(row, ["order_id", "request_id", "id", "booking_id"])) || "-",
      templeId:
        stripHtml(
          row?.temple?.temple_id ||
          row?.temple?.id ||
          pickField(row, ["temple_id", "temple_code"])
        ) || "-",
      templeName: stripHtml(
        row?.temple?.name ||
        pickField(row, ["temple_name", "associated_temple", "temple_title"])
      ) || "-",
      pujaName:
        stripHtml(
          row?.pooja?.name ||
          pickField(row, ["puja_name", "service_name", "pooja_name", "title"])
        ) || "-",
      pujaFor:
        stripHtml(
          pickField(row, ["puja_for", "for_name", "beneficiary_name", "request_type"])
        ) || "-",
      devotee: stripHtml(pickField(row, ["devotee_name", "customer_name", "name", "username"])) || "-",
      mobile:
        stripHtml(
          pickField(row, ["devotee_number", "vle_mobile_number", "mobile", "phone", "contact"])
        ) || "-",
      cscId: stripHtml(pickField(row, ["csc_id", "cscId", "center_id"])) || "-",
      status: stripHtml(pickField(row, ["status", "request_status", "state"])) || "-",
      payment:
        typeof row?.is_paid === "boolean"
          ? row.is_paid
            ? "Paid"
            : "Unpaid"
          : stripHtml(pickField(row, ["payment", "payment_status", "is_paid", "paid"])) || "-",
      pujaDate: stripHtml(pickField(row, ["puja_date", "event_date", "date"])) || "-",
      createdAt: stripHtml(pickField(row, ["created_at", "created_on", "requested_at"])) || "-",
      docketNumber: stripHtml(pickField(row, ["docket_number", "docket", "tracking_id"])) || "-",
      courierName:
        stripHtml(pickField(row, ["courrier_name", "courier_name", "courier", "delivery_partner"])) || "-",
      totalCost:
        stripHtml(
          row?.total_cost ||
          row?.transaction?.total_cost ||
          pickField(row, ["cost", "amount"])
        ) || "-",
    };
  });
};

const isInDateRange = (value, from, to) => {
  if (!from && !to) return true;
  const date = parseFlexibleDate(value);
  if (!date) return false;

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`);
    if (date < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59`);
    if (date > toDate) return false;
  }

  return true;
};

const PoojaRequests = () => {
  const storedUser = getStoredTempleOfficerUser();
  const templeName = storedUser?.templeName || storedUser?.templeAssociated || "";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [draftFilters, setDraftFilters] = useState({
    createdFrom: "",
    createdTo: "",
    pujaFrom: "",
    pujaTo: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    createdFrom: "",
    createdTo: "",
    pujaFrom: "",
    pujaTo: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("templeOfficerToken")) {
      navigate("/");
      return;
    }

    const fetchRequestList = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetchPoojaRequestList({
          page: 1,
          search: templeName,
        });
        const normalizedRows = normalizeRows(response.data);
        setRows(normalizedRows);
      } catch (fetchError) {
        console.error(fetchError);
        setError(getApiErrorMessage(fetchError, "Unable to load pooja requests."));
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequestList();
  }, [navigate, templeName]);

  const handleLogout = () => {
    localStorage.removeItem("templeOfficerToken");
    localStorage.removeItem("templeOfficerUser");
    localStorage.removeItem("firebaseIdToken");
    localStorage.removeItem("templeOfficerPhone");
    localStorage.removeItem("portalSessionAuth");
    navigate("/");
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        Object.values(row).some((value) => String(value).toLowerCase().includes(term));

      const matchesCreated = isInDateRange(
        row.createdAt,
        appliedFilters.createdFrom,
        appliedFilters.createdTo
      );
      const matchesPuja = isInDateRange(row.pujaDate, appliedFilters.pujaFrom, appliedFilters.pujaTo);

      return matchesSearch && matchesCreated && matchesPuja;
    });
  }, [rows, search, appliedFilters]);

  const visibleRows = useMemo(() => filteredRows.slice(0, pageSize), [filteredRows, pageSize]);
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
          <button
            type="button"
            className="sidebar-nav-btn"
            data-label="Dashboard"
            onClick={() => navigate("/temple-officer/dashboard")}
          >
            <span className="sidebar-nav-icon">DB</span>
            <span className="sidebar-nav-text">Dashboard</span>
          </button>
          <button type="button" className="sidebar-nav-btn active" data-label="Pooja Requests">
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
            <h2 className="dashboard-title">Pooja Requests</h2>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>

        <div className="pr-filter-card">
          <div className="pr-filter-grid">
            <div className="pr-filter-field">
              <label>Created At</label>
              <div className="pr-range-row">
                <input
                  type="date"
                  value={draftFilters.createdFrom}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, createdFrom: event.target.value }))
                  }
                />
                <input
                  type="date"
                  value={draftFilters.createdTo}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, createdTo: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="pr-filter-field">
              <label>Puja Date</label>
              <div className="pr-range-row">
                <input
                  type="date"
                  value={draftFilters.pujaFrom}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, pujaFrom: event.target.value }))
                  }
                />
                <input
                  type="date"
                  value={draftFilters.pujaTo}
                  onChange={(event) =>
                    setDraftFilters((prev) => ({ ...prev, pujaTo: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="pr-filter-actions">
            <button type="button" className="pr-btn pr-btn-primary" onClick={() => setAppliedFilters(draftFilters)}>
              Filter
            </button>
            <button
              type="button"
              className="pr-btn pr-btn-ghost"
              onClick={() => {
                const empty = { createdFrom: "", createdTo: "", pujaFrom: "", pujaTo: "" };
                setDraftFilters(empty);
                setAppliedFilters(empty);
                setSearch("");
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="pr-table-card">
          <div className="pr-table-toolbar">
            <label className="pr-show-control">
              Show
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              entries
            </label>

            <label className="pr-search-control">
              Search:
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Order ID / Devotee / Status"
              />
            </label>
          </div>

          {isLoading ? (
            <p className="pr-state-text">Loading pooja requests...</p>
          ) : error ? (
            <p className="pr-state-text pr-error-text">{error}</p>
          ) : (
            <>
              <div className="pr-table-wrap">
                <table className="pr-table">
                  <thead>
                    <tr>
                      <th />
                      <th>Order ID</th>
                      <th>Puja For</th>
                      <th>Devotee</th>
                      <th>VLE Mobile Number</th>
                      <th>CSC ID</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Total Cost</th>
                      <th>Puja Date</th>
                      <th>Created At</th>
                      <th>Docket Number</th>
                      <th>Courier Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="pr-empty-cell">
                          No pooja requests found for selected filters.
                        </td>
                      </tr>
                    ) : (
                      visibleRows.map((row) => (
                        <tr key={row.rowId}>
                          <td>
                            <input type="checkbox" />
                          </td>
                          <td>{row.orderId}</td>
                          <td>{row.pujaFor}</td>
                          <td>{row.devotee}</td>
                          <td>{row.mobile}</td>
                          <td>{row.cscId}</td>
                          <td>
                            <span className={`pr-status ${row.status.toLowerCase().replace(/\s+/g, "-")}`}>
                              {row.status}
                            </span>
                          </td>
                          <td>
                            <span className={`pr-payment ${row.payment.toLowerCase().replace(/\s+/g, "-")}`}>
                              {row.payment}
                            </span>
                          </td>
                          <td>{row.totalCost}</td>
                          <td>{row.pujaDate}</td>
                          <td>{row.createdAt}</td>
                          <td>{row.docketNumber}</td>
                          <td>{row.courierName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <p className="pr-footer-note">
                Showing {visibleRows.length} of {filteredRows.length} filtered requests
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoojaRequests;

