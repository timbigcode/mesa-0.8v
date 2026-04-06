from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:password@localhost:5432/restaurant_booking"
    secret_key: str
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = ""
    admin_username: str = "admin"
    admin_password: str = "admin1234"
    anthropic_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
