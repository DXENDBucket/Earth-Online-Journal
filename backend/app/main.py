from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import users, quests

# 创建数据库表（首次启动自动创建 eoj.db）
Base.metadata.create_all(bind=engine)

app = FastAPI(title="EOJ API", version="0.1.0")

# 允许所有跨域请求（测试环境方便）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(quests.router)

@app.get("/")
def root():
    return {"message": "EOJ Backend is running"}