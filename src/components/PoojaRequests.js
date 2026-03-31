import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import {
  bulkUpdatePoojaRequestStatus,
  fetchAllPoojaRequestRows,
  fetchPoojaRequestList,
} from "../api/templeOfficerApi";
import {
  getInitials,
  getStoredTempleOfficerUser,
  setTempleOfficerLastRoute,
} from "../utils/templeOfficerSession";
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

const normalizeStatus = (value) => stripHtml(value).toLowerCase();
const toCanonicalStatus = (value) => normalizeStatus(value);

const toStatusLabel = (value) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const STATUS_UPDATE_OPTIONS = ["Accepted", "Processing", "Dispatched", "Completed"];
const STATUS_FILTER_OPTIONS = ["accepted", "pending", "processing", "dispatched", "completed"];
const STATUS_FILTER_API_VALUES = {
  accepted: "Accepted",
  pending: "Pending",
  processing: "Processing",
  dispatched: "Dispatched",
  completed: "Completed",
};
const PAGE_SIZE_ALL = "all";
const ALL_ROWS_FETCH_SIZE = 100;
const MAX_ALL_ROWS_PAGES = 100;
const toApiStatusValue = (value) => {
  const normalized = toCanonicalStatus(value);
  return STATUS_FILTER_API_VALUES[normalized] || "";
};

const matchesStatusFilter = (rowStatus, selectedStatus) => {
  if (!selectedStatus) return true;
  return toCanonicalStatus(rowStatus) === toCanonicalStatus(selectedStatus);
};

const toClassToken = (value) => normalizeStatus(value).replace(/[^a-z0-9]+/g, "-");
const getEditableStatus = (value) => {
  const canonicalStatus = toCanonicalStatus(value);
  const normalizedValue = canonicalStatus === "pending" ? "processing" : canonicalStatus;
  const match = STATUS_UPDATE_OPTIONS.find((option) => normalizeStatus(option) === normalizedValue);
  return match || STATUS_UPDATE_OPTIONS[0];
};
const toNumericRequestId = (value) => {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

const formatDateForDisplay = (value) => {
  const date = parseFlexibleDate(value);
  if (!date) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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
        requestId: cleaned[offset] || "",
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
        pujaDate: formatDateForDisplay(cleaned[offset + 9]),
        createdAt: formatDateForDisplay(cleaned[offset + 10]),
        docketNumber: cleaned[offset + 11] || "-",
        courierName: cleaned[offset + 12] || "-",
      };
    }

    const requestId =
      stripHtml(pickField(row, ["id", "request_id", "booking_id", "order_id"])) || "";

    return {
      rowId: `${requestId || index + 1}-${index}`,
      requestId,
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
      pujaDate: formatDateForDisplay(stripHtml(pickField(row, ["pooja_date", "puja_date", "event_date", "date"]))),
      createdAt: formatDateForDisplay(stripHtml(pickField(row, ["created_at", "created_on", "requested_at"]))),
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

const parsePageSizeValue = (value) => {
  if (String(value).trim() === PAGE_SIZE_ALL) {
    return PAGE_SIZE_ALL;
  }
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 25;
};

const extractPaginationMeta = (rawData, fallbackPage = 1, fallbackSize = 25) => {
  const container =
    rawData?.data && typeof rawData.data === "object" && !Array.isArray(rawData.data)
      ? rawData.data
      : rawData;

  const currentPage = Number(
    container?.current_page ||
    container?.page ||
    container?.page_number ||
    fallbackPage
  );

  const totalPagesRaw = Number(
    container?.total_pages ||
    container?.pages ||
    container?.totalPages ||
    container?.last_page ||
    0
  );

  const totalItemsRaw = Number(
    container?.count ||
    container?.total ||
    container?.total_count ||
    container?.results_count ||
    0
  );

  const totalItems = Number.isFinite(totalItemsRaw) && totalItemsRaw > 0 ? totalItemsRaw : 0;
  const totalPagesFromCount =
    totalItems > 0 ? Math.ceil(totalItems / Math.max(1, fallbackSize)) : 0;
  const totalPages = Math.max(1, totalPagesRaw || totalPagesFromCount || fallbackPage);

  return {
    currentPage: Math.max(1, currentPage),
    totalPages,
    totalItems,
  };
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

const formatDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRecentCreatedRange = (days) => {
  const safeDays = Number.parseInt(String(days || ""), 10);
  if (!Number.isInteger(safeDays) || safeDays <= 0) {
    return { from: "", to: "" };
  }

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - (safeDays - 1));

  return {
    from: formatDateInputValue(fromDate),
    to: formatDateInputValue(toDate),
  };
};

const ORDER_DETAILS_STORAGE_KEY = "templeOfficerOrderDetails";
const getOrderDetailsStorageKey = (identifier) => `${ORDER_DETAILS_STORAGE_KEY}:${identifier}`;
const getOrderRouteIdentifier = (row) =>
  stripHtml(row?.requestId || row?.orderId || row?.rowId || "");

const PoojaRequests = () => {
  const storedUser = getStoredTempleOfficerUser();
  const templeName = storedUser?.templeName || storedUser?.templeAssociated || "";
  const location = useLocation();
  const initialStatusFromQuery = useMemo(() => {
    const status = new URLSearchParams(location.search).get("status");
    return toCanonicalStatus(status || "");
  }, [location.search]);
  const initialRecentDaysFromQuery = useMemo(() => {
    const value = new URLSearchParams(location.search).get("recent_days");
    const parsed = Number.parseInt(String(value || ""), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  }, [location.search]);
  const initialCreatedRangeFromQuery = useMemo(
    () => getRecentCreatedRange(initialRecentDaysFromQuery),
    [initialRecentDaysFromQuery]
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionMessageType, setActionMessageType] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [rowStatusDrafts, setRowStatusDrafts] = useState({});
  const [updatingRowId, setUpdatingRowId] = useState("");
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [bulkStatusDraft, setBulkStatusDraft] = useState(STATUS_UPDATE_OPTIONS[0]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    createdFrom: initialCreatedRangeFromQuery.from,
    createdTo: initialCreatedRangeFromQuery.to,
    pujaFrom: "",
    pujaTo: "",
    status: initialStatusFromQuery,
  });
  const [appliedFilters, setAppliedFilters] = useState({
    createdFrom: initialCreatedRangeFromQuery.from,
    createdTo: initialCreatedRangeFromQuery.to,
    pujaFrom: "",
    pujaTo: "",
    status: initialStatusFromQuery,
  });
  const navigate = useNavigate();
  const isAllRowsMode = pageSize === PAGE_SIZE_ALL;

  useEffect(() => {
    if (!localStorage.getItem("templeOfficerToken")) {
      setTempleOfficerLastRoute(`${location.pathname}${location.search}${location.hash}`);
      navigate("/");
      return;
    }

    const fetchRequestList = async () => {
      setIsLoading(true);
      setError("");
      setActionMessage("");
      setActionMessageType("");

      try {
        let normalizedRows = [];
        let paginationMeta = { totalPages: 1, totalItems: 0 };

        if (isAllRowsMode) {
          const allRawRows = await fetchAllPoojaRequestRows({
            search: templeName,
            status: toApiStatusValue(appliedFilters.status),
            size: ALL_ROWS_FETCH_SIZE,
            maxPages: MAX_ALL_ROWS_PAGES,
            concurrency: 6,
          });

          normalizedRows = normalizeRows(allRawRows);
          paginationMeta = {
            totalPages: 1,
            totalItems: allRawRows.length,
          };
          setCurrentPage(1);
        } else {
          const response = await fetchPoojaRequestList({
            page: currentPage,
            size: pageSize,
            status: toApiStatusValue(appliedFilters.status),
            search: templeName,
          });
          const payload = response?.data;
          normalizedRows = normalizeRows(payload);
          paginationMeta = extractPaginationMeta(payload, currentPage, pageSize);
        }

        setRows(normalizedRows);
        setTotalPages(paginationMeta.totalPages);
        setTotalItems(paginationMeta.totalItems);
        const nextDrafts = {};
        normalizedRows.forEach((row) => {
          nextDrafts[row.rowId] = getEditableStatus(row.status);
        });
        setRowStatusDrafts(nextDrafts);
      } catch (fetchError) {
        console.error(fetchError);
        setError(getApiErrorMessage(fetchError, "Unable to load pooja requests."));
        setRows([]);
        setTotalPages(1);
        setTotalItems(0);
        setRowStatusDrafts({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequestList();
  }, [
    currentPage,
    isAllRowsMode,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    pageSize,
    templeName,
    appliedFilters.status,
  ]);

  useEffect(() => {
    setTempleOfficerLastRoute(`${location.pathname}${location.search}${location.hash}`);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    setDraftFilters((prev) => ({
      ...prev,
      createdFrom: initialCreatedRangeFromQuery.from,
      createdTo: initialCreatedRangeFromQuery.to,
      status: initialStatusFromQuery,
    }));
    setAppliedFilters((prev) => ({
      ...prev,
      createdFrom: initialCreatedRangeFromQuery.from,
      createdTo: initialCreatedRangeFromQuery.to,
      status: initialStatusFromQuery,
    }));
  }, [initialStatusFromQuery, initialCreatedRangeFromQuery.from, initialCreatedRangeFromQuery.to]);

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
      const matchesStatus = matchesStatusFilter(row.status, appliedFilters.status);

      return matchesSearch && matchesCreated && matchesPuja && matchesStatus;
    });
  }, [rows, search, appliedFilters]);

  const visibleRows = useMemo(() => filteredRows, [filteredRows]);
  const visibleRequestIds = useMemo(
    () =>
      visibleRows
        .map((row) => toNumericRequestId(row.requestId))
        .filter((requestId) => requestId !== null),
    [visibleRows]
  );
  const selectedRequestIdSet = useMemo(() => new Set(selectedRequestIds), [selectedRequestIds]);
  const areAllVisibleRowsSelected =
    visibleRequestIds.length > 0 &&
    visibleRequestIds.every((requestId) => selectedRequestIdSet.has(requestId));
  const paginationPages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [totalPages, currentPage]);
  const statusOptions = useMemo(() => {
    const options = new Set(STATUS_FILTER_OPTIONS);

    rows.forEach((row) => {
      const status = toCanonicalStatus(row.status);
      if (status && status !== "-") {
        options.add(status);
      }
    });

    return Array.from(options);
  }, [rows]);
  const username = storedUser?.username || "Temple Officer Panel";
  const email = storedUser?.email || "Temple Dashboard";
  const userId = storedUser?.userId ? `ID: ${storedUser.userId}` : "Temple Dashboard";
  const avatarText = getInitials(username);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, appliedFilters, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const validRequestIds = new Set(
      rows
        .map((row) => toNumericRequestId(row.requestId))
        .filter((requestId) => requestId !== null)
    );
    setSelectedRequestIds((prev) => prev.filter((requestId) => validRequestIds.has(requestId)));
  }, [rows]);

  const handleRowStatusDraftChange = (rowId, nextStatus) => {
    setRowStatusDrafts((prev) => ({ ...prev, [rowId]: nextStatus }));
  };

  const extractStatusError = (updateError) => {
    const statusErrors = updateError?.response?.data?.status;
    if (Array.isArray(statusErrors) && typeof statusErrors[0] === "string") {
      return statusErrors[0];
    }
    if (typeof statusErrors === "string" && statusErrors.trim()) {
      return statusErrors.trim();
    }
    return "";
  };
  const getUpdatedCountFromResponse = (response, fallbackCount = 0) => {
    const responseCount = Number.parseInt(
      String(
        response?.data?.updated_count ??
        response?.data?.updatedCount ??
        response?.data?.count ??
        fallbackCount
      ),
      10
    );
    if (Number.isNaN(responseCount) || responseCount < 0) return fallbackCount;
    return responseCount;
  };

  const handleToggleAllVisibleRows = (checked) => {
    if (!visibleRequestIds.length) return;

    setSelectedRequestIds((prev) => {
      if (checked) {
        const next = new Set(prev);
        visibleRequestIds.forEach((requestId) => next.add(requestId));
        return Array.from(next);
      }

      const visibleIds = new Set(visibleRequestIds);
      return prev.filter((requestId) => !visibleIds.has(requestId));
    });
  };

  const handleToggleRowSelection = (requestId, checked) => {
    setSelectedRequestIds((prev) => {
      if (checked) {
        return prev.includes(requestId) ? prev : [...prev, requestId];
      }
      return prev.filter((id) => id !== requestId);
    });
  };

  const handleBulkUpdateSelected = async () => {
    if (!selectedRequestIds.length) {
      setActionMessage("Select at least one request to update status.");
      setActionMessageType("error");
      return;
    }

    setIsBulkUpdating(true);
    setActionMessage("");
    setActionMessageType("");

    try {
      const response = await bulkUpdatePoojaRequestStatus({
        requestIds: selectedRequestIds,
        status: bulkStatusDraft,
      });
      const selectedIds = new Set(selectedRequestIds);
      const updatedCount = getUpdatedCountFromResponse(response, selectedIds.size);

      if (updatedCount <= 0) {
        setActionMessage("No request status was updated. Verify the selected request IDs and try again.");
        setActionMessageType("error");
        return;
      }

      setRows((prev) =>
        prev.map((row) => {
          const requestId = toNumericRequestId(row.requestId);
          return requestId && selectedIds.has(requestId)
            ? { ...row, status: bulkStatusDraft }
            : row;
        })
      );
      setRowStatusDrafts((prev) => {
        const next = { ...prev };
        rows.forEach((row) => {
          const requestId = toNumericRequestId(row.requestId);
          if (requestId && selectedIds.has(requestId)) {
            next[row.rowId] = bulkStatusDraft;
          }
        });
        return next;
      });
      setSelectedRequestIds([]);
      setActionMessage(
        `Status updated successfully for ${updatedCount} request(s).`
      );
      setActionMessageType("success");
    } catch (updateError) {
      console.error(updateError);
      setActionMessage(
        extractStatusError(updateError) ||
        getApiErrorMessage(updateError, "Unable to update selected request statuses.")
      );
      setActionMessageType("error");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleUpdateRowStatus = async (row) => {
    const requestId = toNumericRequestId(row.requestId);
    if (!requestId) {
      setActionMessage("This row has no request ID, so status cannot be updated.");
      setActionMessageType("error");
      return;
    }

    const nextStatus = rowStatusDrafts[row.rowId] || getEditableStatus(row.status);
    setUpdatingRowId(row.rowId);
    setActionMessage("");
    setActionMessageType("");

    try {
      const response = await bulkUpdatePoojaRequestStatus({
        requestIds: [requestId],
        status: nextStatus,
      });
      const updatedCount = getUpdatedCountFromResponse(response, 1);

      if (updatedCount <= 0) {
        setActionMessage("No request status was updated for this row. Verify request ID mapping.");
        setActionMessageType("error");
        return;
      }

      setRows((prev) =>
        prev.map((currentRow) =>
          toNumericRequestId(currentRow.requestId) === requestId
            ? { ...currentRow, status: nextStatus }
            : currentRow
        )
      );
      setRowStatusDrafts((prev) => ({ ...prev, [row.rowId]: nextStatus }));
      setActionMessage(`Updated status to ${nextStatus} for request ${row.orderId}.`);
      setActionMessageType("success");
    } catch (updateError) {
      console.error(updateError);
      setActionMessage(
        extractStatusError(updateError) ||
        getApiErrorMessage(updateError, "Unable to update request status.")
      );
      setActionMessageType("error");
    } finally {
      setUpdatingRowId("");
    }
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

            <div className="pr-filter-field">
              <label>Status</label>
              <select
                value={draftFilters.status}
                onChange={(event) =>
                  setDraftFilters((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                <option value="">All Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {toStatusLabel(status)}
                  </option>
                ))}
              </select>
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
                const empty = { createdFrom: "", createdTo: "", pujaFrom: "", pujaTo: "", status: "" };
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
                onChange={(event) => setPageSize(parsePageSizeValue(event.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={PAGE_SIZE_ALL}>All</option>
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

            <div className="pr-bulk-control">
              <span>Bulk Status</span>
              <select
                value={bulkStatusDraft}
                onChange={(event) => setBulkStatusDraft(event.target.value)}
                disabled={isBulkUpdating || isLoading}
              >
                {STATUS_UPDATE_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="pr-btn pr-btn-primary pr-btn-small"
                onClick={handleBulkUpdateSelected}
                disabled={isBulkUpdating || !selectedRequestIds.length}
              >
                {isBulkUpdating ? "Updating..." : "Update Selected"}
              </button>
              <span className="pr-selected-count">{selectedRequestIds.length} selected</span>
            </div>
          </div>
          {actionMessage && (
            <p className={`pr-state-text ${actionMessageType === "error" ? "pr-error-text" : ""}`}>
              {actionMessage}
            </p>
          )}

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
                      <th>
                        <input
                          type="checkbox"
                          checked={areAllVisibleRowsSelected}
                          onChange={(event) => handleToggleAllVisibleRows(event.target.checked)}
                          disabled={!visibleRequestIds.length || isBulkUpdating || isLoading}
                          aria-label="Select all visible requests"
                        />
                      </th>
                      <th>Order ID</th>
                      <th>Devotee</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Total Cost</th>
                      <th>Puja Date</th>
                      <th>Created At</th>
                      <th>Docket Number</th>
                      <th>View</th>
                      <th>Update Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="pr-empty-cell">
                          No pooja requests found for selected filters.
                        </td>
                      </tr>
                    ) : (
                      visibleRows.map((row) => {
                        const numericRequestId = toNumericRequestId(row.requestId);
                        const isSelectable = Boolean(numericRequestId);
                        const isRowUpdating = updatingRowId === row.rowId;

                        return (
                          <tr key={row.rowId}>
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelectable && selectedRequestIdSet.has(numericRequestId)}
                                onChange={(event) =>
                                  isSelectable && handleToggleRowSelection(numericRequestId, event.target.checked)
                                }
                                disabled={!isSelectable || isBulkUpdating || isRowUpdating}
                                aria-label={`Select request ${row.orderId}`}
                              />
                            </td>
                            <td>{row.orderId}</td>
                            <td>{row.devotee}</td>
                            <td>
                              <span className={`pr-status ${toClassToken(row.status)}`}>
                                {row.status}
                              </span>
                            </td>
                            <td>
                              <span className={`pr-payment ${toClassToken(row.payment)}`}>
                                {row.payment}
                              </span>
                            </td>
                            <td>{row.totalCost}</td>
                            <td>{row.pujaDate}</td>
                            <td>{row.createdAt}</td>
                            <td>{row.docketNumber}</td>
                            <td>
                              <button
                                type="button"
                                className="pr-btn pr-btn-ghost pr-btn-small pr-btn-view"
                                onClick={() => handleViewOrderDetails(row)}
                              >
                                View
                              </button>
                            </td>
                            <td>
                              <div className="pr-inline-update">
                                <select
                                  value={rowStatusDrafts[row.rowId] || getEditableStatus(row.status)}
                                  onChange={(event) => handleRowStatusDraftChange(row.rowId, event.target.value)}
                                  disabled={isRowUpdating || isBulkUpdating || !isSelectable}
                                >
                                  {STATUS_UPDATE_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="pr-btn pr-btn-primary pr-btn-small"
                                  onClick={() => handleUpdateRowStatus(row)}
                                  disabled={isRowUpdating || isBulkUpdating || !isSelectable}
                                >
                                  {isRowUpdating ? "..." : "Update"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <p className="pr-footer-note">
                Showing {filteredRows.length} request(s)
                {!isAllRowsMode ? ` on page ${currentPage} of ${totalPages}` : ""}
                {totalItems > 0 ? ` (Total: ${totalItems})` : ""}
              </p>
              {filteredRows.length > 0 && !isAllRowsMode && (
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
                    Previous
                  </button>
                  <div className="pr-page-list">
                    {paginationPages.map((page, index) => {
                      const previousPage = paginationPages[index - 1];
                      const shouldShowGap = previousPage && page - previousPage > 1;
                      return (
                        <React.Fragment key={page}>
                          {shouldShowGap && <span className="pr-page-gap">...</span>}
                          <button
                            type="button"
                            className={`pr-page-btn ${currentPage === page ? "active" : ""}`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
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

export default PoojaRequests;

