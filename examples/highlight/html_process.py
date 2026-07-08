import sys

import regex as re


def make_head_html(css_path: str, title: str | None = None):
    """Make document-head with css link."""
    content = ""
    if title:
        content += f"<title>{title}</title>\n"
    content += f'<link rel="stylesheet" type="text/css" href="{css_path}">\n'

    return f"<head>\n{content}\n</head>"


def html_specials(text: str) -> str:
    """Replace html reserved characters"""

    text = re.sub(r"&", r"&amp;", text)
    text = re.sub(r"<", r"&lt;", text)
    text = re.sub(r">", r"&gt;", text)
    text = re.sub(r'"', r"&quot;", text)
    text = re.sub(r"'", r"&apos;", text)
    return text


def format_html(tokens: list[str], tags: list[str]) -> str:
    """Format HTML document of tagged text.

    ## parameters
    - override_elements: optionally use something else than `<span>`.
    - exclude_tags: these will be left as plain text
    - level_brackets: if true, replace brop/brcl with br{n}
    - css_path: if not None, make document with `<head>` and `<body>`
    """

    # no need to tag whitespace/unknown tokens
    exclude_tags = {"ws", "uk"}

    tagged_elements: list[str] = []
    for token, tag in zip(tokens, tags, strict=True):
        # fix html specials
        token_text = html_specials(token)
        if tag in exclude_tags:
            tagged_elements.append(token_text)
        else:
            s = f'<span class="{tag}">{token_text}</span>'
            tagged_elements.append(s)

    text = "".join(tagged_elements)
    final_html = f'\n<pre class="code-snippet">{text}</pre>\n'

    return final_html


if __name__ == "__main__":
    sys.path.append(".")
    from examples.highlight import v1

    tk, ta = v1.example()
    out = format_html(tk, ta)
    print(f"\nOut:{out}")
