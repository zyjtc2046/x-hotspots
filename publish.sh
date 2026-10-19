#!/usr/bin/env bash
# 用法: bash /workspace/x-hotspots/publish.sh [YYYY-MM-DD]
# 日期可选，默认今天（北京时间）。校验 data/<日期>.json → 重建 index.json → commit → pull --rebase → push origin main
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRANCH="main"
die() { echo "❌ 发布失败：$*" >&2; exit 1; }
info() { echo "▶ $*"; }

DATE="${1:-$(TZ=Asia/Shanghai date +%F)}"
[[ "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || die "日期格式应为 YYYY-MM-DD，收到：$DATE"
FILE="$REPO/data/$DATE.json"

cd "$REPO" || die "进不去仓库目录 $REPO"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "$REPO 不是 git 仓库"
git config user.name  "x-hotspots-bot"
git config user.email "11677229+zyjtc2046@users.noreply.github.com"

# 1. 校验数据文件
[[ -f "$FILE" ]] || die "找不到数据文件 data/$DATE.json（请先把当天数据写到 $FILE）"
python3 - "$FILE" <<'PY' || die "data/$DATE.json 校验未通过（见上方原因），未发布"
import json, sys
p = sys.argv[1]
try:
    with open(p, encoding="utf-8") as f:
        d = json.load(f)
except Exception as e:
    print(f"   JSON 不合法: {e}", file=sys.stderr); sys.exit(1)
if not isinstance(d, list):
    print(f"   顶层必须是数组 [...]，实际是 {type(d).__name__}", file=sys.stderr); sys.exit(1)
bad = [i for i, x in enumerate(d) if not isinstance(x, dict)]
if bad:
    print(f"   数组元素必须是对象，第 {bad[:5]} 个不是", file=sys.stderr); sys.exit(1)
known = {"AI", "Crypto", "国内形势", "国际形势"}
odd = sorted({str(x.get("category")) for x in d} - known)
if odd:
    print(f"   ⚠ 警告：出现非标准分类 {odd}，网页会原样显示", file=sys.stderr)
print(f"   ✔ {len(d)} 条，JSON 合法")
PY
info "校验 data/$DATE.json 通过"

# 2. 重建索引
python3 "$REPO/scripts/build_index.py" || die "重建 data/index.json 失败"

# 3. 提交（无变化跳过）
git add data/ || die "git add 失败"
if git diff --cached --quiet; then
  info "数据没有变化，跳过 commit"
else
  git commit -q -m "data: $DATE" || die "git commit 失败"
  info "已提交 data: $DATE"
fi

# 4. 同步并推送
git remote get-url origin >/dev/null 2>&1 || die "没有配置远程 origin"
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git pull -q --rebase origin "$BRANCH" || { git rebase --abort >/dev/null 2>&1; die "git pull --rebase 失败（可能有冲突或网络问题），已中止 rebase，本地提交保留"; }
fi
git push -q origin "HEAD:$BRANCH" || die "git push 失败（检查网络或 GitHub 登录：gh auth status）"
info "✅ 已发布 $DATE，1-2 分钟后网站更新：https://zyjtc2046.github.io/x-hotspots/#/day/$DATE"
