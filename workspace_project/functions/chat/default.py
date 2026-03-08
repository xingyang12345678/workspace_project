"""Default chat renderer: messages, chosen, rejected + extra fields as kv."""

def render(record):
    sections = []
    if record.get("messages"):
        sections.append({"title": "Messages", "type": "chat", "messages": record["messages"]})
    if record.get("chosen"):
        sections.append({"title": "Assistant (chosen)", "type": "chat", "messages": record["chosen"]})
    if record.get("rejected"):
        sections.append({"title": "Assistant (rejected)", "type": "chat", "messages": record["rejected"]})
    known = {"messages", "chosen", "rejected"}
    rest = {k: v for k, v in record.items() if k not in known}
    if rest:
        items = [{"k": k, "v": v if not isinstance(v, (dict, list)) else str(v)} for k, v in rest.items()]
        sections.append({"title": "其它字段", "type": "kv", "items": items})
    return {"sections": sections}
