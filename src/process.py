from pathlib import Path
from typing import Callable

import pydantic
import regex as re
from markdown_it_pyrs import MarkdownIt

md = MarkdownIt().enable_many(["front_matter", "deflist", "table"])

pat_slot = re.compile(r"{{ *(?P<k>\S+) *}}")

pat_heading_html = re.compile(r"<h(\d)>(.+?)</h\1>", re.MULTILINE)
pat_codeblock_md = re.compile(r"```(?:\s\w*)\n.+?\n```", re.DOTALL)
pat_codeblock_html = re.compile(r"<pre><code class=\"(?:[^\"]+)\">[^<]+?</code></pre>", re.DOTALL)


def simplify(t: str):
    t = t.lower().strip()
    t = t.replace(" ", "-")
    return t


@pydantic.dataclasses.dataclass
class Heading:
    level: int
    text: str

    @property
    def id(self):
        return simplify(self.text)

    @classmethod
    def from_re(cls, m: re.Match):
        obj = cls(
            int(m.group(1)),
            m.group(2),
        )
        return obj

    def with_id(self):
        return f'<h{self.level} id="{self.id}">{self.text}</h{self.level}>'


class DocumentPost:
    def __init__(self, source: Path, highlight_codeblock: Callable[[str], str] | None) -> None:
        self.text = source.read_text(encoding="utf-8")
        self.html = md.render(self.text)

        if highlight_codeblock is not None:
            blocks_md = pat_codeblock_md.findall(self.text)
            blocks_html = pat_codeblock_html.findall(self.html)
            print(f"found {len(blocks_md)=}")
            print(f"found {len(blocks_html)=}")
            for h, m in zip(blocks_html, blocks_md, strict=True):
                assert isinstance(m, str)
                m = "\n".join(m.splitlines()[1:-1])
                r = highlight_codeblock(m)
                self.html = self.html.replace(h, r)

    def headings(self):
        """Find all headings in the HTML document."""
        headings: list[Heading] = []
        for m in pat_heading_html.finditer(self.html):
            headings.append(Heading.from_re(m))

        return headings

    def outline(self, min_level: int = 1, max_level: int = 3) -> str:
        """Make outline based on headings in HTML document."""
        headings = self.headings()
        lines = [
            f'<a href="#{h.id}" class="anchor{h.level}">{h.text}</a>'
            for h in headings
            if min_level <= h.level <= max_level
        ]
        return "\n".join(lines)

    def with_heading_ids(self):
        # print("\nINSERT HEADINGS")

        return pat_heading_html.sub(lambda m: Heading.from_re(m).with_id(), self.html)


def render_template(template: str, data: dict[str, str], verbose=False) -> str:
    replaced = []

    def repl(m: re.Match):
        key = m.groupdict()["k"]
        replaced.append(key)
        return data.pop(key)

    result = pat_slot.sub(repl, template)

    if verbose:
        print(f"replaced {replaced}")
    # is there anything left?
    unused = set(data.keys()) - set(replaced)
    if unused:
        print(f"WARNING: unused data {unused}")

    return result
