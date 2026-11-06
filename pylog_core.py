import datetime
from collections import Counter
from pathlib import Path


MAX_TOP = 100

MONTH_MAP = {
    "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
    "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
    "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
}
MONTH_NUMS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}


def sort_key_for_time(bucket: str) -> str:
    try:
        if "-W" in bucket:
            return bucket
        parts = bucket.split("/")
        if len(parts) == 3:
            day = parts[0]
            mon = MONTH_MAP.get(parts[1], parts[1])
            rest = parts[2]
            return f"{rest[:4]}-{mon}-{day:0>2}{rest[4:]}"
        elif len(parts) == 2:
            mon = MONTH_MAP.get(parts[0], parts[0])
            year = parts[1]
            return f"{year}-{mon}"
        return bucket
    except Exception:
        return bucket


KNOWN_ERROR_CODES = {
    400: ("Bad Request", "The request was not put together correctly. Check what the visitor or app is sending."),
    401: ("Unauthorized", "The visitor was not logged in or used the wrong details. Check the login steps."),
    403: ("Forbidden", "The visitor is not allowed in. Check who has access and who owns the files."),
    404: ("Not Found", "The page was not found. Fix the link or put the missing page back."),
    405: ("Method Not Allowed", "This page does not accept that kind of request. Check which request types it allows."),
    408: ("Request Timeout", "The visitor took too long. Check for slow connections and how busy the server is."),
    429: ("Too Many Requests", "Someone sent too many requests. Consider limiting how often a visitor can ask."),
    500: ("Internal Server Error", "Something broke on the server. Look in the app and server logs for the cause."),
    502: ("Bad Gateway", "One server got a bad reply from another. Check the service behind it and the connection."),
    503: ("Service Unavailable", "The server could not take the request. Check if it is overloaded, being worked on, or waiting on something else."),
    504: ("Gateway Timeout", "A server behind this one took too long. Check how slow it is and how long you wait for it."),
}


def explain_status(code: int) -> tuple[str, str]:
    if code in KNOWN_ERROR_CODES:
        return KNOWN_ERROR_CODES[code]
    if 400 <= code <= 499:
        return "Client Error", "The request had a problem. Check the link, the login, and the permissions."
    if 500 <= code <= 599:
        return "Server Error", "Something went wrong on the server. Check the logs and make sure everything it depends on is running."
    return "Unreadable Line", "This line does not look like a normal log line. Check how your server writes its logs."


def parse_line(raw_line: str) -> dict:
    line = raw_line.strip()
    if not line:
        raise ValueError("Empty line")

    first_token_end = line.find(" ")
    if first_token_end == -1:
        raise ValueError("Missing IP address")
    ip = line[:first_token_end]

    open_bracket = line.find("[")
    close_bracket = line.find("]")
    if open_bracket == -1 or close_bracket == -1 or close_bracket < open_bracket:
        raise ValueError("Missing or malformed timestamp")
    timestamp = line[open_bracket + 1:close_bracket]

    quote_start = line.find('"', close_bracket)
    if quote_start == -1:
        raise ValueError("Missing request section")
    quote_end = line.find('"', quote_start + 1)
    if quote_end == -1:
        raise ValueError("Unterminated request section")

    request_text = line[quote_start + 1:quote_end]
    request_parts = request_text.split()
    if len(request_parts) < 2:
        raise ValueError("Request section is incomplete")
    method, path = request_parts[0], request_parts[1]
    if not method.isalpha() or not method.isupper():
        raise ValueError("Invalid HTTP method")

    remainder = line[quote_end + 1:].strip().split()
    if not remainder:
        raise ValueError("Missing status code")
    if not remainder[0].isdigit() or len(remainder[0]) != 3:
        raise ValueError("Status code must be 3 digits")
    status = int(remainder[0])
    size = remainder[1] if len(remainder) > 1 else "-"

    day_str = timestamp[:2]
    mon_str = timestamp[3:6]
    year_str = timestamp[7:11]
    try:
        d = int(day_str)
        m = MONTH_NUMS.get(mon_str, 1)
        y = int(year_str)
        wk = datetime.date(y, m, d).isocalendar()[1]
        week_str = f"{y}-W{wk:02d}"
    except Exception:
        week_str = f"{year_str}-W01"

    return {
        "ip": ip,
        "timestamp": timestamp,
        "second": timestamp[:20],
        "minute": timestamp[:17],
        "hour": timestamp[:14],
        "day": timestamp[:11],
        "week": week_str,
        "month": f"{mon_str}/{year_str}",
        "method": method,
        "path": path,
        "status": status,
        "size": size,
        "raw": line,
    }


class LogAnalyzer:
    def __init__(self, top_limit: int = MAX_TOP, suspicious_ratio: float = 0.05, suspicious_min_hits: int = 100):
        self.top_limit = top_limit
        self.suspicious_ratio = suspicious_ratio
        self.suspicious_min_hits = suspicious_min_hits
        self.total_lines = 0
        self.malformed_lines = 0
        self.status_counter = Counter()
        self.ip_counter = Counter()
        self.path_counter = Counter()
        self.method_counter = Counter()
        self.error_log = []
        self.second_counter = Counter()
        self.minute_counter = Counter()
        self.hour_counter = Counter()
        self.day_counter = Counter()
        self.week_counter = Counter()
        self.month_counter = Counter()
        self.error_hour_counter = Counter()

    def record_malformed(self, line_number: int, raw_line: str) -> None:
        self.malformed_lines += 1
        label, suggestion = explain_status(0)
        self.error_log.append({
            "lineNumber": line_number,
            "status": "Malformed",
            "description": label,
            "suggestion": suggestion,
            "raw": raw_line.strip(),
        })

    def record_valid_line(self, line_number: int, entry: dict) -> None:
        self.status_counter[entry["status"]] += 1
        self.ip_counter[entry["ip"]] += 1
        self.path_counter[entry["path"]] += 1
        self.method_counter[entry["method"]] += 1
        self.second_counter[entry["second"]] += 1
        self.minute_counter[entry["minute"]] += 1
        self.hour_counter[entry["hour"]] += 1
        self.day_counter[entry["day"]] += 1
        self.week_counter[entry["week"]] += 1
        self.month_counter[entry["month"]] += 1

        if 400 <= entry["status"] <= 599:
            self.error_hour_counter[entry["hour"]] += 1
            label, suggestion = explain_status(entry["status"])
            self.error_log.append({
                "lineNumber": line_number,
                "status": entry["status"],
                "description": label,
                "suggestion": suggestion,
                "ip": entry["ip"],
                "path": entry["path"],
                "method": entry["method"],
                "timestamp": entry["timestamp"],
                "raw": entry["raw"],
            })

    def feed(self, log_text: str) -> None:
        for line_number, raw_line in enumerate(log_text.splitlines(), start=1):
            if not raw_line.strip():
                continue
            self.total_lines += 1
            try:
                entry = parse_line(raw_line)
            except ValueError:
                self.record_malformed(line_number, raw_line)
                continue
            self.record_valid_line(line_number, entry)

    def top(self, counter: Counter) -> list[dict]:
        return [{"label": str(key), "count": count}
                for key, count in counter.most_common(self.top_limit)]

    def find_suspicious_ips(self) -> list[dict]:
        threshold = max(self.suspicious_min_hits, self.total_lines * self.suspicious_ratio)
        return [{"ip": ip, "requests": count}
                for ip, count in self.ip_counter.most_common()
                if count >= threshold]

    def find_error_spikes(self) -> list[dict]:
        if not self.hour_counter or not self.total_lines:
            return []
        total_errors = sum(c for code, c in self.status_counter.items() if 400 <= code <= 599)
        overall_rate = total_errors / self.total_lines
        spikes = []
        for hour, total in self.hour_counter.items():
            errors = self.error_hour_counter.get(hour, 0)
            if errors < 10:
                continue
            hour_rate = errors / total
            if overall_rate > 0 and hour_rate >= 2 * overall_rate:
                spikes.append({
                    "hour": hour,
                    "requests": total,
                    "errors": errors,
                    "errorRate": round(hour_rate * 100, 1),
                })
        return sorted(spikes, key=lambda x: x["errorRate"], reverse=True)

    def report(self, file_name: str = "server.log") -> dict:
        http_errors = sum(count for code, count in self.status_counter.items() if 400 <= code <= 599)
        total_bad = http_errors + self.malformed_lines
        error_rate = round((total_bad / self.total_lines) * 100, 2) if self.total_lines else 0.0

        return {
            "fileName": file_name,
            "summary": {
                "totalLines": self.total_lines,
                "malformedCount": self.malformed_lines,
                "httpErrors": http_errors,
                "errorRate": error_rate,
                "uniqueIps": len(self.ip_counter),
            },
            "topIps": self.top(self.ip_counter),
            "topPaths": self.top(self.path_counter),
            "topMethods": self.top(self.method_counter),
            "statusCodes": [{"label": str(code), "count": count}
                            for code, count in self.status_counter.most_common()],
            "errors": self.error_log,
            "suspiciousIps": self.find_suspicious_ips(),
            "requestsOverTime": {
                "second": sorted(
                    [{"label": k, "count": c} for k, c in self.second_counter.most_common(500)],
                    key=lambda x: sort_key_for_time(x["label"]),
                ),
                "minute": sorted(
                    [{"label": k, "count": c} for k, c in self.minute_counter.items()],
                    key=lambda x: sort_key_for_time(x["label"]),
                ),
                "hour": sorted(
                    [{"label": k, "count": c} for k, c in self.hour_counter.items()],
                    key=lambda x: sort_key_for_time(x["label"]),
                ),
                "day": sorted(
                    [{"label": k, "count": c} for k, c in self.day_counter.items()],
                    key=lambda x: sort_key_for_time(x["label"]),
                ),
                "week": sorted(
                    [{"label": k, "count": c} for k, c in self.week_counter.items()],
                    key=lambda x: x["label"],
                ),
                "month": sorted(
                    [{"label": k, "count": c} for k, c in self.month_counter.items()],
                    key=lambda x: sort_key_for_time(x["label"]),
                ),
            },
            "errorSpikes": self.find_error_spikes(),
        }


def analyse_log(log_text: str, file_name: str = "server.log", top_limit: int = MAX_TOP) -> dict:
    analyzer = LogAnalyzer(top_limit=top_limit)
    analyzer.feed(log_text)
    return analyzer.report(file_name)
