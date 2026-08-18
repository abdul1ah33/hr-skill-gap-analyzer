import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEmployeeById } from "../services/employeeService";
import type { Employee } from "../types/employee";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";


function EmployeeDetailsPage() {
  const { id } = useParams();

  const [employee, setEmployee] =
    useState<Employee | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    getEmployeeById(Number(id))
      .then(setEmployee)
      .catch((error) => {
        console.error(error);
      });
  }, [id]);

  if (!employee) {
    return <p>Loading...</p>;
  }

    return (
    <div className="space-y-6">
        <Link to="/employees">
        Back to Employees
        </Link>

        <div>
        <h1 className="text-3xl font-bold">
            {employee.first_name} {employee.last_name}
        </h1>

        <Link to={`/employees/${employee.id}/edit`}>
            <Button>
                Edit Employee
            </Button>
        </Link>

        <p className="text-muted-foreground">
            {employee.employee_number}
        </p>
        </div>

        <Card>
        <CardHeader>
            <CardTitle>Employee Information</CardTitle>
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-4">

            <p className="text-sm text-muted-foreground">
            Email: {employee.email}
            </p>

            <p className="text-sm text-muted-foreground">
            Phone: {employee.phone}
            </p>

            <p className="text-sm text-muted-foreground"    >
            Department:
            {employee.department?.name ?? "—"}
            </p>

            <p className="text-sm text-muted-foreground">

            Position:
            {employee.position?.title ?? "—"}
            </p>

        </CardContent>
        </Card>

        <Card>
        <CardHeader>
            <CardTitle>Education</CardTitle>
        </CardHeader>

        <CardContent>
            {employee.education.length === 0 ? (
            <p className="text-muted-foreground">
                No education records found.
            </p>
            ) : (
            <div className="space-y-3">
                {employee.education.map((education) => (
                <div key={education.id}>
                    <p>
                    {education.description}
                    </p>
                </div>
                ))}
            </div>
            )}
        </CardContent>
        </Card>

        <Card>
        <CardHeader>
            <CardTitle>Certifications</CardTitle>
        </CardHeader>

        <CardContent>
            {employee.certifications.length === 0 ? (
            <p className="text-muted-foreground">
                No certifications found.
            </p>
            ) : (
            <div className="space-y-3">
                {employee.certifications.map((certification) => (
                <div key={certification.id}>
                    <p>
                    {certification.name}
                    </p>
                </div>
                ))}
            </div>
            )}
        </CardContent>
        </Card>

        <Card>
        <CardHeader>
            <CardTitle>Skills</CardTitle>
        </CardHeader>

        <CardContent>
            {employee.employee_skills.length === 0 ? (
            <p className="text-muted-foreground">
                No skills found.
            </p>
            ) : (
            <div className="space-y-3">
                {employee.employee_skills.map((employeeSkill) => (
                <div
                    key={employeeSkill.id}
                    className="flex items-center justify-between"
                >
                    <p>
                    {employeeSkill.skill.name}
                    </p>

                    <p className="text-muted-foreground">
                    {employeeSkill.level}
                    </p>
                </div>
                ))}
            </div>
            )}
        </CardContent>
        </Card>

    </div>
    );
}

export default EmployeeDetailsPage;