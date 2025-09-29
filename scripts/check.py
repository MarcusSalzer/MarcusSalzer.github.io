import sys

sys.path.append(".")

from src.config import load_config


config = load_config()

content_files = list(config.content_dir.glob("**/*.md"))
print("Content files:\n  " + "\n  ".join(str(p) for p in content_files))
