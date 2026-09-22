"""Offline, post-hoc checks of explicit requests against recorded UISpec JSON.

This script makes no model, browser, or network calls. It does not assess visuals,
rendered behavior, copy accuracy, or aesthetic quality.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BATCH = ROOT / "six-app-smoke"
FIELDS = ["theme", "layout", "density", "typography", "corners", "hero", "emphasis"]
MODES = ["jev", "laya", "jev+llm", "laya+llm"]
# Mapped from the six recorded prompts after the run; these are not preregistered scores.
EXPECTED = {
    "stays-editorial": ["sand", "editorial", "comfortable", "editorial", "soft", "large", "visual", ["filters", "results", "compare"]],
    "analytics-compact": ["paper", "grid", "compact", "modern", "sharp", "small", "data", ["kpis", "chart", "transactions", "breakdown"]],
    "shop-showcase": ["rose", "showcase", "comfortable", "editorial", "soft", "large", "visual", ["categories", "products", "cart", "benefits"]],
    "board-focused": ["paper", "sidebar", "compact", "modern", "sharp", "hidden", "actions", ["overview", "filters", "kanban", "activity"]],
    "inbox-split": ["cobalt", "split", "compact", "modern", "soft", "small", "actions", ["overview", "filters", "messages", "detail"]],
    "landing-premium": ["midnight", "showcase", "comfortable", "editorial", "soft", "large", "visual", ["hero", "features", "pricing", "faq", "signup"]],
}


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def main():
    manifest = json.loads((BATCH / "manifest.json").read_text())
    slots = json.loads((BATCH / "slots.json").read_text())
    summary = json.loads((BATCH / "summary.json").read_text())
    assert hashlib.sha256(canonical(manifest["cases"]).encode()).hexdigest() == manifest["cases_sha256"]
    assert set(EXPECTED) == {case["id"] for case in manifest["cases"]}
    assert len(slots) == manifest["expected_result_slots"] == summary["recorded_slots"] == 24
    assert len({slot["run_id"] for slot in slots}) == 24
    assert all(slot["status"] == "PASS" for slot in slots), "Unexpected failure: retain the slot and update the disclosed rubric."
    rows = []
    for slot in slots:
        expected = dict(zip(FIELDS + ["sections"], EXPECTED[slot["case_id"]]))
        spec = slot["spec"]
        checks = {field: spec[field] == expected[field] for field in FIELDS}
        missing = [section for section in expected["sections"] if section not in spec["sections"]]
        checks["sections_presence"] = not missing
        rows.append({
            "case_id": slot["case_id"], "mode": slot["mode"], "repeat": slot["repeat"],
            "run_id": slot["run_id"], **({"planner_run_id": slot["planner_run_id"]} if "planner_run_id" in slot else {}),
            "api_contract_status": slot["status"], "expected": expected,
            "checks": checks, "matched_checks": sum(checks.values()), "total_checks": 8,
            "style_fields_matched": sum(checks[field] for field in FIELDS), "style_fields_total": 7,
            "required_sections_present": len(expected["sections"]) - len(missing),
            "required_sections_total": len(expected["sections"]), "missing_sections": missing,
            "extra_sections_unscored": [section for section in spec["sections"] if section not in expected["sections"]],
            "mismatches": {field: {"expected": expected[field], "actual": spec[field]} for field in FIELDS if not checks[field]},
        })
    aggregates = {}
    for mode in MODES:
        group = [row for row in rows if row["mode"] == mode]
        assert len(group) == 6
        aggregates[mode] = {
            "cases": len(group), "api_contract_passes": len(group),
            "style_fields_matched": sum(row["style_fields_matched"] for row in group), "style_fields_total": 42,
            "all_required_sections_present_cases": sum(row["checks"]["sections_presence"] for row in group),
            "required_sections_present": sum(row["required_sections_present"] for row in group), "required_sections_total": 24,
            "matched_checks": sum(row["matched_checks"] for row in group), "total_checks": 48,
            "all_eight_checks_matched_cases": sum(row["matched_checks"] == 8 for row in group),
            "field_counts": {field: sum(row["checks"][field] for row in group) for field in FIELDS + ["sections_presence"]},
        }
    result = {
        "analysis_type": "post_hoc_explicit_request_to_UISpec_matching",
        "rubric_preregistered": False, "source_case_hash_verified": True,
        "scope": "Recorded JSON only; seven exact enum matches plus one required-section-presence check per case.",
        "rubric": {
            "scalar_fields": FIELDS,
            "normalizations": {"serif headings/editorial type": "typography=editorial", "modern type/modern typography": "typography=modern", "photographs/visuals": "emphasis=visual", "KPIs": "kpis", "FAQ": "faq"},
            "sections_presence": "Pass when every explicitly requested section ID is present. Order and unrequested extra sections are not scored.",
            "weights": "One check per scalar field and one for complete requested-section presence: 8 per case, 48 per mode. Section-ID coverage is also reported separately (24 per mode).",
            "excluded": ["section order", "unrequested extras", "title/subtitle/note correctness", "rendered CSS appearance", "responsive layout", "interaction behavior", "aesthetic quality"],
        },
        "modes": aggregates, "cases": rows,
        "aesthetic_quality": "NOT_RUN", "browser_interaction_success": "NOT_RUN",
        "source_files_sha256": {name: hashlib.sha256((BATCH / name).read_bytes()).hexdigest() for name in ["manifest.json", "slots.json", "summary.json"]},
    }
    (BATCH / "request-adherence.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(aggregates, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
