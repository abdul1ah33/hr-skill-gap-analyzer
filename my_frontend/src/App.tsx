import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import EmployeeLayout from "./layouts/EmployeeLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SkillsPage from "./pages/SkillsPage";
import EmployeesPage from "./pages/EmployeesPage";
import AddEmployeePage from "./pages/AddEmployeePage";
import EmployeeDetailsPage from "./pages/EmployeeDetailsPage";
import EditEmployeePage from "./pages/EditEmployeePage";
import DepartmentsPage from "./pages/DepartmentsPage";
import PositionsPage from "./pages/PositionsPage";
import PositionDetailsPage from "./pages/PositionDetailsPage";
import GapAnalysisPage from "./pages/GapAnalysisPage";
import GapAnalysisResultPage from "./pages/GapAnalysisResultPage";
import SkillAssessmentsPage from "./pages/SkillAssessmentsPage";
import EmployeeSkillAssessmentsPage from "./pages/EmployeeSkillAssessmentsPage";
import SettingsPage from "./pages/SettingsPage";
import AssessmentInstructionsPage from "./pages/AssessmentInstructionsPage";
import AssessmentPage from "./pages/AssessmentPage";
import AssessmentResultPage from "./pages/AssessmentResultPage";
import MyAssessmentsPage from "./pages/MyAssessmentsPage";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* HR */}
        <Route element={<ProtectedRoute roles={["HR"]} />}>

            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/employees/add" element={<AddEmployeePage /> } />
              <Route path="/employees/:id" element={<EmployeeDetailsPage />} />
              <Route path="/employees/:id/edit" element={<EditEmployeePage />} />
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/positions" element={<PositionsPage />} />
              <Route path="/positions/:id" element={<PositionDetailsPage />} />
              <Route path="/gap-analysis" element={<GapAnalysisPage />} />
              <Route path="/gap-analysis/:id" element={<GapAnalysisResultPage />} />
              <Route path="/skill-assessments" element={<SkillAssessmentsPage />} />
              <Route path="/skill-assessments/:id" element={<EmployeeSkillAssessmentsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

        </Route>

        {/* Employee portal */}
        <Route element={<ProtectedRoute roles={["Employee"]} />}>
          <Route element={<EmployeeLayout />}>
            <Route path="/my/assessments" element={<MyAssessmentsPage />} />
          </Route>
        </Route>

        {/* Taking a test (employee, or HR on the employee's behalf): full screen, no layout */}
        <Route element={<ProtectedRoute />}>
          <Route path="/assessments/start" element={<AssessmentInstructionsPage />} />
          <Route path="/assessments/:id/result" element={<AssessmentResultPage />} />
          <Route path="/assessments/:id" element={<AssessmentPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;