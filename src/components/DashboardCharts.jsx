import React from "react";
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

const STATUS_COLORS = ["#20c997", "#0d6efd", "#ffc107", "#dc3545"];

const monthlyRevenueData = [
  { month: "Jan", revenue: 540000, previous: 480000, orders: 980 },
  { month: "Feb", revenue: 610000, previous: 520000, orders: 1085 },
  { month: "Mar", revenue: 690000, previous: 580000, orders: 1210 },
  { month: "Apr", revenue: 645000, previous: 605000, orders: 1160 },
  { month: "May", revenue: 735000, previous: 630000, orders: 1305 },
  { month: "Jun", revenue: 810000, previous: 710000, orders: 1410 },
  { month: "Jul", revenue: 780000, previous: 690000, orders: 1370 },
  { month: "Aug", revenue: 865000, previous: 740000, orders: 1495 },
  { month: "Sep", revenue: 915000, previous: 790000, orders: 1565 },
  { month: "Oct", revenue: 990000, previous: 860000, orders: 1640 },
  { month: "Nov", revenue: 1075000, previous: 930000, orders: 1765 },
  { month: "Dec", revenue: 1150000, previous: 995000, orders: 1880 },
];

const yearlyRevenueData = [
  { year: "2022", revenue: 6720000 },
  { year: "2023", revenue: 7810000 },
  { year: "2024", revenue: 8960000 },
  { year: "2025", revenue: 10130000 },
  { year: "2026", revenue: 11500000 },
];

const orderStatusData = [
  { name: "Completed", value: 64 },
  { name: "Processing", value: 18 },
  { name: "Pending", value: 12 },
  { name: "Cancelled", value: 6 },
];

const dailyOrdersData = [
  { day: "Mon", orders: 122 },
  { day: "Tue", orders: 138 },
  { day: "Wed", orders: 126 },
  { day: "Thu", orders: 149 },
  { day: "Fri", orders: 162 },
  { day: "Sat", orders: 173 },
  { day: "Sun", orders: 159 },
];

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

const DashboardCharts = () => {
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

      <div className="row g-3 dv-row-top">
        <div className="col-12 col-xl-8">
          <DashboardCard
            title="Monthly Revenue"
            subtitle="Shows business growth (most critical metric)"
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
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={orderTick} tick={{ fontSize: 12, fill: "#7a8699" }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "Revenue" || name === "Last Year") return [`Rs ${Number(value).toLocaleString("en-IN")}`, name];
                    return [Number(value).toLocaleString("en-IN"), name];
                  }}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e9ecef", boxShadow: "0 8px 20px rgba(15,23,42,0.08)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="url(#dvRevenueBarGradient)" radius={[8, 8, 0, 0]} barSize={24} />
                <Line yAxisId="left" type="monotone" dataKey="previous" name="Last Year" stroke="#6f42c1" strokeWidth={2.2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#ff9933" strokeWidth={2.2} dot={{ r: 2.5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </DashboardCard>
        </div>

        <div className="col-12 col-xl-4">
          <DashboardCard
            title="Orders by Status"
            subtitle="Helps monitor success, pending, failures"
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
                  {totalOrders}%
                </text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" fill="#7b8794" fontSize="12">
                  Total Mix
                </text>
                <Tooltip
                  formatter={(value) => [`${value}%`, "Share"]}
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
            subtitle="Tracks user activity and demand"
            chartHeight={230}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
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
            subtitle="Long-term performance overview"
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
            subtitle="Shows short-term trends and spikes"
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
    </section>
  );
};

export default DashboardCharts;
