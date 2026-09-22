"""Link six completed capture windows to real, local model-run records.

Offline only. Publishes an explicit metadata allowlist: never full requests,
provider responses, generated copy, replies, credentials, or private paths.
Run only after the operator confirms that capture 06 is complete.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

EVIDENCE = Path(__file__).resolve().parent
DEMO = EVIDENCE.parent
PRODUCTION = DEMO.parent / "production"
APPS = {1: "stays", 2: "analytics", 3: "shop", 4: "board", 5: "inbox", 6: "landing"}
MODES = ("jev", "laya", "jev+llm", "laya+llm")
START_MARKER = "<!-- filming-summary:start -->"
END_MARKER = "<!-- filming-summary:end -->"


def stamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("A timestamp lacks its time zone")
    return parsed.astimezone(timezone.utc)


def number(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0 else None


def run_id(value):
    return value if isinstance(value, str) and re.fullmatch(r"[a-f0-9]{32}", value) else None


def digest(value):
    return hashlib.sha256(value).hexdigest()


def cost(record):
    """Return observed/estimated cost without treating unknown failure cost as zero."""
    result = record.get("result", {})
    if record.get("status") == "complete":
        return number(result.get("cost_usd")), {
            "jev": "published_rate_estimate", "laya": "API_charge_only_hardware_excluded"
        }.get(record["provider"], "provider_returned_usage_cost")
    if record.get("kind") == "plan":
        if record.get("provider") == "laya":
            return 0, "API_charge_only_hardware_excluded"
        tokens = [number(call.get("response", {}).get("usage", {}).get("input_tokens")) for call in record.get("calls", [])]
        if tokens and all(value is not None for value in tokens):
            return round(sum(tokens) * 0.042 / 1_000_000, 10), "observed_completed_calls_at_published_rate_incomplete_failure_cost"
    for key in ("llm_response", "rejected_response"):
        raw = record.get(key, {})
        value = number(raw.get("usage", {}).get("cost")) if isinstance(raw, dict) else None
        if value is not None:
            return value, "provider_returned_usage_cost_for_failed_result"
    return None, "unknown_not_assumed_zero"


def safe_run(record, start, finish):
    result = record.get("result", {})
    elapsed = number(result.get("elapsed_ms", record.get("elapsed_ms")))
    began = stamp(record["created_at"])
    ended = began + timedelta(milliseconds=elapsed) if elapsed is not None else None
    request = record.get("request", {})
    parent = run_id(result.get("planner_run_id")) or run_id(request.get("plan", {}).get("run_id"))
    value, basis = cost(record)
    failure_http = re.search(r"Provider HTTP (\d{3})\b", record.get("error", ""))
    stages = []
    for stage in result.get("stages", record.get("stages", [])):
        if stage.get("name") in {"decision_1", "decision_2", "llm_refine"} and number(stage.get("elapsed_ms")) is not None:
            stages.append({"name": stage["name"], "elapsed_ms": stage["elapsed_ms"]})
    transport = {}
    for raw in (result.get("raw", {}), record.get("llm_response", {}), record.get("rejected_response", {})):
        observed = raw.get("local_transport", {}) if isinstance(raw, dict) else {}
        for key in ("queue_ms", "request_ms", "max_concurrent_requests"):
            if number(observed.get(key)) is not None:
                transport[key] = observed[key]
        if isinstance(observed.get("provider_request_started"), bool):
            transport["provider_request_started"] = observed["provider_request_started"]
    return {
        "run_id": record["run_id"], "app": record["app"], "provider": record["provider"],
        "kind": record["kind"], "status": record["status"],
        "phase": "revision" if request.get("previous") is not None else "initial",
        "planner_run_id": parent,
        "request_reference": {"brief_sha256": digest(request.get("prompt", "").encode()), "has_previous_spec": request.get("previous") is not None},
        "created_at": began.isoformat(), "server_elapsed_ms": elapsed,
        "derived_finished_at": ended.isoformat() if ended else None,
        "offset_from_capture_start_ms": round((began - start).total_seconds() * 1000, 1),
        "started_inside_capture_window": start <= began <= finish,
        "derived_finish_inside_capture_window": start <= ended <= finish if ended else None,
        "stages": stages, "cost_usd": value, "cost_basis": basis,
        "observed_local_transport": transport or None,
        "failure_http_status": int(failure_http.group(1)) if failure_http else None,
        "failure_detail": "provider_HTTP_error" if failure_http else "recorded_failure_details_omitted" if record["status"] != "complete" else None,
    }


def derive_slots(records, anomalies):
    slots = []
    for phase in ("initial", "revision"):
        group = [r for r in records if r["phase"] == phase]
        for provider in ("jev", "laya"):
            plans = [r for r in group if r["kind"] == "plan" and r["provider"] == provider]
            refinements = [r for r in group if r["kind"] == "refine" and r["provider"] == provider + "+llm"]
            expected_plans = 1 if phase == "initial" else 2
            if len(plans) != expected_plans or len(refinements) != 1:
                anomalies.append(f"{phase}/{provider}: observed {len(plans)} plans and {len(refinements)} refinements; expected {expected_plans} and 1")
            refinement = refinements[0] if len(refinements) == 1 else None
            plus_parent = next((p for p in plans if refinement and p["run_id"] == refinement["planner_run_id"]), None)
            if phase == "initial":
                only = plans[0] if len(plans) == 1 else None
            else:
                unreferenced = [p for p in plans if not any(r["planner_run_id"] == p["run_id"] for r in refinements)]
                only = unreferenced[0] if len(unreferenced) == 1 else None
            for mode, evidence, parent in ((provider, only, None), (provider + "+llm", refinement, plus_parent)):
                if evidence is None:
                    status = "NOT_RECORDED_OR_AMBIGUOUS"
                elif mode.endswith("+llm") and parent is None:
                    status = "UNLINKED"
                    anomalies.append(f"{phase}/{mode}: refinement lacks its recorded planner")
                else:
                    status = "PASS" if evidence["status"] == "complete" else "FAIL"
                slots.append({"phase": phase, "mode": mode, "api_result_status": status,
                              "run_id": evidence["run_id"] if evidence else None,
                              "planner_run_id": parent["run_id"] if parent else None,
                              "browser_display_verified_by_this_script": False})
    return slots


def main():
    protocol_path = PRODUCTION / "protocol-v2.json"
    protocol_record = json.loads(protocol_path.read_text())
    protocol_started = stamp(protocol_record["startedAt"])
    protocol_clips = ["05-support-inbox", "06-product-landing"]
    if protocol_record.get("clips") != protocol_clips:
        raise SystemExit("Unexpected protocol-v2 clip assignment; review before publishing")
    protocol = {"metadata_filename": protocol_path.name, "metadata_sha256": digest(protocol_path.read_bytes()),
                "started_at": protocol_started.isoformat(), "clips": protocol_clips,
                "change": "LLM requests serialized; queue included in elapsed; no retry or provider fallback",
                "evidence_limit": "Operator protocol record and allowlisted run transport metadata; not causal evidence that serialization prevented provider errors."}
    captures = []
    for index, app in APPS.items():
        paths = sorted(PRODUCTION.glob(f"{index:02d}-*.mp4.capture.json"))
        if len(paths) != 1:
            raise SystemExit(f"Capture {index:02d} must have exactly one completed metadata file; no summary written")
        path = paths[0]
        metadata = json.loads(path.read_text())
        if metadata.get("completed") is not True or metadata.get("error"):
            raise SystemExit(f"Capture {index:02d} is incomplete or has a capture error; no summary written")
        start, finish = stamp(metadata["startedAt"]), stamp(metadata["finishedAt"])
        if finish <= start:
            raise SystemExit("Invalid capture interval; no summary written")
        if index <= 4 and finish >= protocol_started or index >= 5 and start < protocol_started:
            raise SystemExit("Capture overlaps or contradicts the protocol boundary; review before publishing")
        captures.append((index, app, path, metadata, start, finish))
    records = []
    for path in sorted((DEMO / "runs").glob("*.json")):
        if not run_id(path.stem):
            continue
        record = json.loads(path.read_text())
        if record.get("run_id") != path.stem or record.get("app") not in APPS.values() or record.get("provider") not in MODES or record.get("kind") not in {"plan", "refine"}:
            continue
        records.append(record)
    clips = []
    seen = set()
    for index, app, path, metadata, start, finish in captures:
        matches, anomalies = [], []
        for record in records:
            began = stamp(record["created_at"])
            # Do not import off-camera warm-up, debugging, or API-smoke requests.
            # A run begun before capture is excluded even if it finishes inside it.
            if not start <= began <= finish:
                continue
            if record["app"] != app:
                anomalies.append(f"Other app run overlaps capture: {record['run_id']} ({record['app']})")
                continue
            if record["run_id"] in seen:
                anomalies.append("Run overlaps multiple captures: " + record["run_id"])
            seen.add(record["run_id"])
            matches.append(safe_run(record, start, finish))
        matches.sort(key=lambda r: r["created_at"])
        slots = derive_slots(matches, anomalies)
        clips.append({
            "clip": index, "app": app, "video_filename": path.name.removesuffix(".capture.json"),
            "capture_metadata_filename": path.name, "capture_metadata_sha256": digest(path.read_bytes()),
            "capture_window": {"started_at": start.isoformat(), "finished_at": finish.isoformat(), "timestamp_precision": "metadata reports whole seconds"},
            "capture": {key: metadata.get(key) for key in ["completed", "durationSeconds", "width", "height", "audio", "recordedBytes", "observedCompleteFrameUpdates"]},
            "protocol_group": "01-04_before_LLM_serialization" if index <= 4 else "05-06_after_LLM_serialization",
            "protocol_group_source": "protocol-v2.json capture assignment and boundary timestamp; not inferred from timings",
            "logical_server_records": len(matches), "record_status_counts": dict(Counter(r["status"] for r in matches)),
            "phase_and_kind_counts": dict(Counter(r["phase"] + "/" + r["kind"] for r in matches)),
            "derived_result_slots": slots, "runs": matches, "anomalies": anomalies,
        })
    all_runs = {r["run_id"]: r for clip in clips for r in clip["runs"]}
    all_slots = [slot for clip in clips for slot in clip["derived_result_slots"]]
    failures = [r for r in all_runs.values() if r["status"] != "complete"]
    summary = {
        "scope": "Capture metadata linked to same-app server logs started within each capture window. Off-camera requests outside those windows are excluded. No media playback, visual inspection, UI automation or model calls performed by this script.",
        "recording_count": len(clips), "nominal_recording_count": 6,
        "record_count_definition": "Per app: initial two shared plans plus two refinements (4 records); revision four independent plans plus two refinements (6 records). Nominal six-app total: 60 logical server records.",
        "slot_count_definition": "Per app: four initial and four revision result slots. Nominal six-app total: 48. Slots are derived from run linkage, not proof of pixels displayed.",
        "nominal_logical_server_records": 60, "actual_unique_logical_server_records": len(all_runs),
        "record_status_counts": dict(Counter(r["status"] for r in all_runs.values())),
        "nominal_result_slots": 48, "derived_result_slot_count": len(all_slots),
        "result_slot_status_counts": dict(Counter(s["api_result_status"] for s in all_slots)),
        "known_cost_usd_counting_each_run_once": round(sum(r["cost_usd"] for r in all_runs.values() if r["cost_usd"] is not None), 10),
        "records_with_unknown_cost": sum(r["cost_usd"] is None for r in all_runs.values()),
        "cost_limit": "Jev published-rate estimates plus provider-returned usage. Local hardware excluded. Unknown failed-call cost is not zero. Not a billing invoice.",
        "protocol_boundary": protocol,
        "timing_limit": "Clips 01-04 precede LLM serialization; 05-06 follow it, per protocol-v2.json. Filming requests are interactive/concurrent and MUST NOT be pooled as a controlled benchmark. Capture timestamps have one-second precision; derived server finish excludes some response/log-write overhead. These observations do not establish that serialization caused the later absence of 429 errors.",
        "failures": [{key: r[key] for key in ["run_id", "app", "provider", "kind", "phase", "failure_http_status", "cost_usd"]} for r in failures],
        "clips": clips, "browser_display_verification": "NOT_RUN_BY_THIS_SCRIPT",
        "media_decode_and_full_playback": "NOT_RUN_BY_THIS_SCRIPT",
        "aesthetic_quality": "NOT_RUN_BY_THIS_SCRIPT",
    }
    target = EVIDENCE / "filming-summary.json"
    target.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    rows = []
    for clip in clips:
        totals = {phase: sum(s["api_result_status"] == "PASS" for s in clip["derived_result_slots"] if s["phase"] == phase) for phase in ("initial", "revision")}
        failures_here = [r for r in clip["runs"] if r["status"] != "complete"]
        notes = "; ".join(f"{r['phase']} {r['provider']} HTTP {r['failure_http_status']}" if r["failure_http_status"] else f"{r['phase']} {r['provider']} failed" for r in failures_here) or "No recorded model failure"
        rows.append(f"| {clip['clip']:02d} / {clip['app']} | {clip['logical_server_records']} | {totals['initial']}/4 | {totals['revision']}/4 | {notes} |")
    section = "\n" + START_MARKER + "\n## Filming run linkage\n\n" + (
        "[Filming summary](filming-summary.json) links the six capture windows to real server run IDs. "
        "[Offline script](summarize_filming.py) publishes metadata only; it does not make API calls, replay video or verify browser pixels. "
        "Only same-app requests started inside each capture window are included; off-camera API calls outside those windows are excluded. "
        "Raw requests, replies, provider responses and private paths are omitted.\n\n"
        "The nominal counts are **60 logical server records**, comprising 12 initial shared plans + 12 initial refinements + 24 independent revision plans + 12 revision refinements. "
        "Those produce **48 nominal result slots**: four initial and four revised modes per app. A plan record contains two typed-decision stages, so server-record counts are not individual model invocation counts.\n\n"
        f"Observed: **{len(all_runs)} unique server records**; record statuses `{json.dumps(summary['record_status_counts'], sort_keys=True)}`. "
        f"Derived slot statuses: `{json.dumps(summary['result_slot_status_counts'], sort_keys=True)}`. Failures remain included.\n\n"
        "| Capture / app | Server records | Initial API slots PASS | Revision API slots PASS | Retained failures |\n"
        "| --- | ---: | ---: | ---: | --- |\n" + "\n".join(rows) + "\n\n"
        "**Protocol boundary:** clips 01–04 were filmed before LLM request serialization; clips 05–06 were filmed after it. "
        "The operator's `protocol-v2.json` records the transition at `2026-09-22T13:02:55.740423+00:00`; its hash and safe metadata are included in the summary. "
        "Do not pool these filming timings as a performance benchmark or compare them as if request concurrency were fixed. The earlier six-app API smoke snapshot remains unchanged.\n\n"
        "The absence of later recorded 429s does not establish that serialization caused that outcome. Earlier failures remain part of the evidence.\n\n"
        f"Known recorded/estimated filming cost, counting every run once: **${summary['known_cost_usd_counting_each_run_once']:.10f}**. "
        f"Cost is unknown for **{summary['records_with_unknown_cost']} records**; these are not silently treated as free. "
        "Jev cost is a published-rate estimate, and local hardware is excluded.\n\n"
        "Capture timestamps have whole-second precision. Per-run offsets and derived finish times help locate a run, but do not establish frame-accurate synchronization or prove its response appeared on screen. "
        "Decode, continuous playback, UI interaction and visual privacy checks require separate evidence. Any unexpected count/linkage appears in the JSON `anomalies` arrays.\n"
    ) + END_MARKER + "\n"
    readme = EVIDENCE / "README.md"
    existing = readme.read_text()
    if START_MARKER in existing:
        before, remainder = existing.split(START_MARKER, 1)
        _, after = remainder.split(END_MARKER, 1)
        existing = before.rstrip() + section + after
    else:
        existing = existing.rstrip() + "\n" + section
    readme.write_text(existing)
    print(json.dumps({key: summary[key] for key in ["recording_count", "actual_unique_logical_server_records", "record_status_counts", "result_slot_status_counts", "records_with_unknown_cost"]}, indent=2))
    print("Anomalies:", sum(len(clip["anomalies"]) for clip in clips))


if __name__ == "__main__":
    main()
