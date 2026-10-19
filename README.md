# X 热点存档（x-hotspots）

每日 X 热点的静态存档网站，发布在 GitHub Pages：

- 网站：https://zyjtc2046.github.io/x-hotspots/
- 仓库：https://github.com/zyjtc2046/x-hotspots

> 本说明写给每天存数据的助手 **Spider**。

## 每天要做的事（只有两步）

1. 把当天数据写到 `/workspace/x-hotspots/data/YYYY-MM-DD.json`（**北京时间**日期，例如 `data/2026-10-19.json`）。
2. 运行：

```bash
bash /workspace/x-hotspots/publish.sh
```

日期参数可选，默认是今天（Asia/Shanghai）。补发某一天：

```bash
bash /workspace/x-hotspots/publish.sh 2026-10-18
```

这条命令会依次：校验 `data/<日期>.json` 存在且是合法 JSON 数组 → 重建 `data/index.json` → `git add data/` 并 commit（数据没变就跳过）→ `git pull --rebase` → `git push origin main`。
成功时最后一行是 `✅ 已发布 …`，退出码 0；失败时打印 `❌ 发布失败：原因`，退出码非 0。可以重复运行（幂等）。网站一般 1–2 分钟后更新。

## 数据格式

文件内容是一个 **JSON 数组**，每个元素是一条热点：

```json
[
  {
    "date": "2026-10-19",
    "category": "AI",
    "summary": "埃森哲给员工的 token 费用设上限，每人每月 29 美元",
    "author": "@jefflijun",
    "url": "https://x.com/jefflijun/status/2112056607018209652",
    "extra_urls": [],
    "metrics": {"likes": 0, "reposts": 0, "replies": 1, "views": 522}
  }
]
```

| 字段 | 说明 |
|---|---|
| `date` | `YYYY-MM-DD`，应与文件名一致 |
| `category` | 只能是下面四个值之一 |
| `summary` | 中文摘要（会被全文搜索） |
| `author` | X 账号，如 `@jefflijun`（会被搜索，并链接到主页） |
| `url` | 原帖链接（需以 `http(s)://` 开头才会显示） |
| `extra_urls` | 额外链接数组，可为空 `[]` |
| `metrics` | 互动数据对象；`likes` 赞、`reposts` 转、`replies` 评、`views` 阅，其他键原样显示 |

字段缺失不会让网页崩溃，只是那一项不显示。文件用 UTF-8 编码。

### 分类取值

| `category` 值 | 网页显示 |
|---|---|
| `AI` | AI |
| `Crypto` | 加密货币 |
| `国内形势` | 国内形势 |
| `国际形势` | 国际形势 |

大小写要一致。写成别的值也能发布（会打印警告），网页会原样显示为一个新分类。

## 常见报错处理

| 报错 | 原因 / 处理 |
|---|---|
| `找不到数据文件 data/YYYY-MM-DD.json` | 文件没写到 `/workspace/x-hotspots/data/`，或日期不对（注意用北京时间）。写好后重跑。 |
| `JSON 不合法: …` | 文件内容不是合法 JSON（常见：末尾多逗号、中文引号、文件被截断）。按提示的行列号修复后重跑。 |
| `顶层必须是数组 [...]` | 外层要是 `[ ... ]`，不要包成 `{"items": [...]}`。 |
| `⚠ 警告：出现非标准分类` | 不会阻止发布；检查 `category` 是否写错（例如 `crypto` 应为 `Crypto`）。 |
| `数据没有变化，跳过 commit` | 不是错误，说明这天的数据之前已发布过。 |
| `git pull --rebase 失败` | 远端有冲突或网络问题；脚本已自动中止 rebase，本地提交还在。稍后重跑；仍失败就交给 Engineer。 |
| `git push 失败` | 网络问题或 GitHub 登录失效。运行 `gh auth status` 检查，失效时请 Engineer 重新登录后重跑。 |
| `没有配置远程 origin` | 仓库远程丢失，交给 Engineer 处理。 |

## 其他说明

- 只需要往 `data/` 放 `YYYY-MM-DD.json`，不要手动改 `data/index.json`，它由 `scripts/build_index.py` 自动生成。
- 不要把测试/示例数据放进 `data/`，否则会被发布到公开网站。
- 网站功能：首页按日期倒序列出报告并带分类条数标签；点日期进入单日页（按分类分组，可前后翻天）；顶部分类标签筛选；搜索框在浏览器端搜索全部历史的摘要和作者。
- 本仓库是公开的，内容所有人可见。

## 文件结构

```
index.html            页面入口（hash 路由：#/、#/day/日期、#/search?q=）
assets/app.js         前端逻辑（无外部依赖）
assets/style.css      样式
data/                 每日数据 YYYY-MM-DD.json + 自动生成的 index.json
scripts/build_index.py 重建 data/index.json（Python3 标准库）
publish.sh            一键发布
.nojekyll             让 GitHub Pages 原样发布
```
