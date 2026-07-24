from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette import status

from app.core.exceptions import (
    EmployeeNotFoundError,
    SkillNotFoundError,
    EmployeeSkillAlreadyExistsError,
    EmployeeSkillNotFoundError,
)


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(EmployeeNotFoundError)
    async def employee_not_found_exception_handler(
        request: Request, exc: EmployeeNotFoundError
    ):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": str(exc)},
        )

    @app.exception_handler(SkillNotFoundError)
    async def skill_not_found_exception_handler(
        request: Request, exc: SkillNotFoundError
    ):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": str(exc)},
        )

    @app.exception_handler(EmployeeSkillAlreadyExistsError)
    async def employee_skill_already_exists_exception_handler(
        request: Request, exc: EmployeeSkillAlreadyExistsError
    ):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": str(exc)},
        )

    @app.exception_handler(EmployeeSkillNotFoundError)
    async def employee_skill_not_found_exception_handler(
        request: Request, exc: EmployeeSkillNotFoundError
    ):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": str(exc)},
        )