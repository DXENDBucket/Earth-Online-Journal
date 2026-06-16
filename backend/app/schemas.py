from pydantic import BaseModel
from typing import Optional
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    display_name: str
    handle: str

class UserUpdate(BaseModel):
    display_name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TaskBase(BaseModel):
    text: str
    category: str
    intensity: str  # "light" | "normal"

class TaskCreate(TaskBase):
    pass

class TaskOut(TaskBase):
    id: int
    user_id: int
    source: str
    pool_id: str
    status: str  # "pending" | "approved"
    created_at: datetime
    approved_at: Optional[datetime] = None

class TaskApprove(BaseModel):
    task_id: int

# ===== 已接取任务相关 =====
class AcceptedQuestBase(BaseModel):
    task_id: int
    text: str
    category: str
    source: str

class AcceptedQuestOut(AcceptedQuestBase):
    id: int
    user_id: int
    status: str  # "todo" | "done"
    pool_id: str
    accepted_at: datetime
    completed_at: Optional[datetime]
    reflection: str
    photo_name: str
    photo_data_url: str

class CompleteQuestPayload(BaseModel):
    reflection: str
    photo_name: str
    photo_data_url: str

# ===== 同步响应 =====
class SyncResponse(BaseModel):
    tasks: List[TaskOut]
    accepted: List[AcceptedQuestOut]