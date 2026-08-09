import React, { useState, useEffect } from 'react';
import type { Employee } from '../types/employee';
import EmployeeCard from './EmployeeCard';

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    // Simulating fetching data from FastAPI with rich model data
    setEmployees([
      { id: 1, firstName: 'Abdullah', lastName: 'Ahmed', position: 'Software Engineer', department: 'IT' },
      { id: 2, firstName: 'John', lastName: 'Doe', position: 'Product Manager', department: 'Management' },
      { id: 3, firstName: 'Ahmed', lastName: 'Ali', position: 'UI/UX Designer', department: 'Design' },
    ]);
  }, []);

  return (
    <div>
      <h2>Employees</h2>
      <div className="employee-list">
        {employees.map((employee) => (
          <EmployeeCard key={employee.id} employee={employee} />
        ))}
      </div>
    </div>
  );
}