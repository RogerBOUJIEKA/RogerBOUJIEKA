"""Rendu Markdown minimal et sûr : tout le texte est échappé avant mise en forme.

Pris en charge : titres (#, ##, ###), paragraphes, listes, citations, blocs de
code, `code`, **gras**, *italique* et liens [texte](https://...).
"""

import html
import re

LINK = re.compile(r"\[([^\]]+)\]\((https?://[^\s)]+)\)")
BOLD = re.compile(r"\*\*(.+?)\*\*")
ITALIC = re.compile(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])")
HEADING = re.compile(r"(#{1,3})\s+(.*)")
BULLET = re.compile(r"[-*]\s+(.*)")
NUMBERED = re.compile(r"\d+[.)]\s+(.*)")


def inline(text):
    parts = text.split("`")
    if len(parts) % 2 == 0:  # accent grave non fermé : on le garde tel quel
        last = parts.pop()
        parts[-1] += "`" + last
    out = []
    for i, part in enumerate(parts):
        if i % 2:
            out.append(f"<code>{html.escape(part)}</code>")
            continue
        s = html.escape(part)
        s = LINK.sub(r'<a href="\2" rel="noopener nofollow" target="_blank">\1</a>', s)
        s = BOLD.sub(r"<strong>\1</strong>", s)
        out.append(ITALIC.sub(r"<em>\1</em>", s))
    return "".join(out)


def render(text):
    out, paragraph, quote = [], [], []
    list_tag, items, code = None, [], None

    def flush():
        nonlocal list_tag
        if paragraph:
            out.append("<p>" + inline("\n".join(paragraph)).replace("\n", "<br>") + "</p>")
            paragraph.clear()
        if quote:
            out.append("<blockquote>" + inline("\n".join(quote)).replace("\n", "<br>")
                       + "</blockquote>")
            quote.clear()
        if items:
            out.append(f"<{list_tag}>" + "".join(f"<li>{inline(i)}</li>" for i in items)
                       + f"</{list_tag}>")
            items.clear()
            list_tag = None

    for line in (text or "").replace("\r\n", "\n").split("\n"):
        stripped = line.strip()
        if code is not None:
            if stripped.startswith("```"):
                out.append("<pre><code>" + html.escape("\n".join(code)) + "</code></pre>")
                code = None
            else:
                code.append(line)
            continue
        if stripped.startswith("```"):
            flush()
            code = []
        elif not stripped:
            flush()
        elif m := HEADING.fullmatch(stripped):
            flush()
            level = len(m.group(1)) + 1
            out.append(f"<h{level}>{inline(m.group(2))}</h{level}>")
        elif stripped.startswith(">"):
            if paragraph or items:
                flush()
            quote.append(stripped[1:].strip())
        elif (m := BULLET.fullmatch(stripped)) or (m := NUMBERED.fullmatch(stripped)):
            tag = "ul" if BULLET.fullmatch(stripped) else "ol"
            if paragraph or quote or (items and tag != list_tag):
                flush()
            list_tag = tag
            items.append(m.group(1))
        else:
            if items or quote:
                flush()
            paragraph.append(stripped)
    flush()
    if code is not None:
        out.append("<pre><code>" + html.escape("\n".join(code)) + "</code></pre>")
    return "\n".join(out)
