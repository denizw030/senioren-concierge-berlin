from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional, Sequence
from uuid import UUID

from .models import (
    AuthorizationContext,
    MemoryCategory,
    MemoryRecord,
    MemorySource,
    MemoryStatus,
    Sensitivity,
)


class AuthorizationError(PermissionError):
    pass


class MemoryNotFound(KeyError):
    pass


class MemoryEngine:
    """Pure in-memory reference implementation; no DB/network side effects."""

    def __init__(self) -> None:
        self._records: Dict[UUID, MemoryRecord] = {}

    @staticmethod
    def _now(now: Optional[datetime]) -> datetime:
        value = now or datetime.now(timezone.utc)
        if value.tzinfo is None:
            raise ValueError("now must be timezone-aware")
        return value

    def all_records(self) -> List[MemoryRecord]:
        return list(self._records.values())

    def get(self, memory_id: UUID) -> MemoryRecord:
        try:
            return self._records[memory_id]
        except KeyError as exc:
            raise MemoryNotFound(str(memory_id)) from exc

    def _active_same_key(self, person_id: UUID, category: MemoryCategory, key: str) -> Optional[MemoryRecord]:
        candidates = [
            r for r in self._records.values()
            if r.person_id == person_id
            and r.category == category
            and r.key == key
            and r.status is MemoryStatus.ACTIVE
        ]
        if not candidates:
            return None
        return max(candidates, key=lambda r: (r.version, r.updated_at))

    def upsert(self, incoming: MemoryRecord, *, now: Optional[datetime] = None) -> MemoryRecord:
        ts = self._now(now)
        current = self._active_same_key(incoming.person_id, incoming.category, incoming.key)
        incoming = replace(incoming, updated_at=ts)
        if current is None:
            self._records[incoming.id] = incoming
            return incoming

        if current.value == incoming.value:
            merged = replace(
                current,
                confidence=max(current.confidence, incoming.confidence),
                source=incoming.source if incoming.authority > current.authority else current.source,
                verified_at=incoming.verified_at or current.verified_at,
                expires_at=incoming.expires_at or current.expires_at,
                updated_at=ts,
            )
            self._records[current.id] = merged
            return merged

        if incoming.authority < current.authority and incoming.correction_of != current.id:
            return current
        if incoming.authority == current.authority and incoming.confidence < current.confidence and incoming.correction_of != current.id:
            return current

        replacement = replace(
            incoming,
            version=current.version + 1,
            correction_of=incoming.correction_of or current.id,
            updated_at=ts,
        )
        old = current.mark(status=MemoryStatus.SUPERSEDED, now=ts, superseded_by=replacement.id)
        self._records[old.id] = old
        self._records[replacement.id] = replacement
        return replacement

    def correct(self, memory_id: UUID, *, new_value: object, source: MemorySource = MemorySource.EXPLICIT_USER_STATEMENT, confidence: float = 1.0, now: Optional[datetime] = None) -> MemoryRecord:
        current = self.get(memory_id)
        if current.status is not MemoryStatus.ACTIVE:
            raise ValueError("only active memory can be corrected")
        replacement = MemoryRecord(
            person_id=current.person_id,
            category=current.category,
            key=current.key,
            value=new_value,
            confidence=confidence,
            source=source,
            sensitivity=current.sensitivity,
            expires_at=current.expires_at,
            correction_of=current.id,
            source_channel=current.source_channel,
            metadata=current.metadata,
        )
        return self.upsert(replacement, now=now)

    def forget_one(self, memory_id: UUID, *, now: Optional[datetime] = None) -> MemoryRecord:
        ts = self._now(now)
        record = self.get(memory_id)
        changed = record.mark(status=MemoryStatus.FORGOTTEN, now=ts)
        self._records[memory_id] = changed
        return changed

    def revoke_one(self, memory_id: UUID, *, now: Optional[datetime] = None) -> MemoryRecord:
        ts = self._now(now)
        record = self.get(memory_id)
        changed = record.mark(status=MemoryStatus.REVOKED, now=ts)
        self._records[memory_id] = changed
        return changed

    def forget_category(self, person_id: UUID, category: MemoryCategory, *, now: Optional[datetime] = None) -> int:
        ts = self._now(now)
        count = 0
        for record in list(self._records.values()):
            if record.person_id == person_id and record.category == category and record.status is MemoryStatus.ACTIVE:
                self._records[record.id] = record.mark(status=MemoryStatus.FORGOTTEN, now=ts)
                count += 1
        return count

    def expire(self, *, now: Optional[datetime] = None) -> int:
        ts = self._now(now)
        count = 0
        for record in list(self._records.values()):
            if record.status is MemoryStatus.ACTIVE and record.expires_at is not None and record.expires_at <= ts:
                self._records[record.id] = record.mark(status=MemoryStatus.EXPIRED, now=ts)
                count += 1
        return count

    @staticmethod
    def _intent_categories(intent: str) -> Sequence[MemoryCategory]:
        text = (intent or "").lower()
        mapping = {
            MemoryCategory.DEVICE: ("gerät", "device", "fernseher", "tv", "handy", "router"),
            MemoryCategory.PREFERENCE: ("mag", "bevorzug", "präferenz", "preference", "restaurant"),
            MemoryCategory.RELATIONSHIP: ("tochter", "sohn", "famil", "relationship"),
            MemoryCategory.TEMPORARY_CONTEXT: ("offen", "status", "weiter", "context", "vorgang"),
            MemoryCategory.EPISODIC: ("wieder", "damals", "gelöst", "lösung", "episode"),
            MemoryCategory.CONSTRAINT: ("nicht", "darf", "constraint", "einschränkung"),
            MemoryCategory.EXPLICIT_INSTRUCTION: ("merk", "immer", "instruction", "anweisung"),
        }
        found = [cat for cat, words in mapping.items() if any(word in text for word in words)]
        return found or (MemoryCategory.FACT, MemoryCategory.PREFERENCE, MemoryCategory.CONSTRAINT)

    def retrieve(self, *, person_id: UUID, authorization: AuthorizationContext, intent: str = "", context: str = "", requested_memory_categories: Optional[Iterable[MemoryCategory]] = None, max_results: int = 8, now: Optional[datetime] = None) -> List[MemoryRecord]:
        ts = self._now(now)
        if authorization.subject_person_id != person_id:
            raise AuthorizationError("authorization subject does not match requested person_id")
        self.expire(now=ts)
        requested = set(requested_memory_categories or self._intent_categories(f"{intent} {context}"))
        candidates = [
            r for r in self._records.values()
            if r.person_id == person_id
            and r.status is MemoryStatus.ACTIVE
            and r.category in requested
            and authorization.permits(r)
        ]
        if requested_memory_categories is None:
            candidates = [r for r in candidates if r.sensitivity is not Sensitivity.RESTRICTED]
        candidates.sort(key=lambda r: (r.confidence, r.authority, r.updated_at), reverse=True)
        return candidates[:max_results]
