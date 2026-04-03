import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import { fetchAllPoojaRequestRows } from "../api/templeOfficerApi";
import {
  getInitials,
  getStoredTempleOfficerUser,
  setTempleOfficerLastRoute,
} from "../utils/templeOfficerSession";
import "../Styles/TempleOfficerDashboard.css";
import "../Styles/PoojaRequests.css";
import "../Styles/TransactionTable.css";

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

const ROWS_PER_PAGE = 20;
const MAX_VISIBLE_PAGE_BUTTONS = 3;
const ALL_ROWS_FETCH_SIZE = 100;
const MAX_ALL_ROWS_PAGES = 100;
const ORDER_DETAILS_STORAGE_KEY = "templeOfficerOrderDetails";

const stripHtml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeStatus = (value) => stripHtml(value).toLowerCase();
const toClassToken = (value) => normalizeStatus(value).replace(/[^a-z0-9]+/g, "-");

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

const formatDateForDisplay = (value) => {
  const date = parseFlexibleDate(value);
  if (!date) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatAmountForDisplay = (value) => {
  const text = stripHtml(value);
  if (!text) return "-";
  const numeric = Number(String(text).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) {
    return text;
  }
  return numeric.toFixed(2);
};

const getOrderDetailsStorageKey = (identifier) => `${ORDER_DETAILS_STORAGE_KEY}:${identifier}`;
const getOrderRouteIdentifier = (row) => stripHtml(row?.requestId || row?.orderId || row?.rowId || "");
const toSafeFileName = (value) =>
  String(value || "invoice")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_");
const getInvoiceFileName = (invoiceUrl, orderId) => {
  const fallback = `${toSafeFileName(`invoice-${orderId || "order"}`)}.pdf`;
  if (!invoiceUrl) return fallback;

  try {
    const parsed = new URL(invoiceUrl);
    const segment = parsed.pathname.split("/").pop() || "";
    if (!segment) return fallback;
    return toSafeFileName(segment);
  } catch (error) {
    const lastSegment = String(invoiceUrl).split("?")[0].split("/").pop() || "";
    return lastSegment ? toSafeFileName(lastSegment) : fallback;
  }
};

const extractRawRows = (rawData) =>
  Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.data)
      ? rawData.data
      : Array.isArray(rawData?.results)
        ? rawData.results
        : Array.isArray(rawData?.orders)
          ? rawData.orders
          : [];

const normalizeTransactionRows = (rawData) => {
  const rows = extractRawRows(rawData);

  return rows.map((row, index) => {
    if (Array.isArray(row)) {
      const cleaned = row.map((cell) => stripHtml(cell));
      const offset = cleaned.length >= 14 ? 1 : 0;
      const requestId = cleaned[offset] || "";
      const paymentMethod = cleaned[offset + 8] || "-";
      const totalCost = formatAmountForDisplay(cleaned[offset + 13] || cleaned[offset + 14] || "");

      return {
        rowId: `${requestId || index + 1}-${index}`,
        requestId,
        orderId: cleaned[offset] || "-",
        invoiceUrl: "",
        templeId: cleaned[offset + 1] || "-",
        templeName: cleaned[offset + 1] || "-",
        pujaName: cleaned[offset + 2] || "-",
        pujaFor: cleaned[offset + 3] || "-",
        devotee: cleaned[offset + 4] || "-",
        mobile: cleaned[offset + 5] || "-",
        cscId: cleaned[offset + 6] || "-",
        status: cleaned[offset + 7] || "-",
        paymentMethod,
        payment: paymentMethod,
        totalCost: totalCost === "-" ? "-" : totalCost,
        pujaDate: formatDateForDisplay(cleaned[offset + 9]),
        createdAt: formatDateForDisplay(cleaned[offset + 10]),
        docketNumber: cleaned[offset + 11] || "-",
        courierName: cleaned[offset + 12] || "-",
      };
    }

    const requestId = stripHtml(pickField(row, ["id", "request_id", "booking_id", "order_id"])) || "";
    const status = stripHtml(pickField(row, ["status", "request_status", "state"])) || "-";
    const paymentMethod =
      stripHtml(
        row?.transaction?.payment_method ||
        row?.transaction?.payment_mode ||
        pickField(row, ["payment_method", "payment_mode", "payment_type", "payment"])
      ) || "-";
    const totalCostRaw =
      stripHtml(
        row?.total_cost ||
        row?.transaction?.total_cost ||
        pickField(row, ["amount", "cost", "price"])
      ) || "";
    const invoiceUrl =
      stripHtml(
        row?.invoice ||
        row?.invoice_url ||
        row?.invoiceUrl ||
        row?.transaction?.invoice ||
        row?.transaction?.invoice_url ||
        pickField(row, ["invoice", "invoice_url", "invoiceUrl"])
      ) || "";

    return {
      rowId: `${requestId || index + 1}-${index}`,
      requestId,
      orderId:
        stripHtml(pickField(row, ["order_id", "request_id", "id", "booking_id"])) || "-",
      invoiceUrl,
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
      status,
      paymentMethod,
      payment:
        typeof row?.is_paid === "boolean"
          ? row.is_paid
            ? "Paid"
            : "Unpaid"
          : stripHtml(pickField(row, ["payment", "payment_status", "is_paid", "paid"])) || "-",
      totalCost: formatAmountForDisplay(totalCostRaw),
      pujaDate: formatDateForDisplay(stripHtml(pickField(row, ["pooja_date", "puja_date", "event_date", "date"]))),
      createdAt: formatDateForDisplay(stripHtml(pickField(row, ["created_at", "created_on", "requested_at"]))),
      docketNumber: stripHtml(pickField(row, ["docket_number", "docket", "tracking_id"])) || "-",
      courierName:
        stripHtml(pickField(row, ["courrier_name", "courier_name", "courier", "delivery_partner"])) || "-",
    };
  });
};

const TransactionTable = () => {
  const storedUser = getStoredTempleOfficerUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowIds, setSelectedRowIds] = useState([]);

  const username = storedUser?.username || "Temple Officer Panel";
  const email = storedUser?.email || "Temple Dashboard";
  const userId = storedUser?.userId ? `ID: ${storedUser.userId}` : "Temple Dashboard";
  const templeName = storedUser?.templeName || storedUser?.templeAssociated || "";
  const avatarText = getInitials(username);

  useEffect(() => {
    if (!localStorage.getItem("templeOfficerToken")) {
      setTempleOfficerLastRoute(`${location.pathname}${location.search}${location.hash}`);
      navigate("/");
      return;
    }

    const fetchTransactions = async () => {
      setIsLoading(true);
      setError("");

      try {
        const rawRows = await fetchAllPoojaRequestRows({
          search: templeName,
          size: ALL_ROWS_FETCH_SIZE,
          maxPages: MAX_ALL_ROWS_PAGES,
          concurrency: 6,
        });
        setRows(normalizeTransactionRows(rawRows));
      } catch (fetchError) {
        console.error(fetchError);
        setRows([]);
        setError(getApiErrorMessage(fetchError, "Unable to load transactions."));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [location.hash, location.pathname, location.search, navigate, templeName]);

  useEffect(() => {
    setTempleOfficerLastRoute(`${location.pathname}${location.search}${location.hash}`);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, requestStatusFilter, paymentMethodFilter]);

  const requestStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => stripHtml(row.status))
            .filter((status) => status && status !== "-")
        )
      ),
    [rows]
  );

  const paymentMethodOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => stripHtml(row.paymentMethod))
            .filter((method) => method && method !== "-")
        )
      ),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const statusFilter = normalizeStatus(requestStatusFilter);
    const methodFilter = normalizeStatus(paymentMethodFilter);

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        [
          row.orderId,
          row.requestId,
          row.pujaName,
          row.devotee,
          row.mobile,
          row.paymentMethod,
          row.status,
          row.totalCost,
          row.createdAt,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesStatus = !statusFilter || normalizeStatus(row.status) === statusFilter;
      const matchesMethod = !methodFilter || normalizeStatus(row.paymentMethod) === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [rows, search, requestStatusFilter, paymentMethodFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const validRowIds = new Set(filteredRows.map((row) => row.rowId));
    setSelectedRowIds((prev) => prev.filter((rowId) => validRowIds.has(rowId)));
  }, [filteredRows]);

  const visibleRowIds = useMemo(() => paginatedRows.map((row) => row.rowId), [paginatedRows]);
  const allVisibleChecked =
    visibleRowIds.length > 0 && visibleRowIds.every((rowId) => selectedRowIds.includes(rowId));

  const paginationPages = useMemo(() => {
    if (totalPages <= MAX_VISIBLE_PAGE_BUTTONS) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 2) {
      return [1, 2, 3];
    }

    if (currentPage >= totalPages - 1) {
      return [totalPages - 2, totalPages - 1, totalPages];
    }

    return [currentPage - 1, currentPage, currentPage + 1];
  }, [currentPage, totalPages]);
  const startItem = filteredRows.length ? (currentPage - 1) * ROWS_PER_PAGE + 1 : 0;
  const endItem = Math.min(currentPage * ROWS_PER_PAGE, filteredRows.length);

  const handleLogout = () => {
    localStorage.removeItem("templeOfficerToken");
    localStorage.removeItem("templeOfficerUser");
    localStorage.removeItem("firebaseIdToken");
    localStorage.removeItem("templeOfficerPhone");
    localStorage.removeItem("portalSessionAuth");
    navigate("/");
  };

  const handleToggleVisibleRows = (checked) => {
    if (checked) {
      setSelectedRowIds((prev) => [...new Set([...prev, ...visibleRowIds])]);
      return;
    }
    setSelectedRowIds((prev) => prev.filter((rowId) => !visibleRowIds.includes(rowId)));
  };

  const handleToggleRow = (rowId, checked) => {
    setSelectedRowIds((prev) => {
      if (checked) {
        return [...new Set([...prev, rowId])];
      }
      return prev.filter((id) => id !== rowId);
    });
  };

  const handleViewOrderDetails = (row) => {
    const orderIdentifier = getOrderRouteIdentifier(row);
    if (!orderIdentifier) return;

    try {
      sessionStorage.setItem(getOrderDetailsStorageKey(orderIdentifier), JSON.stringify(row));
    } catch (storageError) {
      console.error("Unable to cache order details in session storage.", storageError);
    }

    navigate(`/temple-officer/requests/${encodeURIComponent(orderIdentifier)}`, {
      state: {
        order: row,
        orderIdentifier,
      },
    });
  };

  const handleDownloadInvoice = async (row) => {
    const invoiceUrl = stripHtml(row?.invoiceUrl || row?.invoice || "");
    if (!invoiceUrl) return;

    const orderId = stripHtml(row?.orderId || row?.requestId || "order");
    const fileName = getInvoiceFileName(invoiceUrl, orderId);

    try {
      const response = await fetch(invoiceUrl);
      if (!response.ok) {
        throw new Error(`Invoice fetch failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      const anchor = document.createElement("a");
      anchor.href = invoiceUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
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
            className="sidebar-nav-btn"
            data-label="Pooja Requests"
            onClick={() => navigate("/temple-officer/requests")}
          >
            <span className="sidebar-nav-icon">PR</span>
            <span className="sidebar-nav-text">Pooja Requests</span>
          </button>
          <button type="button" className="sidebar-nav-btn active" data-label="Transactions">
            <span className="sidebar-nav-icon">TR</span>
            <span className="sidebar-nav-text">Transactions</span>
          </button>
          <button
            type="button"
            className="sidebar-nav-btn"
            data-label="Reports"
            onClick={() => navigate("/temple-officer/reports")}
          >
            <span className="sidebar-nav-icon">RP</span>
            <span className="sidebar-nav-text">Reports</span>
          </button>
          <button
            type="button"
            className="sidebar-nav-btn"
            data-label="User Pages"
            onClick={() => navigate("/temple-officer/dashboard?view=user-pages")}
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

      <div className="dashboard-container transaction-page">
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
            <h2 className="dashboard-title">Transactions</h2>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>

        <div className="pr-filter-card transaction-filter-card">
          <div className="pr-filter-grid transaction-filter-grid">
            <div className="pr-filter-field transaction-search-field">
              <label>Search</label>
              <input
                type="text"
                className="transaction-input"
                placeholder="Search Order / Devotee / Puja"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="pr-filter-field">
              <label>Request Status</label>
              <select
                value={requestStatusFilter}
                onChange={(event) => setRequestStatusFilter(event.target.value)}
              >
                <option value="">All</option>
                {requestStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="pr-filter-field">
              <label>Payment Method</label>
              <select
                value={paymentMethodFilter}
                onChange={(event) => setPaymentMethodFilter(event.target.value)}
              >
                <option value="">All</option>
                {paymentMethodOptions.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="pr-filter-actions">
            <button type="button" className="pr-btn pr-btn-primary" onClick={() => setCurrentPage(1)}>
              Filter
            </button>
            <button
              type="button"
              className="pr-btn pr-btn-ghost"
              onClick={() => {
                setSearch("");
                setRequestStatusFilter("");
                setPaymentMethodFilter("");
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="pr-table-card">
          <div className="pr-table-toolbar">
            <label className="pr-search-control">
              Search:
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Order ID / Devotee / Payment"
              />
            </label>
            <div className="pr-bulk-control">
              <span>{selectedRowIds.length} selected</span>
            </div>
          </div>

          {isLoading ? (
            <p className="pr-state-text">Loading transactions...</p>
          ) : error ? (
            <p className="pr-state-text pr-error-text">{error}</p>
          ) : (
            <>
              <div className="pr-table-wrap">
                <table className="pr-table transaction-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={allVisibleChecked}
                          onChange={(event) => handleToggleVisibleRows(event.target.checked)}
                          aria-label="Select all transactions on current page"
                        />
                      </th>
                      <th>Order ID</th>
                      <th>Puja</th>
                      <th>Devotee</th>
                      <th>Amount</th>
                      <th>Request Status</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="pr-empty-cell">
                          No transactions found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => (
                        <tr key={row.rowId}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedRowIds.includes(row.rowId)}
                              onChange={(event) => handleToggleRow(row.rowId, event.target.checked)}
                              aria-label={`Select transaction ${row.orderId}`}
                            />
                          </td>
                          <td>{row.orderId}</td>
                          <td>
                            <span className="transaction-puja" title={row.pujaName}>
                              {row.pujaName}
                            </span>
                          </td>
                          <td>{row.devotee}</td>
                          <td>{row.totalCost}</td>
                          <td>
                            <span className={`pr-status ${toClassToken(row.status)}`}>
                              {row.status}
                            </span>
                          </td>
                          <td>{row.createdAt}</td>
                          <td>
                            <div className="transaction-actions">
                              <button
                                type="button"
                                className="pr-btn pr-btn-ghost pr-btn-small"
                                onClick={() => void handleDownloadInvoice(row)}
                                disabled={!row.invoiceUrl}
                                title={row.invoiceUrl ? "Download invoice PDF" : "Invoice not available"}
                              >
                                Invoice
                              </button>
                              <button
                                type="button"
                                className="pr-btn pr-btn-ghost pr-btn-small"
                                onClick={() => handleViewOrderDetails(row)}
                              >
                                Detail
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <p className="pr-footer-note">
                Showing {startItem}-{endItem} of {filteredRows.length}
              </p>
              {filteredRows.length > 0 && (
                <div className="pr-pagination">
                  <button
                    type="button"
                    className="pr-page-btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </button>
                  <button
                    type="button"
                    className="pr-page-btn"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </button>
                  <div className="pr-page-list">
                    {paginationPages.map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`pr-page-btn ${currentPage === page ? "active" : ""}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="pr-page-btn"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    className="pr-page-btn"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionTable;
