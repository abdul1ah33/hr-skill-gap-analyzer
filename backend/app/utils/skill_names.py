def normalize_skill_name(name: str) -> str:
    """
    Canonical form for skill names and aliases: trimmed, single-spaced and
    lowercase. Skill names are stored in this form (enforced by a CHECK
    constraint on skills.name), so lookups can use plain equality.
    """
    return " ".join(name.split()).lower()
