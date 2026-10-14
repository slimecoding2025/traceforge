from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel
from ..models.events import NormalizedEvent, ParseSummary
from ..models.findings import AnalystNote, Finding
from ..models.investigations import AddNoteRequest, RuleDefinition, UpdateFindingStatusRequest
from ..investigations.service import InvestigationService
from ..reports.generator import ReportGenerator
from ..reports.redaction import PrivacyRedactor

router = APIRouter(prefix="/api")
service = InvestigationService()


class IngestLogRequest(BaseModel):
    content: str
    filename: Optional[str] = "input.log"
    clear_previous: Optional[bool] = False
    custom_thresholds: Optional[Dict[str, Dict[str, Any]]] = None


class GenerateReportRequest(BaseModel):
    format: str = "json"
    source_name: Optional[str] = "Investigation"
    redact_ips: bool = False
    redact_users: bool = False
    redact_hosts: bool = False
    notes_summary: Optional[str] = ""


@router.post("/logs/ingest")
def ingest_logs(req: IngestLogRequest):
    try:
        events, findings, summary = service.import_and_analyze(
            raw_text=req.content,
            filename=req.filename or "input.log",
            custom_thresholds=req.custom_thresholds,
            clear_previous=req.clear_previous or False,
        )
        return {
            "success": True,
            "events_count": len(events),
            "findings_count": len(findings),
            "summary": summary,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/overview")
def get_overview():
    return service.get_overview_statistics()


@router.get("/events")
def get_events(
    search: Optional[str] = None,
    event_type: Optional[str] = None,
    outcome: Optional[str] = None,
    source_ip: Optional[str] = None,
    username: Optional[str] = None,
    limit: int = Query(default=200, le=1000),
    offset: int = Query(default=0, ge=0),
):
    total = service.storage.count_events()
    events = service.storage.get_all_events(
        search=search,
        event_type=event_type,
        outcome=outcome,
        source_ip=source_ip,
        username=username,
        limit=limit,
        offset=offset,
    )
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "events": events,
    }


@router.get("/findings", response_model=List[Finding])
def get_findings(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    rule_id: Optional[str] = None,
):
    return service.get_findings(severity=severity, status=status, rule_id=rule_id)


@router.get("/findings/{finding_id}")
def get_finding_detail(finding_id: str):
    finding = service.get_finding_by_id(finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    evidence = service.get_finding_evidence(finding_id)
    return {
        "finding": finding,
        "evidence_events": evidence,
    }


@router.get("/findings/{finding_id}/evidence", response_model=List[NormalizedEvent])
def get_finding_evidence(finding_id: str):
    return service.get_finding_evidence(finding_id)


@router.patch("/findings/{finding_id}/status")
def update_finding_status(finding_id: str, req: UpdateFindingStatusRequest):
    try:
        updated = service.update_finding_status(
            finding_id=finding_id,
            new_status=req.status,
            note_text=req.note,
            author=req.author or "Analyst",
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Finding not found")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/findings/{finding_id}/notes")
def add_finding_note(finding_id: str, req: AddNoteRequest):
    note = service.add_note_to_finding(
        finding_id=finding_id,
        content=req.content,
        author=req.author or "Analyst",
    )
    if not note:
        raise HTTPException(status_code=404, detail="Finding not found")
    return note


@router.get("/rules", response_model=List[RuleDefinition])
def get_rules():
    return service.engine.get_rule_definitions()


@router.post("/reports/generate")
def generate_report(req: GenerateReportRequest):
    findings = service.get_findings()
    all_events = service.storage.get_all_events(limit=5000)
    events_map = {e.event_id: e for e in all_events}

    redactor = PrivacyRedactor(
        redact_ips=req.redact_ips,
        redact_users=req.redact_users,
        redact_hosts=req.redact_hosts,
    )
    generator = ReportGenerator(redactor=redactor)

    if req.format.lower() == "html":
        html_content = generator.generate_html_report(
            findings=findings,
            events_by_id=events_map,
            total_events_processed=len(all_events),
            source_name=req.source_name or "Investigation",
            notes_summary=req.notes_summary or "",
        )
        return Response(content=html_content, media_type="text/html")
    else:
        json_report = generator.generate_json_report(
            findings=findings,
            events_by_id=events_map,
            total_events_processed=len(all_events),
            source_name=req.source_name or "Investigation",
            notes_summary=req.notes_summary or "",
        )
        return json_report


@router.delete("/investigations/reset")
def reset_investigation():
    service.storage.clear_all()
    return {"success": True, "message": "Investigation workbench database cleared."}
