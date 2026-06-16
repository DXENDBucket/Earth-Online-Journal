from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    display_name = Column(String, default="地球旅人")
    handle = Column(String, default="EOJ-2049")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关联
    tasks = relationship("Task", back_populates="user")
    quests = relationship("AcceptedQuest", back_populates="user")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)
    intensity = Column(String(20), nullable=False)  # "light" | "normal"
    source = Column(String(50), default="用户发布")
    status = Column(String(20), default="pending")  # "pending" | "approved"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)
    pool_id = Column(String(50), default='public', nullable=False)
    user = relationship("User", back_populates="tasks")


class AcceptedQuest(Base):
    __tablename__ = "accepted_quests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    # 新增以下三个字段，从任务复制过来，避免每次 join
    text = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)
    source = Column(String(50), nullable=False)
    status = Column(String(20), default="todo")
    accepted_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    reflection = Column(Text, default="")
    photo_name = Column(String(200), default="")
    photo_data_url = Column(Text, default="")
    pool_id = Column(String(50), default='public', nullable=False)
    user = relationship("User", back_populates="quests")