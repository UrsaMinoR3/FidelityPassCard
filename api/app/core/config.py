from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str = "changeme-in-render-env-vars"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 30  # 30 days — this is a casual personal app, not a bank

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
