import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { Employee } from "../types/employee";
import { getEmployees } from "../services/employeeService";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

import { Plus, Search, UserCircle2 } from "lucide-react";

function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const filteredEmployees = employees.filter((employee) => {
    const searchTerm = search.toLowerCase();
    const fullName =
      `${employee.first_name} ${employee.last_name}`.toLowerCase();
    return (
      fullName.includes(searchTerm) ||
      employee.email.toLowerCase().includes(searchTerm) ||
      employee.employee_number.toLowerCase().includes(searchTerm)
    );
  });

  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await getEmployees();
        setEmployees(data);
      } catch (error) {
        console.error("Failed to load employees:", error);
      } finally {
        setLoading(false);
      }
    }
    loadEmployees();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm" style={{ color: "#9ca3af" }}>Loading employees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1a1a2e" }}>
            Employees
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>
            {employees.length} total employees
          </p>
        </div>

        <Link to="/employees/add">
          <Button
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)", border: "none" }}
          >
            <Plus style={{ width: "16px", height: "16px" }} />
            Add Employee
          </Button>
        </Link>
      </div>

      {/* Table card */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: "#ffffff",
          border: "1px solid #e8eaf0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        {/* Card toolbar */}
        <div
          className="flex items-center gap-3 px-6 py-4"
          style={{ borderBottom: "1px solid #e8eaf0" }}
        >
          <div
            className="flex flex-1 items-center gap-2 rounded-xl px-4 py-2"
            style={{ background: "#f0f2f8", border: "1px solid #e8eaf0", maxWidth: "320px" }}
          >
            <Search style={{ width: "15px", height: "15px", color: "#9ca3af", flexShrink: 0 }} />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="border-0 bg-transparent p-0 text-sm shadow-none outline-none focus-visible:ring-0"
              style={{ color: "#1a1a2e" }}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow style={{ borderBottom: "1px solid #e8eaf0", background: "#fafbfc" }}>
              <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>
                Employee #
              </TableHead>
              <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>
                Name
              </TableHead>
              <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>
                Email
              </TableHead>
              <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>
                Department
              </TableHead>
              <TableHead className="px-6 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#9ca3af" }}>
                Position
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <UserCircle2 style={{ width: "40px", height: "40px", color: "#e8eaf0" }} />
                    <p className="text-sm" style={{ color: "#9ca3af" }}>No employees found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="transition-colors hover:bg-[#fafbff]"
                  style={{ borderBottom: "1px solid #f0f2f8" }}
                >
                  <TableCell className="px-6 py-4 text-sm font-mono" style={{ color: "#6b7280" }}>
                    {employee.employee_number}
                  </TableCell>

                  <TableCell className="px-6 py-4">
                    <Link
                      to={`/employees/${employee.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #6c63ff, #a78bfa)" }}
                      >
                        {employee.first_name[0]}{employee.last_name[0]}
                      </div>
                      <span
                        className="text-sm font-semibold group-hover:underline"
                        style={{ color: "#1a1a2e" }}
                      >
                        {employee.first_name} {employee.last_name}
                      </span>
                    </Link>
                  </TableCell>

                  <TableCell className="px-6 py-4 text-sm" style={{ color: "#6b7280" }}>
                    {employee.email}
                  </TableCell>

                  <TableCell className="px-6 py-4">
                    {(employee.department?.name || employee.position?.department?.name) ? (
                      <span
                        className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium"
                        style={{ background: "#ede8ff", color: "#6c63ff" }}
                      >
                        {employee.department?.name || employee.position?.department?.name}
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: "#d1d5db" }}>—</span>
                    )}
                  </TableCell>

                  <TableCell className="px-6 py-4 text-sm" style={{ color: "#6b7280" }}>
                    {employee.position?.title ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default EmployeesPage;