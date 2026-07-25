import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import EmployeeNavbar from "./components/EmployeeNavbar";
import Dashboard from "./pages/Dashboard";
import EmployeesPage from "./pages/EmployeesPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import RolesPage from "./pages/RolesPage";
import SkillsPage from "./pages/SkillsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import EmployeeAssessmentsPage from "./pages/EmployeeAssessmentsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEmployees } from "./hooks/useEmployees";

// Wrapper for HR Layout to keep existing UI untouched
const HRLayout = () => {
  const hrState = useEmployees();

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                employees={hrState.employees} 
                departments={hrState.departments} 
                positions={hrState.positions} 
                skills={hrState.skills} 
              />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <Dashboard 
                employees={hrState.employees} 
                departments={hrState.departments} 
                positions={hrState.positions} 
                skills={hrState.skills} 
              />
            } 
          />
          <Route 
            path="/employees" 
            element={
              <EmployeesPage 
                employees={hrState.employees}
                departments={hrState.departments}
                positions={hrState.positions}
                skills={hrState.skills}
                searchQuery={hrState.searchQuery}
                setSearchQuery={hrState.setSearchQuery}
                filterDepartment={hrState.filterDepartment}
                setFilterDepartment={hrState.setFilterDepartment}
                filterStatus={hrState.filterStatus}
                setFilterStatus={hrState.setFilterStatus}
                filteredEmployees={hrState.filteredEmployees}
                addEmployee={hrState.addEmployee}
                editEmployee={hrState.editEmployee}
                removeEmployee={hrState.removeEmployee}
              />
            } 
          />
          <Route 
            path="/departments" 
            element={
              <DepartmentsPage 
                departments={hrState.departments}
                addDepartment={hrState.addDepartment}
                deleteDepartment={hrState.deleteDepartment}
              />
            } 
          />
          <Route 
            path="/roles" 
            element={
              <RolesPage 
                positions={hrState.positions}
                departments={hrState.departments}
                addPosition={hrState.addPosition}
                deletePosition={hrState.deletePosition}
              />
            } 
          />
          <Route 
            path="/skills" 
            element={
              <SkillsPage 
                skills={hrState.skills}
                addSkill={hrState.addSkill}
                editSkill={hrState.editSkill}
                deleteSkill={hrState.deleteSkill}
              />
            } 
          />
          {/* Fallback for HR layout */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

// Wrapper for Employee Portal Layout
const EmployeeLayout = () => {
  return (
    <div className="app-container">
      <EmployeeNavbar />
      <main className="main-content">
        <Routes>
          <Route path="profile" element={<EmployeeProfilePage />} />
          <Route path="assessments" element={<EmployeeAssessmentsPage />} />
          <Route path="*" element={<Navigate to="/employee/profile" replace />} />
        </Routes>
      </main>
    </div>
  );
};

// Default entry point redirect component based on authentication and role
const RootRedirect = () => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === "HR") {
    return <Navigate to="/dashboard" replace />;
  } else if (role === "Employee") {
    return <Navigate to="/employee/profile" replace />;
  }

  return <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected HR Routes */}
      <Route element={<ProtectedRoute allowedRoles={["HR"]} />}>
        <Route path="/*" element={<HRLayout />} />
      </Route>

      {/* Protected Employee Routes */}
      <Route element={<ProtectedRoute allowedRoles={["Employee"]} />}>
        <Route path="/employee/*" element={<EmployeeLayout />} />
      </Route>

      {/* Default Catch-all & Root */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
