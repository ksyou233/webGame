# 作用：定义 demo 后端 API 的请求与响应数据模型。
# 使用方法：路由函数通过这些模型自动完成校验和序列化。
# 输入输出：输入为客户端 JSON，输出为规范化后的 Python 对象或响应体。
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ScoreCreate(BaseModel):
    """作用：定义提交成绩接口的请求体结构。

    使用方法：POST /scores 时由 FastAPI 自动校验。
    输入输出：输入为昵称、分数、存活秒数；输出为已校验对象。
    """

    player_name: str = Field(..., min_length=1, max_length=30)
    score: int = Field(..., ge=0, le=1000000)
    survived_seconds: int = Field(..., ge=0, le=86400)

    @field_validator("player_name")
    @classmethod
    def normalize_player_name(cls, value: str) -> str:
        """作用：清理昵称前后空格并拦截空白昵称。

        使用方法：由 Pydantic 在字段校验阶段自动调用。
        输入输出：输入为原始昵称字符串，输出为去空格后的昵称。
        """
        stripped = value.strip()
        if not stripped:
            raise ValueError("player_name 不能为空")
        return stripped


class ScoreOut(BaseModel):
    """作用：定义成绩返回结构。

    使用方法：作为路由 response_model 使用。
    输入输出：输入为 ORM 对象，输出为 API JSON。
    """

    id: int
    player_name: str
    score: int
    survived_seconds: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
