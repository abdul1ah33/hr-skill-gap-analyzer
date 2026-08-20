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

import {
  addEmployeeSkill,
  updateEmployeeSkill,
  deleteEmployeeSkill,
} from "../services/employeeSkillService";

import { getSkills } from "../services/skillService";
import type { Skill } from "../types/employee";
import type { SkillLevel } from "../types/employeeSkills";


function EmployeeDetailsPage() {
  const { id } = useParams();

  const [employee, setEmployee] = useState<Employee | null>(null);

  // for add skill to employee form   
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showAddSkill, setShowAddSkill] = useState(false);  
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>("Beginner");
  const [addingSkill, setAddingSkill] = useState(false);

  // for editing skill
  const [editingSkillId, setEditingSkillId] = useState<number | null>(null);
  const [editingLevel, setEditingLevel] = useState<SkillLevel>("Beginner");

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

    useEffect(() => {
    getSkills()
        .then(setSkills)
        .catch((error) => {
        console.error("Failed to load skills:", error);
        });
    }, []);

    async function handleAddSkill() {
    if (!employee || !selectedSkillId) {
        return;
    }

    try {
        setAddingSkill(true);

        const newEmployeeSkill = await addEmployeeSkill(
        employee.id,
        {
            skill_id: Number(selectedSkillId),
            level: selectedLevel,
        }
        );

        setEmployee({
        ...employee,
        employee_skills: [
            ...employee.employee_skills,
            newEmployeeSkill,
        ],
        });

        setSelectedSkillId("");
        setSelectedLevel("Beginner");
        setShowAddSkill(false);
    } catch (error) {
        console.error("Failed to add employee skill:", error);
    } finally {
        setAddingSkill(false);
    }
    }

    async function handleUpdateSkill(
        skillId: number
        ) {
        if (!employee) {
            return;
        }

        try {
            const updatedSkill = await updateEmployeeSkill(
            employee.id,
            skillId,
            {
                level: editingLevel,
            }
            );

            setEmployee({
            ...employee,
            employee_skills: employee.employee_skills.map(
                (employeeSkill) =>
                employeeSkill.skill.id === skillId
                    ? updatedSkill
                    : employeeSkill
            ),
            });

            setEditingSkillId(null);
        } catch (error) {
            console.error(
            "Failed to update employee skill:",
            error
            );
        }
    }

    async function handleDeleteSkill(
    skillId: number
    ) {
    if (!employee) {
        return;
    }

    try {
        await deleteEmployeeSkill(
        employee.id,
        skillId
        );

        setEmployee({
        ...employee,
        employee_skills:
            employee.employee_skills.filter(
            (employeeSkill) =>
                employeeSkill.skill.id !== skillId
            ),
        });
    } catch (error) {
        console.error(
        "Failed to delete employee skill:",
        error
        );
    }
    }

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
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Skills</CardTitle>

            <Button
            type="button"
            onClick={() => setShowAddSkill(!showAddSkill)}
            >
            {showAddSkill ? "Cancel" : "Add Skill"}
            </Button>
        </CardHeader>

        <CardContent className="space-y-4">

            {showAddSkill && (
            <div className="border rounded-md p-4 space-y-4">

                <div>
                <label>Skill</label>

                <select
                    value={selectedSkillId}
                    onChange={(event) =>
                    setSelectedSkillId(event.target.value)
                    }
                >
                    <option value="">
                    Select Skill
                    </option>

                    {skills.map((skill) => (
                    <option
                        key={skill.id}
                        value={skill.id}
                    >
                        {skill.name}
                    </option>
                    ))}
                </select>
                </div>

                <div>
                <label>Level</label>

                <select
                    value={selectedLevel}
                    onChange={(event) =>
                    setSelectedLevel(
                        event.target.value as SkillLevel
                    )
                    }
                >
                    <option value="Beginner">
                    Beginner
                    </option>

                    <option value="Intermediate">
                    Intermediate
                    </option>

                    <option value="Advanced">
                    Advanced
                    </option>

                    <option value="Expert">
                    Expert
                    </option>
                </select>
                </div>

                <Button
                type="button"
                onClick={handleAddSkill}
                disabled={!selectedSkillId || addingSkill}
                >
                {addingSkill ? "Adding..." : "Add Skill"}
                </Button>

            </div>
            )}

            {employee.employee_skills.length === 0 ? (
            <p className="text-muted-foreground">
                No skills found.
            </p>
            ) : (
            <div className="space-y-3">
            {employee.employee_skills.map(
            (employeeSkill) => (
                <div
                key={employeeSkill.id}
                className="flex items-center justify-between border rounded-md p-3"
                >
                <div>
                    <p className="font-medium">
                    {employeeSkill.skill.name}
                    </p>
                </div>

                {editingSkillId === employeeSkill.id ? (
                    <div className="flex items-center gap-2">

                    <select
                        value={editingLevel}
                        onChange={(event) =>
                        setEditingLevel(
                            event.target.value as SkillLevel
                        )
                        }
                    >
                        <option value="Beginner">
                        Beginner
                        </option>

                        <option value="Intermediate">
                        Intermediate
                        </option>

                        <option value="Advanced">
                        Advanced
                        </option>

                        <option value="Expert">
                        Expert
                        </option>
                    </select>

                    <Button
                        type="button"
                        onClick={() =>
                        handleUpdateSkill(
                            employeeSkill.skill.id
                        )
                        }
                    >
                        Save
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                        setEditingSkillId(null)
                        }
                    >
                        Cancel
                    </Button>

                    </div>
                ) : (
                    <div className="flex items-center gap-2">

                    <span className="text-muted-foreground">
                        {employeeSkill.level}
                    </span>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                        setEditingSkillId(
                            employeeSkill.id
                        );

                        setEditingLevel(
                            employeeSkill.level as SkillLevel
                        );
                        }}
                    >
                        Edit
                    </Button>

                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() =>
                        handleDeleteSkill(
                            employeeSkill.skill.id
                        )
                        }
                    >
                        Remove
                    </Button>

                </div>
      )}
    </div>
  )
)}
            </div>
            )}

        </CardContent>
        </Card>

    </div>
    );
}

export default EmployeeDetailsPage;