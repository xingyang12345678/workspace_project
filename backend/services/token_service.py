"""Token counting via Hugging Face AutoTokenizer; cache by model name."""
from __future__ import annotations

import os
from typing import Any

# 设置代理以便从 Hugging Face 下载 tokenizer；若已设置 HTTP_PROXY/HTTPS_PROXY 则不再覆盖
if "HTTP_PROXY" not in os.environ:
    os.environ["HTTP_PROXY"] = "http://127.0.0.1:7890"
if "HTTPS_PROXY" not in os.environ:
    os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7890"
os.environ.pop("ALL_PROXY", None)
os.environ.pop("all_proxy", None)

from services import dataset_service

_TOKENIZER_CACHE: dict[str, Any] = {}


def _get_tokenizer(model_name: str):
    """Load and cache tokenizer by model name. Optional: set HTTP_PROXY/HTTPS_PROXY before import if needed."""
    if model_name in _TOKENIZER_CACHE:
        return _TOKENIZER_CACHE[model_name]
    if not model_name or not model_name.strip():
        raise RuntimeError("model name is required")
    try:
        from transformers import AutoTokenizer
    except ImportError:
        raise RuntimeError("transformers not installed; pip install transformers")
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name.strip())
    except Exception as e:
        raise RuntimeError(f"Failed to load tokenizer for {model_name!r}: {e}")
    _TOKENIZER_CACHE[model_name.strip()] = tokenizer
    return tokenizer


def _count_tokens(tokenizer, text: str) -> int:
    if not text or not text.strip():
        return 0
    try:
        enc = tokenizer.encode(text)
        return len(enc) if enc else 0
    except Exception:
        return 0


def token_count_record(path: str, file: str, index: int, model: str) -> dict | None:
    """
    Token counts for one record. Returns dict with:
    messages_count, chosen_count, rejected_count, messages_plus_chosen, messages_plus_rejected,
    per_message_tokens: [messages_tokens[], chosen_tokens[], rejected_tokens[]]
    """
    record = dataset_service.get_record(path, file, index)
    if record is None:
        return None
    tokenizer = _get_tokenizer(model)
    msgs, chosen, rejected = dataset_service.get_record_texts(record)

    def count_list(texts: list[str]) -> tuple[int, list[int]]:
        total = 0
        per = []
        for t in texts:
            n = _count_tokens(tokenizer, t)
            per.append(n)
            total += n
        return total, per

    messages_total, messages_per = count_list(msgs)
    chosen_total, chosen_per = count_list(chosen)
    rejected_total, rejected_per = count_list(rejected)

    return {
        "messages_count": messages_total,
        "chosen_count": chosen_total,
        "rejected_count": rejected_total,
        "messages_plus_chosen": messages_total + chosen_total,
        "messages_plus_rejected": messages_total + rejected_total,
        "per_message_tokens": [messages_per, chosen_per, rejected_per],
    }


def token_stats_file(
    path: str, file: str, model: str, scope: str
) -> dict:
    """
    scope: chosen_wise | rejected_wise | both
    Returns mean, min, max, histogram { bucket_edges, counts }, and for both: chosen_wise, rejected_wise keys.
    """
    records = dataset_service.get_all_records(path, file)
    if not records:
        return {"mean": 0, "min": 0, "max": 0, "histogram": {"bucket_edges": [], "counts": []}, "n": 0}

    tokenizer = _get_tokenizer(model)
    chosen_wise: list[int] = []
    rejected_wise: list[int] = []

    for record in records:
        msgs, ch, rej = dataset_service.get_record_texts(record)
        def to_text(texts): return " ".join(texts) if texts else ""
        msg_text = to_text(msgs)
        ch_text = to_text(ch)
        rej_text = to_text(rej)
        if "chosen" in record:
            chosen_wise.append(_count_tokens(tokenizer, (msg_text + " " + ch_text).strip()))
        if "rejected" in record:
            rejected_wise.append(_count_tokens(tokenizer, (msg_text + " " + rej_text).strip()))

    def stats(values: list[int]):
        if not values:
            return {
                "mean": 0, "min": 0, "max": 0, "n": 0,
                "std": 0, "median": 0, "p25": 0, "p75": 0, "p90": 0,
                "histogram": {"bucket_edges": [], "counts": []},
            }
        n = len(values)
        mean = sum(values) / n
        variance = sum((x - mean) ** 2 for x in values) / n if n else 0
        std = variance ** 0.5
        sorted_vals = sorted(values)
        def percentile(p: float) -> float:
            idx = (n - 1) * p / 100
            i, f = int(idx), idx % 1
            if i >= n - 1:
                return float(sorted_vals[-1])
            return sorted_vals[i] * (1 - f) + sorted_vals[i + 1] * f
        median = percentile(50)
        p25 = percentile(25)
        p75 = percentile(75)
        p90 = percentile(90)
        mn, mx = min(values), max(values)
        num_buckets = min(20, max(5, n // 5))
        if mx <= mn:
            bucket_edges = [mn, mx]
            counts = [n]
        else:
            step = (mx - mn) / num_buckets
            bucket_edges = [mn + i * step for i in range(num_buckets + 1)]
            counts = [0] * num_buckets
            for v in values:
                i = min(int((v - mn) / step), num_buckets - 1) if step > 0 else 0
                counts[i] += 1
        return {
            "mean": round(mean, 2),
            "min": mn,
            "max": mx,
            "n": n,
            "std": round(std, 2),
            "median": round(median, 2),
            "p25": round(p25, 2),
            "p75": round(p75, 2),
            "p90": round(p90, 2),
            "histogram": {"bucket_edges": [round(e, 2) for e in bucket_edges], "counts": counts},
        }

    if scope == "chosen_wise":
        return stats(chosen_wise)
    if scope == "rejected_wise":
        return stats(rejected_wise)
    return {
        "chosen_wise": stats(chosen_wise),
        "rejected_wise": stats(rejected_wise),
    }
