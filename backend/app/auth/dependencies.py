from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.auth import crud
from app.core.security import decode_access_token
from app.models.user import User