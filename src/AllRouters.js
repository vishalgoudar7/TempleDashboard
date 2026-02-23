// import React from "react";
// import { Routes, Route, Navigate } from "react-router-dom";
// import PujariLogin from "./components/PujariLogin";
// import PujariDashboard from "./components/PujariDashboard";

// // ✅ Private route wrapper (checks token before opening dashboard)
// const PrivateRoute = ({ children }) => {
//   const token = localStorage.getItem("pujariToken");
//   return token ? children : <Navigate to="/" />;
// };

// const AllRouters = () => {
//   return (
//     <Routes>
//       {/* Default login page */}
//       <Route path="/" element={<PujariLogin />} />

//       {/* Dashboard (Protected Route) */}
//       <Route
//         path="/pujari-dashboard"
//         element={
//           <PrivateRoute>
//             <PujariDashboard />
//           </PrivateRoute>
//         }
//       />
//     </Routes>
//   );
// };

// export default AllRouters;







// import React from 'react';
// import { Routes, Route } from 'react-router-dom';
// import PujariLogin from './components/PujariLogin';
// import PujariDashboard from './components/PujariDashboard';

// const AllRouters = () => {
//   return (
//     <Routes>
//       <Route path="/" element={<PujariLogin />} />
//       <Route path="/pujari-dashboard" element={<PujariDashboard />} />
//     </Routes>
//   );
// };

// export default AllRouters;












import { BrowserRouter, Routes, Route } from "react-router-dom";
import PujariLogin from "./components/PujariLogin";
import PujariDashboard from "./components/PujariDashboard";

const AllRouters = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PujariLogin />} />
        <Route path="/pujari/login" element={<PujariLogin />} />
        <Route path="/pujari/dashboard" element={<PujariDashboard />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AllRouters;
