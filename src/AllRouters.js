import { BrowserRouter, Route, Routes } from "react-router-dom";
import PoojaRequests from "./components/PoojaRequests";
import TempleOfficerDashboard from "./components/TempleOfficerDashboard";
import TempleOfficerLogin from "./components/TempleOfficerLogin";

const AllRouters = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TempleOfficerLogin />} />
        <Route path="/temple-officer/login" element={<TempleOfficerLogin />} />
        <Route path="/temple-officer/dashboard" element={<TempleOfficerDashboard />} />
        <Route path="/temple-officer/requests" element={<PoojaRequests />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AllRouters;
