const {
  useMemo,
  useState,
  useEffect,
  memo
} = React;
const PAGE_SIZE = 100;
const SAMPLE = `192.168.1.10 - - [03/Sep/2026:10:15:22 +0530] "GET /index.html HTTP/1.1" 200 1024
10.0.0.25 - - [03/Sep/2026:10:16:10 +0530] "GET /missing-page HTTP/1.1" 404 512
192.168.1.10 - - [03/Sep/2026:10:17:02 +0530] "POST /api/login HTTP/1.1" 500 245
172.16.0.4 - - [03/Sep/2026:10:18:55 +0530] "GET /admin HTTP/1.1" 403 321
malformed log row`;
const Metric = memo(function Metric({
  label,
  value,
  detail,
  tone
}) {
  return React.createElement("article", {
    className: `metric ${tone || ''}`
  }, React.createElement("p", null, label), React.createElement("strong", null, value), React.createElement("span", null, detail));
});
const RankedList = memo(function RankedList({
  title,
  items = [],
  suffix = 'requests',
  headerControls = null
}) {
  const safeItems = items || [];
  return React.createElement("section", {
    className: "panel"
  }, React.createElement("div", {
    className: "panel-head"
  }, React.createElement("h2", null, title), headerControls), safeItems.length ? React.createElement("ol", {
    className: "ranked"
  }, safeItems.map((x, i) => React.createElement("li", {
    key: x.label || i
  }, React.createElement("b", null, i + 1), React.createElement("span", {
    title: x.label
  }, x.label), React.createElement("em", null, (x.count || 0).toLocaleString(), " ", suffix)))) : React.createElement("p", {
    className: "empty"
  }, "Nothing to show."));
});
const StatusChart = memo(function StatusChart({
  items
}) {
  const safeItems = items || [];
  const max = useMemo(() => {
    if (!safeItems || !safeItems.length) return 1;
    return safeItems.reduce((acc, x) => Math.max(acc, x.count || 0), 1);
  }, [safeItems]);
  return React.createElement("section", {
    className: "panel"
  }, React.createElement("div", {
    className: "panel-head"
  }, React.createElement("h2", null, "Response codes")), safeItems.length ? React.createElement("div", {
    className: "bars"
  }, safeItems.map(x => React.createElement("div", {
    className: "bar-row",
    key: x.label
  }, React.createElement("span", null, x.label), React.createElement("i", null, React.createElement("b", {
    style: {
      width: `${(x.count || 0) / max * 100}%`
    }
  })), React.createElement("em", null, (x.count || 0).toLocaleString())))) : React.createElement("p", {
    className: "empty"
  }, "No readable lines found."));
});
const TimelineChart = memo(function TimelineChart({
  rawData,
  items
}) {
  const [unit, setUnit] = useState('hour');
  const [limit, setLimit] = useState(10);
  const [limitCustom, setLimitCustom] = useState(false);
  const [limitInput, setLimitInput] = useState('10');
  const [sortBy, setSortBy] = useState('chronological');
  const dataSrc = rawData !== undefined ? rawData : items;
  const availableData = useMemo(() => {
    if (!dataSrc) return [];
    if (Array.isArray(dataSrc)) return dataSrc;
    if (typeof dataSrc === 'object' && dataSrc !== null) {
      const arr = dataSrc[unit];
      if (Array.isArray(arr)) return arr;
    }
    return [];
  }, [dataSrc, unit]);
  const displayedItems = useMemo(() => {
    if (!Array.isArray(availableData)) return [];
    let list = [...availableData];
    if (sortBy === 'busiest') {
      list.sort((a, b) => (b.count || 0) - (a.count || 0));
    }
    if (limit === 'all') return list;
    const n = typeof limit === 'number' ? limit : parseInt(limit, 10) || 10;
    return list.slice(0, n);
  }, [availableData, sortBy, limit]);
  const max = useMemo(() => {
    if (!displayedItems || !displayedItems.length) return 1;
    return displayedItems.reduce((acc, x) => Math.max(acc, x.count || 0), 1);
  }, [displayedItems]);
  return React.createElement("section", {
    className: "panel"
  }, React.createElement("div", {
    className: "panel-head"
  }, React.createElement("h2", null, "Requests over time"), React.createElement("div", {
    className: "panel-controls"
  }, React.createElement("label", {
    htmlFor: "timeUnitSelect"
  }, "Group by:"), React.createElement("select", {
    id: "timeUnitSelect",
    value: unit,
    onChange: e => setUnit(e.target.value)
  }, React.createElement("option", {
    value: "second"
  }, "Seconds"), React.createElement("option", {
    value: "minute"
  }, "Minutes"), React.createElement("option", {
    value: "hour"
  }, "Hours"), React.createElement("option", {
    value: "day"
  }, "Days"), React.createElement("option", {
    value: "week"
  }, "Weeks"), React.createElement("option", {
    value: "month"
  }, "Months")), React.createElement("label", {
    htmlFor: "timeLimitSelect",
    style: {
      marginLeft: '4px'
    }
  }, "Show:"), React.createElement("select", {
    id: "timeLimitSelect",
    value: limitCustom ? 'custom' : limit,
    onChange: e => {
      if (e.target.value === 'custom') {
        setLimitCustom(true);
        setLimitInput(String(limit === 'all' ? 10 : limit));
      } else if (e.target.value === 'all') {
        setLimitCustom(false);
        setLimit('all');
      } else {
        setLimitCustom(false);
        setLimit(parseInt(e.target.value, 10));
      }
    }
  }, React.createElement("option", {
    value: 5
  }, "Top 5"), React.createElement("option", {
    value: 10
  }, "Top 10"), React.createElement("option", {
    value: 24
  }, "Top 24"), React.createElement("option", {
    value: 50
  }, "Top 50"), React.createElement("option", {
    value: "all"
  }, "All"), React.createElement("option", {
    value: "custom"
  }, "Custom…")), limitCustom && React.createElement("input", {
    type: "number",
    min: "1",
    max: "5000",
    value: limitInput,
    style: {
      width: '4rem'
    },
    onChange: e => setLimitInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') e.target.blur();
    },
    onBlur: () => {
      const n = Math.max(1, parseInt(limitInput, 10) || 10);
      setLimit(n);
      setLimitInput(String(n));
    },
    autoFocus: true
  }), React.createElement("label", {
    htmlFor: "timeSortSelect",
    style: {
      marginLeft: '4px'
    }
  }, "Order:"), React.createElement("select", {
    id: "timeSortSelect",
    value: sortBy,
    onChange: e => setSortBy(e.target.value)
  }, React.createElement("option", {
    value: "chronological"
  }, "Timeline"), React.createElement("option", {
    value: "busiest"
  }, "Busiest")))), displayedItems && displayedItems.length ? React.createElement("div", {
    className: "bars"
  }, displayedItems.map(x => React.createElement("div", {
    className: "timeline-bar-row",
    key: x.label
  }, React.createElement("span", {
    title: x.label
  }, x.label), React.createElement("i", null, React.createElement("b", {
    style: {
      width: `${(x.count || 0) / max * 100}%`
    }
  })), React.createElement("em", null, (x.count || 0).toLocaleString())))) : React.createElement("p", {
    className: "empty"
  }, "No times found in this log."));
});
const ErrorRow = memo(function ErrorRow({
  x
}) {
  return React.createElement("tr", null, React.createElement("td", null, x.lineNumber), React.createElement("td", null, React.createElement("span", {
    className: "badge"
  }, x.status)), React.createElement("td", null, x.method ? React.createElement(React.Fragment, null, React.createElement("b", null, x.method), " ", x.path, React.createElement("small", null, x.ip, " · ", x.timestamp)) : React.createElement("code", null, x.raw)), React.createElement("td", null, x.description), React.createElement("td", null, x.suggestion));
});
function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('pylog-theme', next);
    } catch (e) {}
    setTheme(next);
  }
  return React.createElement("button", {
    className: "secondary",
    onClick: toggle
  }, theme === 'dark' ? 'Light mode' : 'Dark mode');
}
function downloadReport(data, topLimit) {
  const s = data.summary;
  const lines = [`PYLOG REPORT`, `File: ${data.fileName}`, '', `Lines read: ${s.totalLines}`, `Unreadable lines: ${s.malformedCount}`, `Failed requests: ${s.httpErrors}`, `Share with problems: ${s.errorRate}%`, '', `Busiest ${topLimit} visitors:`, ...data.topIps.slice(0, topLimit).map((x, i) => `${i + 1}. ${x.label} - ${x.count} requests`), '', 'Errors:', ...data.errors.map(x => `Line ${x.lineNumber} | ${x.status}: ${x.description} | What to try: ${x.suggestion}\n${x.raw}`)];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], {
    type: 'text/plain'
  }));
  a.download = 'pylog-report.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}
function App() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Pick a server log file to get started.');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [topLimit, setTopLimit] = useState(5);
  const [topLimitCustom, setTopLimitCustom] = useState(false);
  const [topLimitInput, setTopLimitInput] = useState('');
  const [everExpanded, setEverExpanded] = useState(false);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handler);
  }, [search]);
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [debouncedSearch, filter]);
  async function analyze(file) {
    if (!file) return;
    setBusy(true);
    setMessage('Reading your log file…');
    try {
      const content = await file.text();
      const r = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          fileName: file.name
        })
      });
      if (r.status === 413) throw new Error('File too large for the hosted version (limit ~4.5 MB). Try a smaller log or run locally.');
      let json;
      try { json = await r.json(); } catch (err) { throw new Error('Server returned an unexpected response (' + r.status + ').'); }
      if (!r.ok) throw new Error(json.error || 'Something went wrong while reading the file');
      setData(json);
      setSearch('');
      setDebouncedSearch('');
      setFilter('all');
      setVisible(PAGE_SIZE);
      setEverExpanded(false);
      setMessage(`Done. Read ${json.summary.totalLines.toLocaleString()} lines.`);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  function loadSample() {
    analyze(new File([SAMPLE], 'sample-access.log', {
      type: 'text/plain'
    }));
  }
  const searchable = useMemo(() => (data ? data.errors : []).map(x => ({
    x,
    text: [x.ip, x.path, x.method, x.status, x.timestamp, x.raw, x.description, x.suggestion].join(' ').toLowerCase()
  })), [data]);
  const statusOptions = useMemo(() => [...new Set((data ? data.errors : []).map(x => String(x.status)))].sort(), [data]);
  const errors = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return searchable.filter(r => (filter === 'all' || String(r.x.status) === filter) && (!q || r.text.includes(q))).map(r => r.x);
  }, [searchable, filter, debouncedSearch]);
  const shown = errors.slice(0, visible);
  const topIps = useMemo(() => data ? data.topIps.slice(0, topLimit) : [], [data, topLimit]);
  const topPaths = useMemo(() => data ? data.topPaths.slice(0, topLimit) : [], [data, topLimit]);
  const topMethods = useMemo(() => data ? data.topMethods.slice(0, topLimit) : [], [data, topLimit]);
  return React.createElement("main", null, React.createElement("header", null, React.createElement("div", null, React.createElement("p", {
    className: "eyebrow"
  }, "READ YOUR SERVER LOG"), React.createElement("h1", null, "Pylog Analyzer"), React.createElement("p", {
    className: "lead"
  }, "Drop in a server log to see who visited, what went wrong, and what you could try next.")), React.createElement("div", {
    className: "header-actions"
  }, React.createElement(ThemeToggle, null), React.createElement("button", {
    className: "secondary",
    onClick: loadSample,
    disabled: busy
  }, "Try sample data"))), React.createElement("section", {
    className: "upload"
  }, React.createElement("input", {
    id: "file",
    type: "file",
    accept: ".log,.txt,text/plain",
    onChange: e => {
      const file = e.target.files[0];
      e.target.value = '';
      analyze(file);
    }
  }), React.createElement("label", {
    htmlFor: "file"
  }, busy ? 'Reading…' : 'Choose a log file'), React.createElement("p", null, message)), data && React.createElement(React.Fragment, null, React.createElement("section", {
    className: "metrics"
  }, React.createElement(Metric, {
    label: "Lines read",
    value: data.summary.totalLines.toLocaleString(),
    detail: `${data.summary.uniqueIps.toLocaleString()} different visitors`
  }), React.createElement(Metric, {
    tone: "danger",
    label: "Failed requests",
    value: data.summary.httpErrors.toLocaleString(),
    detail: "Errors caused by visitors or the server"
  }), React.createElement(Metric, {
    tone: "warn",
    label: "Share with problems",
    value: `${data.summary.errorRate}%`,
    detail: "Failed requests plus unreadable lines"
  }), React.createElement(Metric, {
    label: "Unreadable lines",
    value: data.summary.malformedCount.toLocaleString(),
    detail: "Did not look like a normal log line"
  })), React.createElement("section", {
    className: "grid"
  }, React.createElement(StatusChart, {
    items: data.statusCodes || []
  }), React.createElement(TimelineChart, {
    rawData: data.requestsOverTime
  }), React.createElement(RankedList, {
    title: "Busiest visitors",
    items: topIps,
    headerControls: React.createElement("div", {
      className: "panel-controls"
    }, React.createElement("label", {
      htmlFor: "topLimitSelect"
    }, "Show:"), React.createElement("select", {
      id: "topLimitSelect",
      value: topLimitCustom ? 'custom' : topLimit,
      onChange: e => {
        if (e.target.value === 'custom') {
          setTopLimitCustom(true);
          setTopLimitInput(String(topLimit));
        } else {
          setTopLimitCustom(false);
          setTopLimit(parseInt(e.target.value, 10));
        }
      }
    }, [3, 5, 10, 15, 20, 50, 100].map(n => React.createElement("option", {
      key: n,
      value: n
    }, "Top ", n)), React.createElement("option", {
      value: "custom"
    }, "Custom…")), topLimitCustom && React.createElement("input", {
      type: "number",
      min: "1",
      max: "100",
      value: topLimitInput,
      placeholder: "1 to 100",
      style: {
        width: '4.5rem'
      },
      onChange: e => setTopLimitInput(e.target.value),
      onKeyDown: e => {
        if (e.key === 'Enter') e.target.blur();
      },
      onBlur: () => {
        const n = Math.min(100, Math.max(1, parseInt(topLimitInput, 10) || topLimit));
        setTopLimit(n);
        setTopLimitInput(String(n));
      },
      autoFocus: true
    }))
  }), React.createElement(RankedList, {
    title: "Most visited pages",
    items: topPaths
  }), React.createElement(RankedList, {
    title: "Request types",
    items: topMethods
  })), React.createElement("section", {
    className: "panel alert"
  }, React.createElement("div", null, React.createElement("h2", null, "Worth a look"), (data.suspiciousIps || []).length ? React.createElement("p", null, "These visitors sent a lot of requests:", ' ', data.suspiciousIps.map(x => `${x.ip} (${x.requests.toLocaleString()})`).join(', '), ". They could be bots, so it is worth checking.") : React.createElement("p", null, "No single visitor stood out for sending too many requests."), (data.errorSpikes || []).length > 0 && React.createElement("p", null, "More failures than usual in", ' ', data.errorSpikes.length === 1 ? 'this hour' : `${data.errorSpikes.length} hours`, ":", ' ', data.errorSpikes.map(x => `${x.hour} (${x.errorRate}% failed)`).join(', '), ". Something may have gone wrong during these times.")), React.createElement("button", {
    className: "download",
    onClick: () => downloadReport(data, topLimit)
  }, "Download report")), React.createElement("section", {
    className: "panel errors"
  }, React.createElement("div", {
    className: "section-head"
  }, React.createElement("div", null, React.createElement("h2", null, "Errors and what to try"), React.createElement("p", null, "Showing ", shown.length.toLocaleString(), " of", ' ', errors.length.toLocaleString(), " matching errors")), React.createElement("div", {
    className: "controls"
  }, React.createElement("input", {
    type: "text",
    name: "log-search",
    autoComplete: "off",
    spellCheck: false,
    "data-gramm": "false",
    "data-lpignore": "true",
    "data-1p-ignore": "true",
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "Search by IP, page, or message"
  }), React.createElement("select", {
    value: filter,
    onChange: e => setFilter(e.target.value)
  }, React.createElement("option", {
    value: "all"
  }, "All errors"), statusOptions.map(x => React.createElement("option", {
    key: x,
    value: x
  }, x))))), React.createElement("div", {
    className: "table-wrap"
  }, React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Line"), React.createElement("th", null, "Status"), React.createElement("th", null, "Request"), React.createElement("th", null, "What it means"), React.createElement("th", null, "What to try"))), React.createElement("tbody", null, errors.length ? shown.map(x => React.createElement(ErrorRow, {
    key: x.lineNumber,
    x: x
  })) : React.createElement("tr", null, React.createElement("td", {
    colSpan: "5",
    className: "empty"
  }, "Nothing matches that search."))))), (errors.length > shown.length || everExpanded) && React.createElement("div", {
    className: "more"
  }, errors.length > shown.length && React.createElement("button", {
    className: "secondary",
    onClick: () => {
      setVisible(v => v + PAGE_SIZE);
      setEverExpanded(true);
    }
  }, "Show ", Math.min(PAGE_SIZE, errors.length - shown.length), " more (", (errors.length - shown.length).toLocaleString(), " left)"), everExpanded && visible > PAGE_SIZE && React.createElement("button", {
    className: "secondary",
    onClick: () => {
      setVisible(PAGE_SIZE);
      setEverExpanded(false);
    }
  }, "Show less"), React.createElement("button", {
    className: "secondary",
    onClick: () => {
      const raw = window.prompt(`How many errors do you want to see? (1 to ${errors.length.toLocaleString()})`, String(visible));
      if (raw === null) return;
      const n = Math.min(errors.length, Math.max(1, parseInt(raw, 10) || visible));
      setVisible(n);
      if (n > PAGE_SIZE) setEverExpanded(true);
    }
  }, "Custom…")))));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));