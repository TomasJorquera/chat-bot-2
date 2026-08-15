from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ... import models_v2 as m
from ...schemas_v2 import (
    CourseCreate, CourseOut,
    SubjectCreate, SubjectOut,
    CourseSubjectCreate, CourseSubjectOut,
)
from .deps import get_db

router = APIRouter()


# ── Courses ───────────────────────────────────────────────────────────────────
@router.post("/courses", response_model=CourseOut)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    course = m.Course(**payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/courses", response_model=list[CourseOut])
def list_courses(db: Session = Depends(get_db)):
    return db.query(m.Course).order_by(m.Course.created_at.desc()).all()


# ── Subjects ──────────────────────────────────────────────────────────────────
@router.post("/subjects", response_model=SubjectOut)
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db)):
    if db.query(m.Subject).filter(m.Subject.codigo == payload.codigo).first():
        raise HTTPException(status_code=409, detail="Ya existe un ramo con ese código.")
    subject = m.Subject(**payload.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(db: Session = Depends(get_db)):
    return db.query(m.Subject).order_by(m.Subject.codigo).all()


# ── Course-Subjects (docente asignado a ramo dentro de un curso) ─────────────
@router.post("/course-subjects", response_model=CourseSubjectOut)
def create_course_subject(payload: CourseSubjectCreate, db: Session = Depends(get_db)):
    link = m.TeacherSubject(**payload.model_dump())
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.get("/course-subjects", response_model=list[CourseSubjectOut])
def list_course_subjects(db: Session = Depends(get_db)):
    return db.query(m.TeacherSubject).order_by(m.TeacherSubject.created_at.desc()).all()
