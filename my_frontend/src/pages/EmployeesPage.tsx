import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { Employee } from "../types/employee";
import { getEmployees } from "../services/employeeService";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

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
    return <p>Loading employees...</p>;
  }

  return (
    <div>
      <h1>Employees</h1>

      <Button>
        <Link to="/employees/add">
          Add Employee
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>

        <CardContent>
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Table>

            <TableHeader>
              <TableRow>
                <TableHead>Employee Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>

                    <TableCell>
                      {employee.employee_number}
                    </TableCell>

                    <TableCell>
                      <Link to={`/employees/${employee.id}`}>
                        {employee.first_name} {employee.last_name}
                      </Link>
                    </TableCell>

                    <TableCell>
                      {employee.email}
                    </TableCell>

                    <TableCell>
                      {employee.department?.name ?? "—"}
                    </TableCell>

                    <TableCell>
                      {employee.position?.title ?? "—"}
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>

          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default EmployeesPage;