from datetime import datetime
from pathlib import Path
import sys

sys.path.append(".")

from src.config import load_config
from src.process import DocumentPost, render_template

OUT_DIR = Path("posts")
OUT_DIR.mkdir(exist_ok=True)

config = load_config()
# content_files = list(config.content_dir.glob("**/*.md"))

content_files = [config.content_dir / f"{fn}.md" for fn in config.posts]

template = Path("templates/post.html").read_text("utf-8")

for f in content_files:
    m_time = datetime.fromtimestamp(f.stat().st_mtime)

    name = str(f.relative_to(config.content_dir)).removesuffix(".md")
    print(name, m_time)
    target_file = OUT_DIR / f"{name}.html"

    post = DocumentPost(f)

    headings = post.headings()
    # for h in headings:
    #     print(h)

    uniq_ids = set(h.id for h in headings)
    assert len(uniq_ids) == len(headings), "should have unique ids"

    html = render_template(
        template,
        {
            "title": f.name,
            "sidebar": post.outline(),
            "content": post.with_heading_ids(),
        },
    )

    target_file.write_text(html, "utf-8")

    print(f"-> {target_file}")
