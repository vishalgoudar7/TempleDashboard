import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import { Button, Paper, Stack, Typography } from "@mui/material";
import { getApiErrorMessage } from "../api/errors";
import { exportPoojaReportPdf, fetchPoojaRequestList } from "../api/templeOfficerApi";
import {
  getInitials,
  getStoredTempleOfficerUser,
  setTempleOfficerLastRoute,
} from "../utils/templeOfficerSession";
import "react-datepicker/dist/react-datepicker.css";
import "../Styles/TempleOfficerDashboard.css";
import "../Styles/Report.css";

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
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

const extractPoojaRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  return [];
};

const getTempleIdFromPoojaRow = (row) => {
  const toTemplePk = (value) => {
    const normalized = stripHtml(value);
    if (!/^\d+$/.test(normalized)) return null;
    const parsed = Number.parseInt(normalized, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  if (Array.isArray(row)) {
    const cleaned = row.map((cell) => stripHtml(cell));
    const offset = cleaned.length >= 14 ? 1 : 0;
    return toTemplePk(cleaned[offset + 1] || "");
  }

  const candidates = [
    row?.temple?.temple_id,
    row?.temple?.id,
    row?.temple_id,
    row?.templeId,
    row?.associated_temple_id,
    row?.associatedTempleId,
  ];

  for (const candidate of candidates) {
    const pkValue = toTemplePk(candidate);
    if (pkValue) return pkValue;
  }

  return null;
};

const getTempleIdFromUser = (user) => {
  const toTemplePk = (value) => {
    const normalized = stripHtml(value);
    if (!/^\d+$/.test(normalized)) return null;
    const parsed = Number.parseInt(normalized, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const candidateValues = [
    user?.templeId,
    user?.temple_id,
    user?.associated_temple_id,
    user?.associatedTempleId,
    user?.temple?.temple_id,
    user?.temple?.id,
    user?.associated_temple?.temple_id,
    user?.associated_temple?.id,
    user?.["temple id"],
  ];

  for (const candidate of candidateValues) {
    const pkValue = toTemplePk(candidate);
    if (pkValue) return pkValue;
  }

  return null;
};

const getPdfFileName = (headers, fallbackName) => {
  const contentDisposition = headers?.["content-disposition"] || headers?.["Content-Disposition"] || "";
  const match = String(contentDisposition).match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (!match || !match[1]) return fallbackName;

  try {
    return decodeURIComponent(match[1].replace(/"/g, "").trim());
  } catch (error) {
    return match[1].replace(/"/g, "").trim() || fallbackName;
  }
};

const buildFallbackPdfName = ({ temple, from_date, to_date }) =>
  `pooja-report-${temple}-${from_date || "from"}-${to_date || "to"}.pdf`
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-");

const formatDateForApi = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseBlobApiErrorMessage = async (error) => {
  const maybeBlob = error?.response?.data;
  if (!(maybeBlob instanceof Blob)) {
    return getApiErrorMessage(error, "Unable to export report.");
  }

  try {
    const text = await maybeBlob.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
      return parsed[0];
    }
    return (
      parsed?.message ||
      parsed?.detail ||
      (Array.isArray(parsed?.errors) && parsed.errors[0]?.message) ||
      "Unable to export report."
    );
  } catch (parseError) {
    return getApiErrorMessage(error, "Unable to export report.");
  }
};

const Report = () => {
  const storedUser = getStoredTempleOfficerUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("");

  const username = storedUser?.username || "Temple Officer Panel";
  const email = storedUser?.email || "Temple Dashboard";
  const userId = storedUser?.userId ? `ID: ${storedUser.userId}` : "Temple Dashboard";
  const templeIdFromSession = getTempleIdFromUser(storedUser);
  const templeName = storedUser?.templeName || storedUser?.templeAssociated || "";
  const avatarText = getInitials(username);
  const hasPdf = Boolean(pdfUrl);
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  const canSubmit = useMemo(
    () => Boolean(fromDate && toDate && fromDate <= toDate && toDate <= today),
    [fromDate, toDate, today]
  );

  useEffect(() => {
    if (!localStorage.getItem("templeOfficerToken")) {
      setTempleOfficerLastRoute(`${location.pathname}${location.search}${location.hash}`);
      navigate("/");
      return;
    }

    setTempleOfficerLastRoute(`${location.pathname}${location.search}${location.hash}`);
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => () => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
    }
  }, [pdfUrl]);

  const handleLogout = () => {
    localStorage.removeItem("templeOfficerToken");
    localStorage.removeItem("templeOfficerUser");
    localStorage.removeItem("firebaseIdToken");
    localStorage.removeItem("templeOfficerPhone");
    localStorage.removeItem("portalSessionAuth");
    navigate("/");
  };

  const resolveTempleIdForReport = async () => {
    if (templeName) {
      try {
        const response = await fetchPoojaRequestList({
          page: 1,
          size: 25,
          search: templeName,
        });

        const rows = extractPoojaRows(response?.data);
        const templeIdFromList = rows
          .map((row) => getTempleIdFromPoojaRow(row))
          .find(Boolean);

      if (templeIdFromList) {
          return templeIdFromList;
      }
      } catch (fetchError) {
        console.error("Unable to resolve temple ID from pooja request list.", fetchError);
      }
    }

    return templeIdFromSession;
  };

  const handleApplyFilter = async () => {
    if (!canSubmit || isGenerating) return;

    const fromDateValue = formatDateForApi(fromDate);
    const toDateValue = formatDateForApi(toDate);

    setIsGenerating(true);
    setError("");

    try {
      const templeId = await resolveTempleIdForReport();
      if (!templeId) {
        setError("Temple ID is invalid or missing. Please login again.");
        return;
      }
      const payload = {
        temple: templeId,
        from_date: fromDateValue,
        to_date: toDateValue,
      };

      const response = await exportPoojaReportPdf(payload);
      const blobData = response?.data;
      const blob = blobData instanceof Blob ? blobData : new Blob([blobData], { type: "application/pdf" });

      if (!blob || blob.size === 0) {
        throw new Error("The report file is empty.");
      }

      const fallbackName = buildFallbackPdfName(payload);
      const nextPdfName = getPdfFileName(response?.headers, fallbackName);
      const nextPdfUrl = window.URL.createObjectURL(blob);

      setPdfUrl((prev) => {
        if (prev) {
          window.URL.revokeObjectURL(prev);
        }
        return nextPdfUrl;
      });
      setPdfName(nextPdfName);
    } catch (exportError) {
      console.error(exportError);
      setPdfUrl((prev) => {
        if (prev) {
          window.URL.revokeObjectURL(prev);
        }
        return "";
      });
      setPdfName("");
      setError(await parseBlobApiErrorMessage(exportError));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetFilter = () => {
    setFromDate(null);
    setToDate(null);
    setError("");
    setPdfName("");
    setPdfUrl((prev) => {
      if (prev) {
        window.URL.revokeObjectURL(prev);
      }
      return "";
    });
  };

  const handleDownloadPdf = () => {
    if (!pdfUrl) return;

    try {
      const anchor = document.createElement("a");
      anchor.href = pdfUrl;
      anchor.download = pdfName || "pooja-report.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (downloadError) {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
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
          <button
            type="button"
            className="sidebar-nav-btn"
            data-label="Transactions"
            onClick={() => navigate("/temple-officer/transactions")}
          >
            <span className="sidebar-nav-icon">TR</span>
            <span className="sidebar-nav-text">Transactions</span>
          </button>
          <button type="button" className="sidebar-nav-btn active" data-label="Reports">
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

      <div className="dashboard-container report-page">
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
            <h2 className="dashboard-title">Reports</h2>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>

        <section className="report-panel">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 3,
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              backgroundColor: "#fff",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: "#1f2937" }}>
              Dashboard Filters
            </Typography>

            <div className="report-date-grid">
              <div className="report-date-field">
                <label htmlFor="report-from-date">From Date</label>
                <DatePicker
                  id="report-from-date"
                  selected={fromDate}
                  onChange={(date) => {
                    setFromDate(date);
                    if (toDate && date && toDate < date) {
                      setToDate(null);
                    }
                  }}
                  selectsStart
                  startDate={fromDate}
                  endDate={toDate}
                  maxDate={toDate || today}
                  openToDate={fromDate || toDate || today}
                  placeholderText="Select from date"
                  dateFormat="dd/MM/yyyy"
                  className="report-datepicker-input"
                  autoComplete="off"
                />
              </div>

              <div className="report-date-field">
                <label htmlFor="report-to-date">To Date</label>
                <DatePicker
                  id="report-to-date"
                  selected={toDate}
                  onChange={(date) => setToDate(date)}
                  selectsEnd
                  startDate={fromDate}
                  endDate={toDate}
                  minDate={fromDate || undefined}
                  maxDate={today}
                  openToDate={today}
                  placeholderText="Select to date"
                  dateFormat="dd/MM/yyyy"
                  className="report-datepicker-input"
                  disabled={!fromDate}
                  autoComplete="off"
                />
              </div>
            </div>

            <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
              <Button
                variant="contained"
                onClick={handleApplyFilter}
                disabled={!canSubmit || isGenerating}
                sx={{ borderRadius: 2, textTransform: "none", px: 2.5 }}
              >
                {isGenerating ? "Applying..." : "Apply Filter"}
              </Button>

              <Button
                variant="outlined"
                onClick={handleResetFilter}
                sx={{ borderRadius: 2, textTransform: "none", px: 2.5 }}
              >
                Reset
              </Button>

              {hasPdf && (
                <Button
                  variant="outlined"
                  onClick={handleDownloadPdf}
                  sx={{ borderRadius: 2, textTransform: "none", px: 2.5 }}
                >
                  Download PDF
                </Button>
              )}
            </Stack>

            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 1.5, fontWeight: 600 }}>
                {error}
              </Typography>
            )}
          </Paper>

          <div className="report-preview-card">
            <h3 className="report-form-title">Preview</h3>
            {hasPdf ? (
              <iframe
                title="Pooja report preview"
                src={pdfUrl}
                className="report-preview-frame"
              />
            ) : (
              <div className="report-empty-state">
                Generate report to preview PDF here.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Report;
