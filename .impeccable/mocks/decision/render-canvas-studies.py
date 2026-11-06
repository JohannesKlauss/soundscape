"""Generate the self-contained HTML studies from their templates and local art."""
import base64
import re
from pathlib import Path

root = Path(__file__).resolve().parent
aliases = {"tavern.webp": "tavern-fantasy.webp", "harbor.webp": "harbor-fantasy.webp"}
for template in sorted(root.glob("prep-grid-*.template.html")):
    def inline_asset(match):
        path = root / "assets" / aliases.get(match.group(1), match.group(1))
        return "data:image/webp;base64," + base64.b64encode(path.read_bytes()).decode("ascii")

    content = re.sub(r"asset://([a-zA-Z0-9_-]+\.webp)", inline_asset, template.read_text())
    content = re.sub(r"<style>([\s\S]*?)</style>", lambda match: "<style>" + re.sub(r"\s+", " ", match.group(1)).strip() + "</style>", content)
    content = "\n".join(line for line in content.splitlines() if line.strip())
    destination = template.with_name(template.name.replace(".template.html", ".html"))
    destination.write_text(content)
    print(destination.name)
