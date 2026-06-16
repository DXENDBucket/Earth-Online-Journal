from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import random
from app import models, schemas, auth
from app.database import get_db
from app.routers.users import get_current_user

router = APIRouter(prefix="/api/quests", tags=["quests"])

# ========== 种子任务（每个用户首次注册时自动创建） ==========
SEED_TASKS = [
    {"text": "给今天路过的一棵树拍一张证件照。", "category": "观察", "intensity": "light"},
    {"text": "找一个平时会忽略的小物件，给它写三句话。", "category": "记录", "intensity": "light"},
    {"text": "在熟悉的路上换一侧行走，记录一个新发现。", "category": "行动", "intensity": "light"},
    {"text": "给未来三天后的自己留一句提醒。", "category": "记录", "intensity": "light"},
    {"text": "买一瓶平时不会选的饮料，并给它打一个分数。", "category": "尝试", "intensity": "normal"},
    {"text": "向一个陌生空间打招呼：车站、街角、楼梯间都可以。", "category": "探索", "intensity": "normal"},
]

# ========== 同步所有数据 ==========
@router.get("/sync", response_model=schemas.SyncResponse)
def sync(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 检查用户是否有种子任务，没有则创建
    existing = db.query(models.Task).filter(models.Task.user_id == current_user.id).count()
    if existing == 0:
        for seed in SEED_TASKS:
            task = models.Task(
                user_id=current_user.id,
                text=seed["text"],
                category=seed["category"],
                intensity=seed["intensity"],
                source="基础词库",
                status="approved",
                approved_at=func.now()
            )
            db.add(task)
        db.commit()
    
    tasks = db.query(models.Task).filter(models.Task.user_id == current_user.id).all()
    accepted = db.query(models.AcceptedQuest).filter(models.AcceptedQuest.user_id == current_user.id).all()
    return {"tasks": tasks, "accepted": accepted}

# ========== 发布任务 ==========
@router.post("/publish", response_model=schemas.TaskOut)
def publish(task_data: schemas.TaskCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 查重
    existing = db.query(models.Task).filter(
        models.Task.user_id == current_user.id,
        func.lower(models.Task.text) == task_data.text.lower().strip()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="这张任务卡已经在你的卡池里了")
    
    task = models.Task(
        user_id=current_user.id,
        pool_id=task_data.pool_id or 'public',
        text=task_data.text.strip(),
        category=task_data.category,
        intensity=task_data.intensity,
        source="用户发布",
        status="pending"
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

# ========== 批准任务（加入卡池） ==========
@router.put("/approve/{task_id}", response_model=schemas.TaskOut)
def approve_task(task_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task.status != "pending":
        raise HTTPException(status_code=400, detail="任务已批准或已删除")
    task.status = "approved"
    task.approved_at = func.now()
    db.commit()
    db.refresh(task)
    return task

# ========== 删除任务（撤回） ==========
@router.delete("/task/{task_id}")
def delete_task(task_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == current_user.id,
        models.Task.status == "pending"
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="待确认任务不存在")
    db.delete(task)
    db.commit()
    return {"message": "已撤回"}

# ========== 抽取任务 ==========
@router.post("/draw", response_model=schemas.AcceptedQuestOut)
def draw_quest(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 获取当前所有进行中的任务ID
    doing = db.query(models.AcceptedQuest.task_id).filter(
        models.AcceptedQuest.user_id == current_user.id,
        models.AcceptedQuest.status == "todo"
    ).all()
    doing_ids = [d[0] for d in doing]
    
    # 可抽取池：已批准且不在进行中
    pool = db.query(models.Task).filter(
        models.Task.user_id == current_user.id,
        models.Task.status == "approved",
        ~models.Task.id.in_(doing_ids) if doing_ids else True
    ).all()
    
    if not pool:
        raise HTTPException(status_code=400, detail="当前没有可抽取的任务")
    
    picked = random.choice(pool)
    quest = models.AcceptedQuest(
        user_id=current_user.id,
        task_id=picked.id,
        pool_id=picked.pool_id,
        text=picked.text,          # 新增
        category=picked.category,  # 新增
        source=picked.source,      # 新增
        status="todo",
    )
    db.add(quest)
    db.commit()
    db.refresh(quest)
    return quest

# ========== 完成任务 ==========
@router.put("/complete/{quest_id}", response_model=schemas.AcceptedQuestOut)
def complete_quest(
    quest_id: int,
    payload: schemas.CompleteQuestPayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quest = db.query(models.AcceptedQuest).filter(
        models.AcceptedQuest.id == quest_id,
        models.AcceptedQuest.user_id == current_user.id,
        models.AcceptedQuest.status == "todo"
    ).first()
    if not quest:
        raise HTTPException(status_code=404, detail="进行中的任务不存在")
    
    quest.status = "done"
    quest.completed_at = func.now()
    quest.reflection = payload.reflection.strip()
    quest.photo_name = payload.photo_name
    quest.photo_data_url = payload.photo_data_url
    db.commit()
    db.refresh(quest)
    return quest

# ========== 放回卡池 ==========
@router.put("/return/{quest_id}")
def return_quest(quest_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    quest = db.query(models.AcceptedQuest).filter(
        models.AcceptedQuest.id == quest_id,
        models.AcceptedQuest.user_id == current_user.id,
        models.AcceptedQuest.status == "todo"
    ).first()
    if not quest:
        raise HTTPException(status_code=404, detail="进行中的任务不存在")
    db.delete(quest)
    db.commit()
    return {"message": "已放回卡池"}

# ========== 删除已完成记录 ==========
@router.delete("/quest/{quest_id}")
def delete_quest(quest_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    quest = db.query(models.AcceptedQuest).filter(
        models.AcceptedQuest.id == quest_id,
        models.AcceptedQuest.user_id == current_user.id,
        models.AcceptedQuest.status == "done"
    ).first()
    if not quest:
        raise HTTPException(status_code=404, detail="已完成记录不存在")
    db.delete(quest)
    db.commit()
    return {"message": "已删除"}