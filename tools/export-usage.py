#!/usr/bin/env python3
"""
export-usage.py — turn your own Claude Code history into dashboard data.

Claude Code writes a transcript for every session to
    ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl
and each assistant record in it carries a real `usage` block: input tokens,
output tokens, cache reads and cache writes, plus a timestamp, the model and
the working directory.

This script rolls those up per day and writes the JSON the dashboard reads.

PRIVACY — what this script does and does not read
    It reads ONLY:  timestamp, sessionId, cwd, message.model, message.usage
    It never reads: message content, your prompts, Claude's replies, file
                    contents, tool inputs or tool outputs.
    The output contains counts and project directory names. Nothing else.
    Check for yourself: the only fields touched are in `_extract()` below.

USAGE
    python3 tools/export-usage.py
    python3 tools/export-usage.py --out assets/data/usage.json
    python3 tools/export-usage.py --claude-dir ~/.claude --days 365
    python3 tools/export-usage.py --list          # just show what was found

Then reload the dashboard. It picks the file up automatically.
"""

import argparse
import collections
import datetime as dt
import json
import os
import pathlib
import sys

# Models are labelled from whatever actually appears in your history.
PRETTY = {
    'claude-opus-5': 'Opus 5',
    'claude-opus-4-8': 'Opus 4.8',
    'claude-opus-4-7': 'Opus 4.7',
    'claude-opus-4-6': 'Opus 4.6',
    'claude-sonnet-5': 'Sonnet 5',
    'claude-sonnet-4-6': 'Sonnet 4.6',
    'claude-haiku-4-5': 'Haiku 4.5',
    'claude-fable-5': 'Fable 5',
    'claude-fable-5-1': 'Fable 5.1',
}


def pretty_model(model_id):
    if model_id in PRETTY:
        return PRETTY[model_id]
    # Unknown or future model: tidy the id rather than guess a marketing name.
    return model_id.replace('claude-', '').replace('-', ' ').strip() or 'unknown'


def _extract(record):
    """The only fields this tool ever looks at."""
    if record.get('type') != 'assistant':
        return None
    message = record.get('message') or {}
    usage = message.get('usage') or {}
    if not usage:
        return None
    ts = record.get('timestamp')
    if not ts:
        return None
    return {
        'ts': ts,
        'session': record.get('sessionId'),
        'cwd': record.get('cwd') or '',
        'model': message.get('model') or 'unknown',
        'in': usage.get('input_tokens', 0) or 0,
        'out': usage.get('output_tokens', 0) or 0,
        'cache_read': usage.get('cache_read_input_tokens', 0) or 0,
        'cache_write': usage.get('cache_creation_input_tokens', 0) or 0,
    }


def project_name(cwd):
    base = os.path.basename(cwd.rstrip('/')) if cwd else ''
    return base or 'unknown'


def collect(claude_dir, max_days):
    projects_dir = pathlib.Path(claude_dir).expanduser() / 'projects'
    if not projects_dir.is_dir():
        sys.exit(
            "No transcripts found at %s\n"
            "Claude Code stores them under ~/.claude/projects/. If you use a "
            "different home or CLAUDE_CONFIG_DIR, pass --claude-dir." % projects_dir
        )

    files = sorted(projects_dir.glob('*/*.jsonl'))
    if not files:
        sys.exit("Found %s but it contains no .jsonl transcripts yet." % projects_dir)

    cutoff = None
    if max_days:
        cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=max_days)).date()

    rows = []
    skipped = 0
    for path in files:
        try:
            with path.open(encoding='utf-8', errors='replace') as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                    except (ValueError, TypeError):
                        skipped += 1
                        continue
                    row = _extract(record)
                    if row is None:
                        continue
                    day = row['ts'][:10]
                    if cutoff and day < cutoff.isoformat():
                        continue
                    rows.append(row)
        except OSError as exc:
            print('  ! could not read %s (%s)' % (path.name, exc), file=sys.stderr)

    return rows, len(files), skipped


def build(rows):
    by_day = collections.defaultdict(lambda: {
        'messages': 0, 'sessions': set(),
        'in': 0, 'out': 0, 'cache_read': 0, 'cache_write': 0,
        'models': collections.Counter(), 'projects': collections.Counter(),
        'hourly': [0] * 24,
    })

    models_seen = collections.Counter()
    projects_seen = collections.Counter()

    for r in rows:
        day = r['ts'][:10]
        try:
            hour = int(r['ts'][11:13])
        except ValueError:
            hour = 0
        d = by_day[day]
        d['messages'] += 1
        if r['session']:
            d['sessions'].add(r['session'])
        d['in'] += r['in']
        d['out'] += r['out']
        d['cache_read'] += r['cache_read']
        d['cache_write'] += r['cache_write']
        d['hourly'][hour % 24] += 1

        total = r['in'] + r['out'] + r['cache_read'] + r['cache_write']
        d['models'][r['model']] += total
        pname = project_name(r['cwd'])
        d['projects'][pname] += total
        models_seen[r['model']] += total
        projects_seen[pname] += total

    if not by_day:
        sys.exit("No usage records found in the selected window.")

    # Fill every calendar day in the range, so gaps read as real inactivity.
    first = min(by_day)
    last = max(by_day)
    start = dt.date.fromisoformat(first)
    end = dt.date.fromisoformat(last)

    days = []
    cursor = start
    while cursor <= end:
        key = cursor.isoformat()
        d = by_day.get(key)
        if d is None:
            days.append({
                'date': key, 'weekday': cursor.weekday(),
                'sessions': 0, 'messages': 0, 'toolCalls': 0,
                'tokensIn': 0, 'tokensOut': 0, 'cacheRead': 0, 'cacheWrite': 0,
                'tokensTotal': 0, 'linesAdded': 0, 'linesRemoved': 0,
                'modelSplit': {}, 'projSplit': {}, 'hourly': [0] * 24,
            })
        else:
            total = d['in'] + d['out'] + d['cache_read'] + d['cache_write']
            days.append({
                'date': key,
                'weekday': cursor.weekday(),            # 0 = Monday
                'sessions': len(d['sessions']),
                'messages': d['messages'],
                'toolCalls': 0,                          # not derivable without content
                'tokensIn': d['in'],
                'tokensOut': d['out'],
                'cacheRead': d['cache_read'],
                'cacheWrite': d['cache_write'],
                'tokensTotal': total,
                'linesAdded': 0,                         # not derivable without content
                'linesRemoved': 0,
                'modelSplit': _share(d['models']),
                'projSplit': _share(d['projects']),
                'hourly': d['hourly'],
            })
        cursor += dt.timedelta(days=1)

    models = [
        {'id': mid, 'name': pretty_model(mid), 'slot': i}
        for i, (mid, _) in enumerate(models_seen.most_common())
    ]
    projects = [
        {'id': name, 'name': name, 'lang': '—', 'slot': i, 'repo': None}
        for i, (name, _) in enumerate(projects_seen.most_common())
    ]

    return {
        'meta': {
            'source': 'claude-code-local-transcripts',
            'generated': dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
            'from': first,
            'to': last,
            'days': len(days),
            'costBasis': 'subscription',
            'note': ('Token counts are real, taken from local Claude Code transcripts. '
                     'Costs shown in the dashboard are what this usage would cost at API '
                     'rates — on a Claude.ai subscription you pay a flat fee instead.'),
            'notCovered': ['claude.ai web and mobile chats',
                           'sessions on other machines',
                           'transcripts already pruned by Claude Code'],
        },
        'models': models,
        'projects': projects,
        'days': days,
    }


def _share(counter):
    total = sum(counter.values())
    if not total:
        return {}
    return {k: round(v / total, 6) for k, v in counter.items()}


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--claude-dir', default=os.environ.get('CLAUDE_CONFIG_DIR', '~/.claude'),
                    help='Claude Code config directory (default: ~/.claude)')
    ap.add_argument('--out', default='assets/data/usage.json',
                    help='where to write the JSON (default: assets/data/usage.json)')
    ap.add_argument('--days', type=int, default=0,
                    help='only include the last N days (default: everything)')
    ap.add_argument('--list', action='store_true',
                    help='print a summary and exit without writing')
    args = ap.parse_args()

    rows, file_count, skipped = collect(args.claude_dir, args.days)
    payload = build(rows)
    meta = payload['meta']

    print('Read %d transcript file(s), %s usage records%s'
          % (file_count, f"{len(rows):,}", f", skipped {skipped} unparsable line(s)" if skipped else ''))
    print('Range     : %s → %s (%d days)' % (meta['from'], meta['to'], meta['days']))
    print('Projects  : %s' % ', '.join(p['name'] for p in payload['projects'][:8]))
    print('Models    : %s' % ', '.join(m['name'] for m in payload['models']))
    grand = sum(d['tokensTotal'] for d in payload['days'])
    active = sum(1 for d in payload['days'] if d['messages'])
    print('Tokens    : %s across %d active day(s)' % (f'{grand:,}', active))

    if args.list:
        return

    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=1), encoding='utf-8')
    print('\nWrote %s (%.1f KB)' % (out, out.stat().st_size / 1024))
    print('Reload the dashboard — it picks this file up automatically.')


if __name__ == '__main__':
    main()
