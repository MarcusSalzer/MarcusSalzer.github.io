from pathlib import Path
from markdown_it_pyrs import MarkdownIt
import regex as re
import pydantic

md = MarkdownIt().enable_many(["front_matter", "deflist", "table"])

pat_slot = re.compile(r"{{ *(?P<k>\S+) *}}")

pat_h = re.compile(r"<h(\d)>(.+?)</h\1>", re.MULTILINE)


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
        # print(obj.with_id())
        return obj

    def with_id(self):
        return f'<h{self.level} id="{self.id}">{self.text}</h{self.level}>'


class DocumentPost:
    def __init__(self, source: Path) -> None:
        self.text = source.read_text(encoding="utf-8")
        self.html = md.render(self.text)

    def headings(self):
        headings: list[Heading] = []
        for m in pat_h.finditer(self.html):
            headings.append(Heading.from_re(m))

        return headings

    def outline(self) -> str:
        headings = self.headings()
        lines = [
            f'<a href="#{h.id}" class="anchor{h.level}">{h.text}</a>' for h in headings
        ]
        return "\n".join(lines)

    def with_heading_ids(self):
        # print("\nINSERT HEADINGS")

        return pat_h.sub(lambda m: Heading.from_re(m).with_id(), self.html)


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
