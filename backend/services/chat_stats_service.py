"""N-gram and string search over JSONL chat data."""
from collections import Counter
import re

from services import dataset_service


def _text_for_scope(record: dict, scope: str, field_mapping: dict | None = None) -> str:
    """Extract concatenated text from record by scope: messages | chosen | rejected | all."""
    msgs, chosen, rejected = dataset_service.get_record_texts(record, field_mapping)
    def join(texts): return " ".join(texts) if texts else ""

    if scope == "messages":
        return join(msgs)
    if scope == "chosen":
        return join(chosen)
    if scope == "rejected":
        return join(rejected)
    return join(msgs) + " " + join(chosen) + " " + join(rejected)


def ngram(
    path: str,
    file: str,
    n: int,
    min_count: int,
    min_length: int,
    scope: str,
    unit: str = "char",
    field_mapping: dict | None = None,
) -> list[dict]:
    """Return list of { gram, count } sorted by count desc. unit: char (sliding chars) | word (sliding words)."""
    records = dataset_service.get_all_records(path, file)
    counter: Counter = Counter()
    for record in records:
        text = _text_for_scope(record, scope, field_mapping)
        if not text:
            continue
        if unit == "word":
            words = re.split(r"\s+", text.strip())
            words = [w for w in words if w]
            for i in range(len(words) - n + 1):
                if n <= 0:
                    continue
                gram = " ".join(words[i : i + n])
                if min_length == 0 or len(gram) >= min_length:
                    counter[gram] += 1
        else:
            for i in range(len(text) - n + 1):
                gram = text[i : i + n]
                if len(gram.strip()) >= min_length or min_length == 0:
                    counter[gram] += 1
    out = [{"gram": g, "count": c} for g, c in counter.most_common() if c >= min_count]
    return out


def string_search(path: str, file: str, query: str, scope: str, field_mapping: dict | None = None) -> dict:
    """
    scope: chosen_wise (only in chosen), rejected_wise (only in rejected), whole (messages+chosen+rejected).
    Returns total_occurrences, records_with_match, per_record, and stats over matched records:
    mean_per_record, min_per_record, max_per_record, std_per_record.
    """
    if not query or not query.strip():
        return {
            "total_occurrences": 0,
            "records_with_match": 0,
            "per_record": [],
            "mean_per_record": 0,
            "min_per_record": 0,
            "max_per_record": 0,
            "std_per_record": 0,
        }

    records = dataset_service.get_all_records(path, file)
    per_record: list[dict] = []
    total = 0

    for idx, record in enumerate(records):
        if scope == "chosen_wise":
            msgs, ch, _ = dataset_service.get_record_texts(record, field_mapping)
            text = " ".join(msgs + ch) if (msgs or ch) else ""
        elif scope == "rejected_wise":
            msgs, _, rej = dataset_service.get_record_texts(record, field_mapping)
            text = " ".join(msgs + rej) if (msgs or rej) else ""
        else:
            text = _text_for_scope(record, "all", field_mapping)
        count = len(re.findall(re.escape(query), text))
        if count > 0:
            per_record.append({"index": idx, "count": count})
            total += count

    counts = [p["count"] for p in per_record]
    n = len(counts)
    if n == 0:
        return {
            "total_occurrences": 0,
            "records_with_match": 0,
            "per_record": per_record,
            "mean_per_record": 0,
            "min_per_record": 0,
            "max_per_record": 0,
            "std_per_record": 0,
        }
    mean_pr = sum(counts) / n
    variance = sum((c - mean_pr) ** 2 for c in counts) / n
    std_pr = round(variance ** 0.5, 2) if variance else 0
    return {
        "total_occurrences": total,
        "records_with_match": n,
        "per_record": per_record,
        "mean_per_record": round(mean_pr, 2),
        "min_per_record": min(counts),
        "max_per_record": max(counts),
        "std_per_record": std_pr,
    }
