import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

import {
  getDepartments,
  createDepartment,
  deleteDepartment,
} from "../services/departmentService";

import type { Department } from "../types/department";

function DepartmentsPage() {
  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [name, setName] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error(
        "Failed to load departments:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      return;
    }

    try {
      setCreating(true);

      const department =
        await createDepartment({
          name: name.trim(),
        });

      setDepartments((current) => [
        ...current,
        department,
      ]);

      setName("");
    } catch (error) {
      console.error(
        "Failed to create department:",
        error
      );
    } finally {
      setCreating(false);
    }
  }

    async function handleDelete(
    departmentId: number
    ) {
    const confirmed = window.confirm(
        "Are you sure you want to delete this department?"
    );

    if (!confirmed) {
        return;
    }

    try {
        await deleteDepartment(departmentId);

        await loadDepartments();
    } catch (error: any) {
        console.error(
        "Failed to delete department:",
        error
        );

        if (error.response?.data?.detail) {
        alert(error.response.data.detail);
        } else {
        alert("Failed to delete department.");
        }
    }
    }

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="space-y-6">

      <h1 className="text-3xl font-bold">
        Departments
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>
            Add Department
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <Input
            placeholder="Department name"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
          />

          <Button
            type="button"
            onClick={handleCreate}
            disabled={
              creating || !name.trim()
            }
          >
            {creating
              ? "Creating..."
              : "Add Department"}
          </Button>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Existing Departments
          </CardTitle>
        </CardHeader>

        <CardContent>
          {departments.length === 0 ? (
            <p className="text-muted-foreground">
              No departments found.
            </p>
          ) : (
            <div className="space-y-3">
              {departments.map(
                (department) => (
                  <div
                    key={department.id}
                    className="flex items-center justify-between border rounded-md p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {department.name}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() =>
                        handleDelete(
                          department.id
                        )
                      }
                    >
                      Remove
                    </Button>
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

export default DepartmentsPage;