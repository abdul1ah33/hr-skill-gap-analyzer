import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import EmployeesPage from "./pages/EmployeesPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import RolesPage from "./pages/RolesPage";
import SkillsPage from "./pages/SkillsPage";
import AIAssessmentPage from "./pages/AIAssessmentPage";
import RecruitmentPage from "./pages/RecruitmentPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import EmployeeAssessmentsPage from "./pages/EmployeeAssessmentsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEmployees } from "./hooks/useEmployees";
import { AppLayout } from "./components/layout/AppLayout";

// Wrapper for HR Layout to keep existing UI untouched
const HRLayout = () => {
  const hrState = useEmployees();

  return (
    <AppLayout>
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
              setSkills={hrState.setSkills}
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
              skills={hrState.skills}
              addPosition={hrState.addPosition}
              deletePosition={hrState.deletePosition}
            />
          }
        />
        <Route
          path="/positions"
          element={
            <RolesPage
              positions={hrState.positions}
              departments={hrState.departments}
              skills={hrState.skills}
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
        <Route
          path="/skill-aliases"
          element={
            <SkillsPage
              skills={hrState.skills}
              addSkill={hrState.addSkill}
              editSkill={hrState.editSkill}
              deleteSkill={hrState.deleteSkill}
            />
          }
        />
        <Route
          path="/assessment"
          element={
            <AIAssessmentPage
              employees={hrState.employees}
              positions={hrState.positions}
            />
          }
        />
        <Route path="/recruitment" element={<RecruitmentPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Fallback for HR layout */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
};

// Wrapper for Employee Portal Layout
const EmployeeLayout = () => {
  return (
    <AppLayout>
      <Routes>
        <Route path="profile" element={<EmployeeProfilePage />} />
        <Route path="assessments" element={<EmployeeAssessmentsPage />} />
        <Route path="*" element={<Navigate to="/employee/profile" replace />} />
      </Routes>
    </AppLayout>
  );
};

// Default entry point redirect component based on authentication and role
const RootRedirect = () => {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
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
