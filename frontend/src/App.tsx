import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import EmployeesPage from "./pages/EmployeesPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import RolesPage from "./pages/RolesPage";
import SkillsPage from "./pages/SkillsPage";
import { useEmployees } from "./hooks/useEmployees";

function App() {
  const hrState = useEmployees();

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Sidebar Nav */}
        <Navbar />

        {/* Main Content Area */}
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
                  deleteSkill={hrState.deleteSkill}
                />
              } 
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
