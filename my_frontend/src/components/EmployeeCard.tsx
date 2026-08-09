import React from 'react';
import type { Employee } from '../types/employee';

interface EmployeeCardProps {
  employee: Employee;
}

export default function EmployeeCard({ employee }: EmployeeCardProps) {
  return (
    <div className="employee-card">
      <h3>{employee.firstName} {employee.lastName}</h3>
      <p><strong>Position:</strong> {employee.position}</p>
      <p><strong>Department:</strong> {employee.department}</p>
    </div>
  );
}