import regex as re

# patterns for some basic tokens
# in order
BASIC_PATS = [
    # comment after indentation or full line (NOTE variable length lookbehind)
    ("co", r"(?<=(?:^|[;,])\s*)(?:[/]{2,3}|#|%|-- ).+$"),
    ("co", r"<!--.+-->\s*$"),  # html-comment
    # multiline comments
    ("co", r"\/\*{1,2}[\s\S]+?\*\/"),
    # c style comments after semicolon/comma
    # ("co", r"(?<=[;,]\s*)\/{2} ?.+$"),
    ("co", r"#.*$"),  # shell/py style, less confusion with op
    # triple-quote string
    ("st", r"\"{3}[\s\S]*?\"{3}"),
    ("st", r"'{3}[\s\S]*?'{3}"),
    # basic double-quote string
    ("st", r"\"[^\"\n]*\""),
    # special quote
    ("st", r"“[^\"\n]*”"),
    ("st", r"`[^`]*`"),  # backtick-string
    # rust lifetime annotations (NOTE: before single-strings)
    ("an", r"(?<=&|<|< |\+ |, )'\p{L}+(?=[>,])"),  # in angle brackets
    ("an", r"(?<=&)'\p{L}+"),  # in references
    # single quote string
    ("st", r"'[^'\n]*'"),
    ("brop", r"[\(\[\{]"),
    ("brcl", r"[\)\]\}]"),
    # catch some syntax features before numbers
    ("sy", r"\.{3}|\.{2}[=?]?"),
    # numbers: scientific
    ("nu", r"(?<!\w)\d+(?:\.\d+)?+[eE]-\d+"),
    # numbers: hex, bin,
    ("nu", r"(?<!\w)0x[0-9a-fA-F]+|0b[01]+"),
    # numbers: integer, decimal, percent
    ("nu", r"(?<!\w)\d[\d_]*(?:\.\d+)?\w*%?(?![\w\d])"),
    ("id", r"^[\t ]+"),
    ("ws", r"[\r\t\f\v ]+"),
    ("nl", r"\n+"),
    ("sy", r"^>>>"),
    # CSS classes
    ("uk", r"^\.\p{L}\S*(?=.*{)"),
    # bash flags
    # ("uk", r"(?<!\S)--\p{L}+(?=\s|=|$)"),
    # bash flag or op or css attr
    ("uk", r"\p{L}*-{0,2}\p{L}[\p{L}-]*(?=\s|=|$|:)"),
    # rust macros
    ("uk", r"\S+!(?=\()"),
    # operators
    ("opbi", r"===|!==|==|!=|\/\/|\.\^|\|\||&&|~\/|<<|\?\?"),
    ("opun", r"\+\+|--"),
    ("sy", r"->|=>|\|>|::|:|(?<=[^\s])\.(?=[^\s])"),
    ("opas", r"<-|=|\+=|-=|\*=|\/="),
    ("pu", r",|;"),
    # php/bash variable/parameter
    ("uk", r"\$[_\p{L}\d]+"),
    # bash special parameters
    ("uk", r"\$[*@?-]"),
    ("uk", r"\$#"),
    ("uk", r"\$\$|\*\*"),
    # annotations
    ("an", r"^@\S+"),
    ("uk", r"\w+|[^\w\s]+?"),  # everything else
]

# NOTE: needed priorites:
# comment < string < everything
# bigger compound operators <= smaller operators


def process_regex(text: str, patterns: list[tuple[str, str]] = BASIC_PATS):
    """Tokenize and find some basic tags"""

    regex_token = re.compile("|".join(f"(?P<{t}>{p})" for t, p in patterns), re.M)

    tokens: list[str] = []
    tags: list[str] = []
    # Iterate over all matches
    for m in regex_token.finditer(text):
        tokens.append(m.group())  # matched token
        ta = m.lastgroup
        if ta is None:
            ta = "uk"
        tags.append(ta)  # corresponding tag

    # safety check
    rec = "".join(tokens)
    if rec != text:
        diffc = len(text) - len(rec)
        raise RuntimeError(f"Missed {diffc} characters")

    return tokens, tags


def merge_adjacent(
    tokens: list[str],
    tags: list[str],
    merge_only: set[str] | None = None,
    dont_merge: set[str] | None = None,
):
    """Merge adjacent tokens if they have the same tag.
    ## Parameters
    - tokens
    - tags
    - merge_only: if provided, merge only these tags, otherwise merge all.

    ## returns
    - tokens_merged
    - tags_merged
    """

    if len(tokens) != len(tags):
        raise ValueError("Inconsistent sequence length")

    tokens_merged: list[str] = []
    tags_merged = []
    # keep track of where merges where made
    merge_idx = []

    # Determine if some tag should merge
    def should_merge(tag: str) -> bool:
        if merge_only is not None:
            return tag in merge_only
        if dont_merge is not None:
            return tag not in dont_merge
        return True

    current_seq = []
    for i, (token, tag) in enumerate(zip(tokens, tags, strict=True)):
        # next tag, None if at end
        tag_next = tags[i + 1] if i < len(tags) - 1 else None

        if tag == tag_next:
            if should_merge(tag):
                current_seq.append(token)
                continue

        else:
            if current_seq:
                # break current merging
                merge_idx.append(len(tokens_merged))
                current_seq.append(token)
                tokens_merged.append("".join(current_seq))
                tags_merged.append(tag)

                current_seq = []
                continue

        tokens_merged.append(token)
        tags_merged.append(tag)

    return tokens_merged, tags_merged, merge_idx


def clean_text(text: str):
    """Basic cleanup"""
    # remove trailing newline
    text_clean = re.sub(r"\n+$", "", text)
    # remove trailing whitespace on lines
    text_clean = re.sub(r"[\t ]+$", "", text_clean, flags=re.M)

    return text_clean


def bracket_levels(tags: list[str], wrap: int | None = 4) -> tuple[list[str], list[int]]:
    """Rename bracket tags from br_op/cl to br{n}.

    parameters
    ----------
    tags: list[str]
        input sequence
    wrap: int|None
        optionally wrap levels when formatting, only affects output class names

    Returns
    -------
    tags_new: list[str]
        modified tags
    brac_level: list[int]:
        bracket depth for all tokens.
    """

    def _fmt(lev: int):
        if wrap is None:
            return f"br{lev}"
        return f"br{lev % wrap}"

    brac_level = []
    lev = 0
    tags_new = tags.copy()
    for i in range(len(tags_new)):
        if tags_new[i] == "brop":
            # Increased nesting
            brac_level.append(lev)
            tags_new[i] = _fmt(lev)
            lev += 1
        elif tags_new[i] == "brcl":
            # Decreased nesting
            lev -= 1
            tags_new[i] = _fmt(lev)
            brac_level.append(lev)
        else:
            brac_level.append(lev)

    return tags_new, brac_level


def process(text: str) -> tuple[list[str], list[str]]:
    """Process a code snippet, producing tokens and tags."""

    pats = BASIC_PATS.copy()

    text = clean_text(text)
    # tabs to spaces
    text = text.replace("\t", "    ")

    tokens, tags = process_regex(text, pats)

    tags, _ = bracket_levels(tags, wrap=4)

    # if we dont care about whitespace:
    translate = {"ws": "uk", "nl": "uk", "id": "uk"}
    tags = [translate.get(t, t) for t in tags]

    # finally merge, for comapact output
    tokens, tags, _ = merge_adjacent(tokens, tags)

    return tokens, tags


def example():
    print("Full Pattern: ", "|".join(f"(?P<{t}>{p})" for t, p in BASIC_PATS))

    example_input = "hello = f(3 + 1.4e-1)\nprint(g('something'))"
    tk, ta = process(example_input)
    print(f"\n\nExample: `{example_input}`")
    print(f" -> {tk} ")
    print(f" -> {ta} ")

    return tk, ta


if __name__ == "__main__":
    example()
