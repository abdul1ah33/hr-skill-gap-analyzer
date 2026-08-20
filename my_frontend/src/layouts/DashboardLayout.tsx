import { Link, Outlet, useNavigate } from "react-router-dom";

function DashboardLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("access_token");

    navigate("/login");
  }
  

  return (
    <div>
      <aside>
        <h2>AI HR App</h2>

        <nav>
          <div>
            <Link to="/dashboard">Dashboard</Link>
          </div>

          <div>
            <Link to="/employees">Employees</Link>
          </div>
          
          <div>
            <Link to="/departments">Departments</Link>
          </div>

          <div>
            <Link to="/positions">Positions</Link>
          </div>

          <div>
            <button onClick={handleLogout}>
              Logout
            </button>
          </div>

        </nav>
      </aside>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;