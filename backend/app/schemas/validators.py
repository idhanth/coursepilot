def reject_nul_characters(value: str) -> str:
    """Reject text containing the NUL character (\\x00).

    PostgreSQL text columns can't store or compare NUL, so without this check such input reaches
    the database and fails with a 500 error instead of a clear 422.
    """
    if "\x00" in value:
        raise ValueError("Text can't contain the NUL character.")
    return value
