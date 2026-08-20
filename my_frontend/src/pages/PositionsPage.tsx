import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

import { getPositions, createPosition, deletePosition } from "../services/positionService";
import { getDepartments } from "../services/departmentService";

import type { Position } from "../types/position";
import type { Department } from "../types/department";

function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData() {
    try {
      const [positionsData, departmentsData] =
        await Promise.all([
          getPositions(),
          getDepartments(),
        ]);

      setPositions(positionsData);
      setDepartments(departmentsData);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreatePosition(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    if (!departmentId) {
      alert("Please select a department.");
      return;
    }

    try {
      setLoading(true);

      await createPosition({
        title: title.trim(),
        department_id: Number(departmentId),
      });

      setTitle("");
      setDepartmentId("");

      await loadData();
    } catch (error) {
      console.error("Failed to create position:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePosition(positionId: number) {
    const confirmed = window.confirm(
        "Are you sure you want to delete this position?"
    );

    if (!confirmed) {
        return;
    }

    try {
        await deletePosition(positionId);

        await loadData();
    } catch (error: any) {
        console.error("Failed to delete position:", error);

        if (error.response?.data?.detail) {
        alert(error.response.data.detail);
        } else {
        alert("Failed to delete position.");
        }
    }
    }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">
        Positions
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Add Position</CardTitle>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleCreatePosition}
            className="space-y-4"
          >
            <div>
              <label>Position Title</label>

              <Input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="e.g. Software Engineer"
              />
            </div>

            <div>
              <label>Department</label>

              <select
                value={departmentId}
                onChange={(event) =>
                  setDepartmentId(event.target.value)
                }
                className="w-full border rounded-md p-2"
              >
                <option value="">
                  Select Department
                </option>

                {departments.map((department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating..." : "Add Position"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Positions</CardTitle>
        </CardHeader>

        <CardContent>
          {positions.length === 0 ? (
            <p className="text-muted-foreground">
              No positions found.
            </p>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between border-b pb-3"
                >
                  <div>
                    <p className="font-medium">
                      {position.title}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Department:{" "}
                      {position.department?.name ??
                        "No department"}
                    </p>
                  </div>

                  <Button variant="destructive"
                  onClick={() => handleDeletePosition(position.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PositionsPage;