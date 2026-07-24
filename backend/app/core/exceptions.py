

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