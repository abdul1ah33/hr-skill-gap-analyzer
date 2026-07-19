from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
        plain_password: str,
        hashed_password: str,
) -> bool:
    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expire,
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return token


def decode_access_token(token: str) -> int:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise JWTError("Token does not contain a subject.")

        return int(user_id)

    except JWTError as exc:
        raise JWTError("Invalid or expired access token.") from exc