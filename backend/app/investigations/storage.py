import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from ..models.events import NormalizedEvent
from ..models.findings import AnalystNote, Finding, FindingStatusEnum, SeverityEnum


class SQLiteStorage:
    """Lightweight local SQLite persistence for TraceForge investigations."""

    def __init__(self, db_path: Optional[str] = None):
        if not db_path:
            db_dir = Path("./data")
            db_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = str(db_dir / "traceforge.db")
        else:
            self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL")
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    event_id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    source_type TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    source_ip TEXT,
                    username TEXT,
                    hostname TEXT,
                    outcome TEXT NOT NULL,
                    message TEXT NOT NULL,
                    raw_event_reference TEXT NOT NULL,
                    attributes_json TEXT NOT NULL
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_ts ON events(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_ip ON events(source_ip)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_events_user ON events(username)")

            conn.execute("""
                CREATE TABLE IF NOT EXISTS findings (
                    finding_id TEXT PRIMARY KEY,
                    rule_id TEXT NOT NULL,
                    rule_name TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    confidence TEXT NOT NULL,
                    first_seen TEXT NOT NULL,
                    last_seen TEXT NOT NULL,
                    source_ip TEXT,
                    username TEXT,
                    hostname TEXT,
                    match_count INTEGER NOT NULL,
                    evidence_event_ids_json TEXT NOT NULL,
                    explanation TEXT NOT NULL,
                    trigger_reason TEXT NOT NULL,
                    threshold_details_json TEXT NOT NULL,
                    defensive_steps_json TEXT NOT NULL,
                    known_limitations_json TEXT NOT NULL,
                    mitre_attack_json TEXT,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS analyst_notes (
                    note_id TEXT PRIMARY KEY,
                    finding_id TEXT NOT NULL,
                    author TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    content TEXT NOT NULL,
                    FOREIGN KEY(finding_id) REFERENCES findings(finding_id) ON DELETE CASCADE
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_notes_fnd ON analyst_notes(finding_id)")

    def save_events(self, events: List[NormalizedEvent]):
        with self._get_conn() as conn:
            for ev in events:
                conn.execute("""
                    INSERT OR REPLACE INTO events (
                        event_id, timestamp, source_type, event_type, source_ip,
                        username, hostname, outcome, message, raw_event_reference, attributes_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    ev.event_id,
                    ev.timestamp.isoformat(),
                    ev.source_type.value,
                    ev.event_type.value,
                    ev.source_ip,
                    ev.username,
                    ev.hostname,
                    ev.outcome.value,
                    ev.message,
                    ev.raw_event_reference,
                    json.dumps(ev.attributes),
                ))

    def save_findings(self, findings: List[Finding]):
        with self._get_conn() as conn:
            for f in findings:
                cur = conn.execute("SELECT status FROM findings WHERE finding_id = ?", (f.finding_id,))
                row = cur.fetchone()
                status_to_use = row["status"] if row else f.status.value

                conn.execute("""
                    INSERT OR REPLACE INTO findings (
                        finding_id, rule_id, rule_name, severity, confidence,
                        first_seen, last_seen, source_ip, username, hostname,
                        match_count, evidence_event_ids_json, explanation, trigger_reason,
                        threshold_details_json, defensive_steps_json, known_limitations_json,
                        mitre_attack_json, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f.finding_id,
                    f.rule_id,
                    f.rule_name,
                    f.severity.value,
                    f.confidence.value,
                    f.first_seen.isoformat(),
                    f.last_seen.isoformat(),
                    f.source_ip,
                    f.username,
                    f.hostname,
                    f.match_count,
                    json.dumps(f.evidence_event_ids),
                    f.explanation,
                    f.trigger_reason,
                    json.dumps(f.threshold_details),
                    json.dumps(f.defensive_steps),
                    json.dumps(f.known_limitations),
                    json.dumps(f.mitre_attack.model_dump()) if f.mitre_attack else None,
                    status_to_use,
                    f.created_at.isoformat(),
                ))

    def get_all_events(
        self,
        search: Optional[str] = None,
        event_type: Optional[str] = None,
        outcome: Optional[str] = None,
        source_ip: Optional[str] = None,
        username: Optional[str] = None,
        limit: int = 1000,
        offset: int = 0,
    ) -> List[NormalizedEvent]:
        query = "SELECT * FROM events WHERE 1=1"
        params: List[Any] = []

        if search:
            query += " AND (message LIKE ? OR raw_event_reference LIKE ? OR username LIKE ? OR source_ip LIKE ?)"
            s_param = f"%{search}%"
            params.extend([s_param, s_param, s_param, s_param])
        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)
        if outcome:
            query += " AND outcome = ?"
            params.append(outcome)
        if source_ip:
            query += " AND source_ip = ?"
            params.append(source_ip)
        if username:
            query += " AND username = ?"
            params.append(username)

        query += " ORDER BY timestamp ASC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            return [self._row_to_event(r) for r in rows]

    def count_events(self) -> int:
        with self._get_conn() as conn:
            return conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]

    def get_events_by_ids(self, event_ids: List[str]) -> List[NormalizedEvent]:
        if not event_ids:
            return []
        placeholders = ",".join("?" for _ in event_ids)
        query = f"SELECT * FROM events WHERE event_id IN ({placeholders}) ORDER BY timestamp ASC"
        with self._get_conn() as conn:
            rows = conn.execute(query, event_ids).fetchall()
            return [self._row_to_event(r) for r in rows]

    def get_all_findings(
        self,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        rule_id: Optional[str] = None,
    ) -> List[Finding]:
        query = "SELECT * FROM findings WHERE 1=1"
        params: List[Any] = []

        if severity:
            query += " AND severity = ?"
            params.append(severity)
        if status:
            query += " AND status = ?"
            params.append(status)
        if rule_id:
            query += " AND rule_id = ?"
            params.append(rule_id)

        query += " ORDER BY first_seen ASC"

        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            findings: List[Finding] = []
            for r in rows:
                notes = self._get_notes_for_finding(conn, r["finding_id"])
                findings.append(self._row_to_finding(r, notes))
            return findings

    def get_finding_by_id(self, finding_id: str) -> Optional[Finding]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM findings WHERE finding_id = ?", (finding_id,)).fetchone()
            if not row:
                return None
            notes = self._get_notes_for_finding(conn, finding_id)
            return self._row_to_finding(row, notes)

    def update_finding_status(self, finding_id: str, new_status: str) -> bool:
        with self._get_conn() as conn:
            cur = conn.execute(
                "UPDATE findings SET status = ? WHERE finding_id = ?",
                (new_status, finding_id)
            )
            return cur.rowcount > 0

    def add_note(self, note: AnalystNote, finding_id: str):
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO analyst_notes (note_id, finding_id, author, timestamp, content)
                VALUES (?, ?, ?, ?, ?)
            """, (
                note.note_id,
                finding_id,
                note.author,
                note.timestamp.isoformat(),
                note.content,
            ))

    def clear_all(self):
        with self._get_conn() as conn:
            conn.execute("DELETE FROM analyst_notes")
            conn.execute("DELETE FROM findings")
            conn.execute("DELETE FROM events")

    def _get_notes_for_finding(self, conn: sqlite3.Connection, finding_id: str) -> List[AnalystNote]:
        rows = conn.execute(
            "SELECT * FROM analyst_notes WHERE finding_id = ? ORDER BY timestamp ASC",
            (finding_id,)
        ).fetchall()
        return [
            AnalystNote(
                note_id=r["note_id"],
                author=r["author"],
                timestamp=datetime.fromisoformat(r["timestamp"]),
                content=r["content"],
            )
            for r in rows
        ]

    def _row_to_event(self, r: sqlite3.Row) -> NormalizedEvent:
        return NormalizedEvent(
            event_id=r["event_id"],
            timestamp=datetime.fromisoformat(r["timestamp"]),
            source_type=r["source_type"],
            event_type=r["event_type"],
            source_ip=r["source_ip"],
            username=r["username"],
            hostname=r["hostname"],
            outcome=r["outcome"],
            message=r["message"],
            raw_event_reference=r["raw_event_reference"],
            attributes=json.loads(r["attributes_json"]),
        )

    def _row_to_finding(self, r: sqlite3.Row, notes: List[AnalystNote]) -> Finding:
        mitre_data = json.loads(r["mitre_attack_json"]) if r["mitre_attack_json"] else None
        return Finding(
            finding_id=r["finding_id"],
            rule_id=r["rule_id"],
            rule_name=r["rule_name"],
            severity=r["severity"],
            confidence=r["confidence"],
            first_seen=datetime.fromisoformat(r["first_seen"]),
            last_seen=datetime.fromisoformat(r["last_seen"]),
            source_ip=r["source_ip"],
            username=r["username"],
            hostname=r["hostname"],
            match_count=r["match_count"],
            evidence_event_ids=json.loads(r["evidence_event_ids_json"]),
            explanation=r["explanation"],
            trigger_reason=r["trigger_reason"],
            threshold_details=json.loads(r["threshold_details_json"]),
            defensive_steps=json.loads(r["defensive_steps_json"]),
            known_limitations=json.loads(r["known_limitations_json"]),
            mitre_attack=mitre_data,
            status=r["status"],
            notes=notes,
            created_at=datetime.fromisoformat(r["created_at"]),
        )
