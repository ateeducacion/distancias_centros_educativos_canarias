map(select(.tagName | startswith("data-")))
| sort_by(.publishedAt)
| reverse
| .[0].tagName // ""
