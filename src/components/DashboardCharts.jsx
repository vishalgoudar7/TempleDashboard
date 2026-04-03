import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
} from "recharts";
import { dashboardData } from "../data/dashboardData";
import { getApiErrorMessage } from "../api/errors";
import { fetchAllPoojaRequestRows } from "../api/templeOfficerApi";
import { buildDashboardDataFromPoojaRows } from "../utils/dashboardChartData";

const STATUS_COLORS = ["#20c997", "#0d6efd", "#ffc107", "#dc3545"];

const rupeeTick = (value) => `Rs ${(value / 100000).toFixed(1)}L`;
const orderTick = (value) => `${Math.round(value / 100) / 10}k`;

const DashboardCard = ({ title, subtitle, children, chartHeight = 320 }) => (
  <div className="dv-card h-100">
    <div className="dv-card-header">
      <h5 className="dv-card-title">{title}</h5>
      {subtitle ? <p className="dv-card-subtitle">{subtitle}</p> : null}
    </div>
    <div className="dv-card-chart" style={{ height: chartHeight }}>
      {children}
    </div>
  </div>
);

const DashboardCharts = ({ data, rows, isLoading = false, loadFromApi = false, search = "" }) => {
  const rowsDerivedData = useMemo(() => {
    if (!Array.isArray(rows)) return null;
    return buildDashboardDataFromPoojaRows(rows);
  }, [rows]);

  const [apiData, setApiData] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const shouldFetchFromApi = loadFromApi && !data && !Array.isArray(rows);

  useEffect(() => {
    let isMounted = true;

    const loadApiCharts = async () => {
      if (!shouldFetchFromApi) return;

      setApiLoading(true);
      setApiError("");

      try {
        const apiRows = await fetchAllPoojaRequestRows({
          search: search || "",
          size: 100,
          maxPages: 100,
          concurrency: 6,
        });

        if (!isMounted) return;
        setApiData(buildDashboardDataFromPoojaRows(apiRows));
      } catch (fetchError) {
        if (!isMounted) return;
        console.error("Unable to load chart analytics.", fetchError);
        setApiError(getApiErrorMessage(fetchError, "Unable to load chart analytics right now."));
      } finally {
        if (isMounted) {
          setApiLoading(false);
        }
      }
    };

    loadApiCharts();

    return () => {
      isMounted = false;
    };
  }, [search, shouldFetchFromApi]);

  const effectiveData = data || rowsDerivedData || apiData || dashboardData;
  const showLoading = isLoading || apiLoading;
  const showError = !showLoading && shouldFetchFromApi && Boolean(apiError);

  const monthlyRevenueData = effectiveData.monthlyRevenue.labels.map((month, index) => ({
    month,
    revenue: effectiveData.monthlyRevenue.data[index],
    trend: Math.round(
      (effectiveData.monthlyRevenue.data[index - 1] ?? effectiveData.monthlyRevenue.data[index]) * 0.98
    ),
  }));

  const monthlyOrdersData = effectiveData.monthlyOrders.labels.map((month, index) => ({
    month,
    orders: effectiveData.monthlyOrders.data[index],
  }));

  const yearlyRevenueData = effectiveData.yearlyRevenue.labels.map((year, index) => ({
    year: String(year),
    revenue: effectiveData.yearlyRevenue.data[index],
  }));

  const dailyOrdersData = effectiveData.dailyOrders.labels.map((day, index) => ({
    day,
    orders: effectiveData.dailyOrders.data[index],
  }));

  const orderStatusData = effectiveData.ordersByStatus;
  const totalOrders = orderStatusData.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="dv-analytics-root">
      <style>{`
        .dv-analytics-root {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 14px;
          font-family: Inter, Poppins, "Segoe UI", Arial, sans-serif;
        }
        .dv-card {
          background: #ffffff;
          border: 1px solid #e9ecef;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          padding: 14px 14px 12px;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          display: flex;
          flex-direction: column;
        }
        .dv-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.1);
        }
        .dv-card-header {
          margin-bottom: 10px;
        }
        .dv-card-title {
          margin: 0;
          color: #1f2a44;
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: 0.1px;
        }
        .dv-card-subtitle {
          margin: 4px 0 0;
          color: #6c757d;
          font-size: 0.88rem;
          line-height: 1.35;
        }
        .dv-card-chart {
          flex: 1 1 auto;
          min-height: 0;
        }
        .dv-state {
          min-height: 220px;
          border: 1px dashed rgba(100, 116, 139, 0.45);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: #475569;
          background: #f8fafc;
          text-align: center;
          padding: 16px;
        }
        .dv-state-error {
          color: #b91c1c;
          border-color: rgba(185, 28, 28, 0.35);
          background: #fff1f2;
        }
        @media (min-width: 1200px) {
          .dv-analytics-root {
            padding: 10px;
          }
          .dv-card {
            padding: 10px 12px 9px;
            border-radius: 14px;
          }
          .dv-card-header {
            margin-bottom: 6px;
          }
          .dv-card-title {
            font-size: 0.96rem;
          }
          .dv-card-subtitle {
            font-size: 0.76rem;
            line-height: 1.2;
            margin-top: 2px;
          }
        }
        @media (max-width: 575px) {
          .dv-analytics-root {
            padding: 12px;
          }
          .dv-card {
            padding: 12px;
            border-radius: 14px;
          }
        }
      `}</style>

      {showLoading ? <div className="dv-state">Loading chart data from API...</div> : null}
      {showError ? <div className="dv-state dv-state-error">{apiError}</div> : null}
      {!showLoading && !showError ? (
        <>
      <div className="row g-3 dv-row-top">
        <div className="col-12 col-xl-8">
          <DashboardCard
            title="Monthly Revenue"
            subtitle="Most important business chart. Shows growth month by month."
            chartHeight={320}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyRevenueData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dvRevenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d6efd" stopOpacity={0.92} />
                    <stop offset="100%" stopColor="#6f42c1" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7a8699" }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={rupeeTick} tick={{ fontSize: 12, fill: "#7a8699" }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "Revenue" || name === "Trend") return [`Rs ${Number(value).toLocaleString("en-IN")}`, name];
                    return [Number(value).toLocaleString("en-IN"), name];
                  }}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e9ecef", boxShadow: "0 8px 20px rgba(15,23,42,0.08)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="url(#dvRevenueBarGradient)" radius={[8, 8, 0, 0]} barSize={24} />
                <Line yAxisId="left" type="monotone" dataKey="trend" name="Trend" stroke="#6f42c1" strokeWidth={2.2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </DashboardCard>
        </div>

        <div className="col-12 col-xl-4">
          <DashboardCard
            title="Orders by Status"
            subtitle="Helps track completed, pending, processing, and cancelled orders."
            chartHeight={320}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="dvSaffronHalo" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ff9933" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Pie
                  data={orderStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={76}
                  outerRadius={112}
                  paddingAngle={2}
                  stroke="none"
                >
                  {orderStatusData.map((item, index) => (
                    <Cell key={item.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <circle cx="50%" cy="50%" r="55" fill="url(#dvSaffronHalo)" />
                <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" fill="#1f2a44" fontSize="28" fontWeight="700">
                  {totalOrders.toLocaleString("en-IN")}
                </text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" fill="#7b8794" fontSize="12">
                  Total Orders
                </text>
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString("en-IN"), "Orders"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e9ecef", boxShadow: "0 8px 20px rgba(15,23,42,0.08)" }}
                />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </DashboardCard>
        </div>
      </div>

      <div className="row g-3 dv-row-bottom">
        <div className="col-12 col-md-6 col-xl-4">
          <DashboardCard
            title="Monthly Orders"
            subtitle="Shows order volume trend and user activity."
            chartHeight={230}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyOrdersData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7a8699" }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={orderTick} tick={{ fontSize: 12, fill: "#7a8699" }} />
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString("en-IN"), "Orders"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e9ecef", boxShadow: "0 8px 20px rgba(15,23,42,0.08)" }}
                />
                <Bar dataKey="orders" name="Orders" fill="#0d6efd" radius={[8, 8, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </DashboardCard>
        </div>

        <div className="col-12 col-md-6 col-xl-4">
          <DashboardCard
            title="Yearly Revenue"
            subtitle="Good for long-term performance overview."
            chartHeight={230}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyRevenueData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7a8699" }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={rupeeTick} tick={{ fontSize: 12, fill: "#7a8699" }} />
                <Tooltip
                  formatter={(value) => [`Rs ${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e9ecef", boxShadow: "0 8px 20px rgba(15,23,42,0.08)" }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#6f42c1" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: "#ffffff" }} />
              </LineChart>
            </ResponsiveContainer>
          </DashboardCard>
        </div>

        <div className="col-12 col-md-12 col-xl-4">
          <DashboardCard
            title="Daily Orders Trend"
            subtitle="Useful for short-term activity and demand spikes."
            chartHeight={230}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyOrdersData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f7" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7a8699" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7a8699" }} />
                <Tooltip
                  formatter={(value) => [Number(value).toLocaleString("en-IN"), "Orders"]}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e9ecef", boxShadow: "0 8px 20px rgba(15,23,42,0.08)" }}
                />
                <Line type="monotone" dataKey="orders" stroke="#0d6efd" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: "#ffffff" }} />
              </LineChart>
            </ResponsiveContainer>
          </DashboardCard>
        </div>
      </div>
        </>
      ) : null}
    </section>
  );
};

export default DashboardCharts;
