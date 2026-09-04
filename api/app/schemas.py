from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- auth ----------

class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    username: str = Field(min_length=3, max_length=40, pattern=r"^[a-zA-Z0-9_.]+$")
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)


class LoginRequest(BaseModel):
    identifier: str  # username OR email
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    name: str
    last_name: str
    username: str
    email: EmailStr

    class Config:
        from_attributes = True


# ---------- groups ----------

class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    completed_icon: Optional[str] = Field(default=None, min_length=1, max_length=16)


class MemberOut(BaseModel):
    id: int
    name: str
    last_name: str
    username: str

    class Config:
        from_attributes = True


class GroupOut(BaseModel):
    id: int
    name: str
    invite_token: str
    completed_icon: str
    total: int
    completed: int
    progress: int
    stamps_per_card: int
    members: List[MemberOut]

    class Config:
        from_attributes = True


class HangoutLog(BaseModel):
    note: Optional[str] = Field(default=None, max_length=280)


class HangoutOut(BaseModel):
    id: int
    logged_by: int
    note: Optional[str]
    logged_at: datetime

    class Config:
        from_attributes = True


TokenResponse.model_rebuild()
