from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from ..core.database import get_db
from ..core.security import get_current_user
from ..models import Group, GroupMember, Hangout, User
from ..schemas import GroupCreate, GroupOut, GroupUpdate, HangoutLog

router = APIRouter(prefix="/groups", tags=["Groups"])

STAMPS_PER_CARD = 10


def _serialize(group: Group) -> GroupOut:
    total = len(group.hangouts)
    return GroupOut(
        id=group.id,
        name=group.name,
        invite_token=group.invite_token,
        completed_icon=group.completed_icon,
        total=total,
        completed=total // STAMPS_PER_CARD,
        progress=total % STAMPS_PER_CARD,
        stamps_per_card=STAMPS_PER_CARD,
        members=group.members and [m.user for m in group.members],
    )


def _get_membership_or_404(db: Session, group_id: int, user_id: int) -> Group:
    group = (
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user), joinedload(Group.hangouts))
        .filter(Group.id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")
    is_member = any(m.user_id == user_id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No perteneces a este grupo")
    return group


@router.post("", response_model=GroupOut)
def create_group(payload: GroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = Group(name=payload.name, created_by=current_user.id)
    db.add(group)
    db.flush()  # get group.id before inserting the membership row

    db.add(GroupMember(group_id=group.id, user_id=current_user.id))
    db.commit()

    group = (
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user), joinedload(Group.hangouts))
        .filter(Group.id == group.id)
        .first()
    )
    return _serialize(group)


@router.get("/mine", response_model=List[GroupOut])
def my_groups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    groups = (
        db.query(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .filter(GroupMember.user_id == current_user.id)
        .options(joinedload(Group.members).joinedload(GroupMember.user), joinedload(Group.hangouts))
        .all()
    )
    return [_serialize(g) for g in groups]


@router.get("/{group_id}", response_model=GroupOut)
def get_group(group_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = _get_membership_or_404(db, group_id, current_user.id)
    return _serialize(group)


@router.patch("/{group_id}", response_model=GroupOut)
def update_group(
    group_id: int,
    payload: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_membership_or_404(db, group_id, current_user.id)
    if payload.name is not None:
        group.name = payload.name
    if payload.completed_icon is not None:
        group.completed_icon = payload.completed_icon
    db.commit()
    db.refresh(group)
    return _serialize(group)


@router.post("/{group_id}/log", response_model=GroupOut)
def log_hangout(
    group_id: int,
    payload: HangoutLog,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = _get_membership_or_404(db, group_id, current_user.id)
    db.add(Hangout(group_id=group.id, logged_by=current_user.id, note=payload.note))
    db.commit()

    group = (
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user), joinedload(Group.hangouts))
        .filter(Group.id == group_id)
        .first()
    )
    return _serialize(group)


@router.post("/join/{invite_token}", response_model=GroupOut)
def join_group(invite_token: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = db.query(Group).filter(Group.invite_token == invite_token).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ese enlace de invitación no es válido")

    already_member = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group.id, GroupMember.user_id == current_user.id)
        .first()
    )
    if not already_member:
        db.add(GroupMember(group_id=group.id, user_id=current_user.id))
        db.commit()

    group = (
        db.query(Group)
        .options(joinedload(Group.members).joinedload(GroupMember.user), joinedload(Group.hangouts))
        .filter(Group.id == group.id)
        .first()
    )
    return _serialize(group)
