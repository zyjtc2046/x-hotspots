#!/usr/bin/env python3
"""重建 data/index.json：日期列表（倒序）+ 每天各分类条数。仅用标准库。"""
import json, os, re, sys
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
DATE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})\.json$")
CAT_MAP = {
    "ai": "AI", "人工智能": "AI",
    "crypto": "Crypto", "加密货币": "Crypto", "币圈": "Crypto",
    "国内形势": "国内形势", "china": "国内形势", "domestic": "国内形势", "国内": "国内形势",
    "国际形势": "国际形势", "world": "国际形势", "international": "国际形势", "global": "国际形势", "国际": "国际形势",
}

def norm_cat(c):
    if c is None or str(c).strip() == "":
        return "未分类"
    s = str(c).strip()
    return CAT_MAP.get(s.lower(), CAT_MAP.get(s, s))

def items_of(obj):
    if isinstance(obj, list):
        return [x for x in obj if isinstance(x, dict)]
    if isinstance(obj, dict):
        if isinstance(obj.get("items"), list):
            return [x for x in obj["items"] if isinstance(x, dict)]
        return [obj]
    return []

def main():
    days, bad = [], []
    for name in sorted(os.listdir(DATA)) if os.path.isdir(DATA) else []:
        m = DATE_RE.match(name)
        if not m:
            continue
        path = os.path.join(DATA, name)
        try:
            with open(path, encoding="utf-8") as f:
                items = items_of(json.load(f))
        except Exception as e:  # 非法文件跳过，但报告
            bad.append(name)
            print(f"[build_index] 跳过非法 JSON: {name}: {e}", file=sys.stderr)
            continue
        cats = {}
        for it in items:
            k = norm_cat(it.get("category"))
            cats[k] = cats.get(k, 0) + 1
        days.append({"date": m.group(1), "file": name, "total": len(items), "categories": cats})
    days.sort(key=lambda d: d["date"], reverse=True)
    out = {
        "generated_at": datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds"),
        "days": days,
    }
    tmp = os.path.join(DATA, "index.json.tmp")
    os.makedirs(DATA, exist_ok=True)
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write("\n")
    os.replace(tmp, os.path.join(DATA, "index.json"))
    print(f"[build_index] 已写入 data/index.json：{len(days)} 天")
    return 0  # 非法文件只警告，不阻塞

if __name__ == "__main__":
    sys.exit(main())
