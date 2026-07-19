from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    email: EmailStr
    username: str
    password: str


class LoginRequest(BaseModel):
    login: str # can be either email or username
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str