"""Code example..."""

import math
from pathlib import Path

import re

# import regex as re
import timeit
from html.parser import HTMLParser

# Run each regex operation 1000 times
NTRIALS = 100
# Compute mean and standard deviation
NREPEAT = 5


def stats(vals: list[float]):
    """Math utility. Compute mean and standard deviation"""
    N = len(vals)
    mean = sum(vals) / N
    std = math.sqrt(sum((v - mean) ** 2 for v in vals) / N)
    return mean, std


# example patterns
patterns = {
    # 1. Class of "whitespace" and "non-whitespace"
    "lazy_noflag": re.compile(r"<[\s\S]+?>"),
    # 2. Dot needs flag to include newlines
    "lazy_dotall": re.compile(r"<.+?>", re.DOTALL),
    # 3. Negated character class
    "non_lazy": re.compile(r"<[^>]+>"),
}


def try_pattern(pat: re.Pattern, text: str):
    # how fast is it?
    t_mean, t_std = stats(
        timeit.repeat(lambda: pat.findall(text), repeat=NREPEAT, number=NTRIALS)
    )
    # what does it find?
    found = pat.findall(text)

    return found, t_mean, t_std


def complexity_by_length():
    pat_lazy = re.compile(r"<.+?>")
    pat_non = re.compile(r"<[^>]+>")
    lengths = [10**k for k in range(7)]
    times_lazy = []
    times_non = []
    for n in lengths:
        string = "<" + "a" * n + ">"
        times_lazy.append(timeit.timeit(lambda: pat_lazy.findall(string), number=10))
        times_non.append(timeit.timeit(lambda: pat_non.findall(string), number=10))

    print("length   :", " ".join(f"{le:6d}" for le in lengths))
    print("time")
    print(
        "lazy     :",
        " ".join(f"{1000 * t:.4f}".rjust(6) for t in times_lazy),
    )
    print(
        "non-lazy :",
        " ".join(f"{1000 * t:.4f}".rjust(6) for t in times_non),
    )


# === HTML PARSER ===


class SimpleParser(HTMLParser):
    """Simplified HTML parser. only gets start and end tags"""

    def __init__(self) -> None:
        super().__init__()
        self.tags = []

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        # we could reconstruct the attr string like:
        # + " " + " ".join(f'{k}="{v}"' for k, v in attrs))
        # but we can avoid that for a more fair performance comparison

    def handle_endtag(self, tag):
        self.tags.append(f"/{tag}")

    def handle_startendtag(self, tag, attrs):
        # to avoid catching <img/> twice
        if tag[0] != "/":
            self.tags.append(tag)


if __name__ == "__main__":
    # load example HTML snippet
    text = Path("examples/html_tag_regex/sample.txt").read_text()
    print("--- Example snippet ---\n")
    print(text)
    print("-----------------------\n")

    # simply count these...
    n_expected = len(re.findall("<", text))

    print("Regex comparison!")
    for name, pat in patterns.items():
        found, t_mean, t_std = try_pattern(pat, text)
        print(
            f'\n"{name}" : {pat.pattern}'.ljust(30)
            + f"| time: {1000 * t_mean:.2f} ms (std: {1000 * t_std:.2f}) | found: {len(found)}/{n_expected}"
        )
        for f in found:
            print(f"  {repr(f)}")

    # ======================================================================================
    # Try the HTML parser

    p = SimpleParser()
    p.feed(text)
    p.close()
    found = p.tags.copy()
    t_mean, t_std = stats(
        timeit.repeat(lambda: p.feed(text), repeat=NREPEAT, number=NTRIALS)
    )
    print(
        '\n"HTML Parser"'.ljust(30)
        + f"| time: {1000 * t_mean:.2f} ms (std: {1000 * t_std:.2f}) | found: {len(found)}/{n_expected}"
    )
    for f in found:
        print(f"  {repr(f)}")
    print(f"\n\n({NREPEAT = }, {NTRIALS = })")

    # ===================================================

    print("\nTime Complexity")
    complexity_by_length()
