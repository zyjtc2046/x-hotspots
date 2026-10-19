(function () {
  "use strict";
  var CATS = ["AI", "Crypto", "国内形势", "国际形势"];
  var LABEL = { AI: "AI", Crypto: "加密货币", "国内形势": "国内形势", "国际形势": "国际形势" };
  var ALIAS = {
    ai: "AI", "人工智能": "AI",
    crypto: "Crypto", "加密货币": "Crypto", "币圈": "Crypto",
    china: "国内形势", domestic: "国内形势", "国内": "国内形势", "国内形势": "国内形势",
    world: "国际形势", international: "国际形势", global: "国际形势", "国际": "国际形势", "国际形势": "国际形势"
  };
  var METRIC = { likes: "赞", reposts: "转", retweets: "转", replies: "评", quotes: "引", views: "阅", bookmarks: "藏" };
  var app = document.getElementById("app");
  var tabs = document.getElementById("tabs");
  var qInput = document.getElementById("q");
  var index = null, cache = {};

  function normCat(c) {
    if (c === null || c === undefined || String(c).trim() === "") return "未分类";
    var s = String(c).trim();
    return ALIAS[s.toLowerCase()] || ALIAS[s] || s;
  }
  function label(c) { return LABEL[c] || c; }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    return /^https?:\/\//i.test(u) ? u : "";
  }
  function items(obj) {
    if (Array.isArray(obj)) return obj.filter(function (x) { return x && typeof x === "object"; });
    if (obj && typeof obj === "object") {
      if (Array.isArray(obj.items)) return items(obj.items);
      return [obj];
    }
    return [];
  }
  function fetchJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " HTTP " + r.status);
      return r.json();
    });
  }
  function loadIndex() {
    if (index) return Promise.resolve(index);
    return fetchJSON("data/index.json").then(function (j) {
      index = j && Array.isArray(j.days) ? j : { days: [] };
      return index;
    }, function () { index = { days: [] }; return index; });
  }
  function loadDay(date) {
    if (cache[date]) return Promise.resolve(cache[date]);
    return fetchJSON("data/" + date + ".json").then(function (j) {
      var list = items(j).map(function (it) { it._cat = normCat(it.category); it._date = it.date || date; return it; });
      cache[date] = list;
      return list;
    });
  }
  function tag(c, href) {
    var cls = "tag c-" + esc(c);
    return href ? '<a class="' + cls + '" href="' + esc(href) + '">' + esc(label(c)) + "</a>"
                : '<span class="' + cls + '">' + esc(label(c)) + "</span>";
  }
  function parseHash() {
    var h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    var qi = h.indexOf("?"), path = qi >= 0 ? h.slice(0, qi) : h, qs = qi >= 0 ? h.slice(qi + 1) : "";
    var params = {};
    qs.split("&").forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf("=");
      params[i >= 0 ? kv.slice(0, i) : kv] = i >= 0 ? kv.slice(i + 1) : "";
    });
    return { parts: path.split("/").filter(Boolean), params: params };
  }
  function link(parts, params) {
    var s = "#/" + parts.map(encodeURIComponent).join("/");
    var q = Object.keys(params || {}).filter(function (k) { return params[k]; })
      .map(function (k) { return k + "=" + encodeURIComponent(params[k]); }).join("&");
    return q ? s + "?" + q : s;
  }
  function renderTabs(route) {
    var cur = route.params.cat || "";
    var extra = {};
    (index ? index.days : []).forEach(function (d) {
      Object.keys(d.categories || {}).forEach(function (c) { if (CATS.indexOf(c) < 0) extra[c] = 1; });
    });
    var all = [""].concat(CATS, Object.keys(extra));
    tabs.innerHTML = all.map(function (c) {
      var p = {}; for (var k in route.params) p[k] = route.params[k];
      p.cat = c;
      return '<a class="tab' + (c === cur ? " on" : "") + '" href="' + esc(link(route.parts, p)) + '">' +
        esc(c ? label(c) : "全部") + "</a>";
    }).join("");
  }
  function empty(msg, sub) {
    return '<div class="empty"><div class="big">🗂️</div><p>' + esc(msg) + "</p>" +
      (sub ? '<p class="small">' + sub + "</p>" : "") + "</div>";
  }
  function hl(text, q) {
    var s = esc(text);
    if (!q) return s;
    var eq = esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return s.replace(new RegExp(eq, "gi"), function (m) { return "<mark>" + m + "</mark>"; });
  }
  function fmtNum(n) {
    var v = Number(n);
    if (!isFinite(v)) return esc(n);
    if (v >= 10000) return (v / 10000).toFixed(v >= 100000 ? 0 : 1) + "万";
    return String(v);
  }
  function renderItem(it, q, showDate) {
    var url = safeUrl(it.url);
    var author = it.author ? String(it.author) : "";
    var authorHtml = author ? hl(author, q) : '<span class="muted">未知作者</span>';
    var handle = author.replace(/^@/, "");
    if (author && /^@?[A-Za-z0-9_]{1,15}$/.test(author)) {
      authorHtml = '<a href="https://x.com/' + esc(handle) + '" target="_blank" rel="noopener">' + hl(author, q) + "</a>";
    }
    var m = it.metrics && typeof it.metrics === "object" ? it.metrics : null;
    var mHtml = m ? Object.keys(m).map(function (k) {
      return '<span title="' + esc(k) + '">' + esc(METRIC[k] || k) + " " + fmtNum(m[k]) + "</span>";
    }).join("") : "";
    var extras = Array.isArray(it.extra_urls) ? it.extra_urls : (it.extra_urls ? [it.extra_urls] : []);
    var exHtml = extras.map(function (u) {
      var su = safeUrl(typeof u === "object" && u ? u.url : u);
      return su ? '<li><a href="' + esc(su) + '" target="_blank" rel="noopener">' + esc(su) + "</a></li>" : "";
    }).join("");
    return '<article class="item">' +
      '<div class="meta">' + tag(it._cat) +
      (showDate ? '<a href="' + esc(link(["day", it._date])) + '">' + esc(it._date) + "</a>" : "") +
      "<span>" + authorHtml + "</span>" +
      (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">原帖 ↗</a>' : "") + "</div>" +
      '<div class="sum">' + (it.summary ? hl(it.summary, q) : '<span class="muted">（无摘要）</span>') + "</div>" +
      (mHtml ? '<div class="meta">' + mHtml + "</div>" : "") +
      (exHtml ? '<ul class="links">' + exHtml + "</ul>" : "") +
      "</article>";
  }

  function viewHome(route) {
    var cat = route.params.cat || "";
    var days = index.days.filter(function (d) { return !cat || (d.categories || {})[cat]; });
    var h = "<h1>每日 X 热点</h1><p class=\"muted\">AI、加密货币、国内形势、国际形势，北京时间每天 5:30 更新。</p>";
    h += "<h2>" + (cat ? label(cat) + " · " : "") + "历史报告</h2>";
    if (!index.days.length) return h + empty("还没有数据", "第一份报告生成后会自动出现在这里。");
    if (!days.length) return h + empty("该分类暂无报告");
    h += '<ul class="days">' + days.map(function (d) {
      var cats = d.categories || {};
      var order = CATS.filter(function (c) { return cats[c]; }).concat(Object.keys(cats).filter(function (c) { return CATS.indexOf(c) < 0; }));
      return '<li><a class="d" href="' + esc(link(["day", d.date], { cat: cat })) + '">' + esc(d.date) + "</a>" +
        '<span class="muted small">' + esc(d.total || 0) + " 条</span>" +
        order.map(function (c) { return tag(c, link(["day", d.date], { cat: c })).replace("</a>", " " + cats[c] + "</a>"); }).join("") +
        "</li>";
    }).join("") + "</ul>";
    return h;
  }
  function viewDay(route, date) {
    var cat = route.params.cat || "";
    var dates = index.days.map(function (d) { return d.date; });
    var i = dates.indexOf(date);
    return loadDay(date).then(function (list) {
      var shown = list.filter(function (it) { return !cat || it._cat === cat; });
      var h = "<h1>" + esc(date) + " 热点</h1><p class=\"muted\">共 " + list.length + " 条" +
        (cat ? "，当前筛选「" + esc(label(cat)) + "」" + shown.length + " 条" : "") + "</p>";
      var groups = cat ? [cat] : CATS.concat(shown.map(function (x) { return x._cat; }).filter(function (c, k, a) { return CATS.indexOf(c) < 0 && a.indexOf(c) === k; }));
      groups.forEach(function (g) {
        var arr = shown.filter(function (it) { return it._cat === g; });
        if (!arr.length) return;
        h += "<h2>" + esc(label(g)) + ' <span class="muted small">' + arr.length + "</span></h2>" +
          arr.map(function (it) { return renderItem(it, "", false); }).join("");
      });
      if (!shown.length) h += empty(cat ? "当天该分类没有内容" : "当天没有内容");
      var newer = i > 0 ? dates[i - 1] : null, older = i >= 0 && i < dates.length - 1 ? dates[i + 1] : null;
      h += '<div class="nav"><span>' + (older ? '<a href="' + esc(link(["day", older], { cat: cat })) + '">← ' + esc(older) + "</a>" : "") +
        '</span><a href="#/">全部日期</a><span>' + (newer ? '<a href="' + esc(link(["day", newer], { cat: cat })) + '">' + esc(newer) + " →</a>" : "") + "</span></div>";
      return h;
    }, function () { return empty("找不到 " + date + " 的数据", '<a href="#/">返回首页</a>'); });
  }
  function viewSearch(route) {
    var q = (route.params.q || "").trim(), cat = route.params.cat || "";
    qInput.value = q;
    if (!q) return Promise.resolve("<h1>搜索</h1>" + empty("在上方输入关键词，搜索全部历史的摘要和作者"));
    if (!index.days.length) return Promise.resolve(empty("还没有数据可搜索"));
    var ql = q.toLowerCase();
    return Promise.all(index.days.map(function (d) {
      return loadDay(d.date).catch(function () { return []; });
    })).then(function (all) {
      var res = [];
      all.forEach(function (list) {
        list.forEach(function (it) {
          if (cat && it._cat !== cat) return;
          var hay = (String(it.summary || "") + "\n" + String(it.author || "")).toLowerCase();
          if (hay.indexOf(ql) >= 0) res.push(it);
        });
      });
      var h = "<h1>搜索：" + esc(q) + "</h1><p class=\"muted\">在 " + index.days.length + " 天中找到 " + res.length + " 条" +
        (cat ? "（分类：" + esc(label(cat)) + "）" : "") + "</p>";
      if (!res.length) return h + empty("没有匹配的结果，换个关键词试试");
      return h + res.slice(0, 500).map(function (it) { return renderItem(it, q, true); }).join("") +
        (res.length > 500 ? '<p class="muted">仅显示前 500 条。</p>' : "");
    });
  }

  function route() {
    var r = parseHash();
    loadIndex().then(function () {
      renderTabs(r);
      var p = r.parts;
      if (p[0] !== "search") qInput.value = "";
      if (p[0] === "day" && /^\d{4}-\d{2}-\d{2}$/.test(p[1] || "")) return viewDay(r, p[1]);
      if (p[0] === "search") return viewSearch(r);
      return viewHome(r);
    }).then(function (html) {
      app.innerHTML = html;
      window.scrollTo(0, 0);
    }).catch(function (e) {
      app.innerHTML = empty("加载失败", esc(e && e.message));
    });
  }
  document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var r = parseHash();
    location.hash = link(["search"], { q: qInput.value.trim(), cat: r.params.cat || "" });
  });
  window.addEventListener("hashchange", route);
  route();
})();
