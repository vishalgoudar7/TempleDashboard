import React, { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const PoojaRequests = lazy(() => import("./components/PoojaRequests"));
const OrderDetails = lazy(() => import("./components/OrderDetails"));
const TempleOfficerDashboard = lazy(() => import("./components/TempleOfficerDashboard"));
const TempleOfficerLogin = lazy(() => import("./components/TempleOfficerLogin"));
const TransactionTable = lazy(() => import("./components/TransactionTable"));

const RouteLoader = () => (
  <div
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "18px",
      fontWeight: 600,
      color: "#34495e",
      fontFamily: "Poppins, sans-serif",
      background: "#f7f9fb",
    }}
  >
    Loading dashboard...
  </div>
);

const AllRouters = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<TempleOfficerLogin />} />
          <Route path="/temple-officer/login" element={<TempleOfficerLogin />} />
          <Route path="/temple-officer/dashboard" element={<TempleOfficerDashboard />} />
          <Route path="/temple-officer/transactions" element={<TransactionTable />} />
          <Route path="/temple-officer/requests" element={<PoojaRequests />} />
          <Route path="/temple-officer/requests/:requestId" element={<OrderDetails />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AllRouters;
