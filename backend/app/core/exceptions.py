

class EmployeeNotFoundError(Exception):
    """Raised when the requested employee does not exist."""
    def __init__(self):
        super().__init__("Employee not found")


class SkillNotFoundError(Exception):
    """Raised when the requested skill does not exist."""
    def __init__(self):
        super().__init__("Skill not found")


class EmployeeSkillAlreadyExistsError(Exception):
    """Raised when an employee already has the given skill."""
    def __init__(self):
        super().__init__("Employee skill already exists")


class EmployeeSkillNotFoundError(Exception):
    def __init__(self):
        super().__init__("Employee does not have this skill.")


class PositionNotFoundError(Exception):
    """Raised when the requested position does not exist."""

    def __init__(self):
        super().__init__("Position not found.")


class PositionSkillNotFoundError(Exception):
    """Raised when a position does not require the given skill."""
    def __init__(self):
        super().__init__("Position does not require this skill.")


class PositionSkillAlreadyExistsError(Exception):
    """Raised when a position already requires the given skill."""
    def __init__(self):
        super().__init__("Position already requires this skill.")

# ─── Skill assessments ───────────────────────────────────────────────────────

class PositionHasNoSkillsError(Exception):
    """Raised when the position's required skills haven't been generated yet."""
    def __init__(self):
        super().__init__("The employee's position has no required skills yet.")


class NoAssessableSkillsError(Exception):
    """Raised when none of the required skills can be tested."""
    def __init__(self, not_assessable: list | None = None):
        super().__init__("None of the required skills can be assessed.")
        self.not_assessable = not_assessable or []
