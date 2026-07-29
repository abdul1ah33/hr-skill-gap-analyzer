from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.core.paths

from app.auth.router import router as auth_router

from app.api.endpoints.employees import router as employee_router
from app.api.endpoints.departments import router as department_router
from app.api.endpoints.positions import router as position_router
from app.api.endpoints.skills import router as skill_router
from app.api.endpoints.me import router as me_router
from app.api.endpoints.employee_skill import router as employee_skill_router
from app.api.endpoints.position_skill import router as position_skill_router
from app.api.endpoints.resume import router as resume_router

from app.core.exception_handlers import register_exception_handlers

app = FastAPI(
    title="AI-Based HR Assisting App",
    description="REST API for the AI-powered HR assistant.",
    version="1.0.0",
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routers ─────────────────────────────────────────────────────────────────

app.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"],
)

app.include_router(
    me_router,
    prefix="/me",
    tags=["Me"],
)

app.include_router(
    employee_router,
    prefix="/employees",
    tags=["Employees"],
)

app.include_router(
    department_router,
    prefix="/departments",
    tags=["Departments"],
)

app.include_router(
    position_router,
    prefix="/positions",
    tags=["Positions"],
)

app.include_router(
    skill_router,
    prefix="/skills",
    tags=["Skills"],
)

app.include_router(
    employee_skill_router,
    prefix="/employees/{employee_id}/skills",
    tags=["Employee Skills"],
)

app.include_router(
    position_skill_router,
    prefix="/positions/{position_id}/skills",
    tags=["Position Skills"],
)

app.include_router(
    resume_router,
    prefix="/resume",
    tags=["Resume Import"],
)

# ─── Health check ─────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {"message": "Welcome to the AI HR Assistant API"}