from pathlib import Path
import tomllib
from pydantic import BaseModel, field_validator


class Config(BaseModel):
    content_dir: Path
    posts: list[str]

    class Config:
        extra = "forbid"

    @field_validator("content_dir")
    def parse_path(cls, p: str):
        return Path.expanduser(Path(p))


def load_config(path=Path("config.toml")):
    return Config(**tomllib.loads(path.read_text()))
