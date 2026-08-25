from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum
from typing import Any, FrozenSet, Mapping, Optional
from uuid import UUID, uuid4


class MemoryCategory(str, Enum):
    FACT = "fact"
    PREFERENCE = "preference"
    CONSTRAINT = "constraint"
    RELATIONSHIP = "relationship"
    DEVICE = "device"
    TEMPORARY_CONTEXT = "temporary_context"
    EPISODIC = "episodic"
    EXPLICIT_INSTRUCTION = "explicit_instruction"


class MemorySource(str, Enum):
    EXPLICIT_USER_STATEMENT = "explicit_user_statement"
    VERIFIED_PROFILE = "verified_profile"
    DOCUMENT_EXTRACTION = "document_extraction"
    INFERRED_FROM_CONTEXT = "inferred_from_context"
    FAMILY_PROVIDED = "family_provided"
    SYSTEM_GENERATED = "system_generated"


class Sensitivity(str, Enum):
    NORMAL = "NORMAL"
    PRIVATE = "PRIVATE"
    SENSITIVE = "SENSITIVE"
    RESTRICTED = "RESTRICTED"


class MemoryStatus(str, Enum):
    ACTIVE = "active"
    SUPERSEDED = "superseded"
    FORGOTTEN = "forgotten"
    REVOKED = "revoked"
    EXPIRED = "expired"


class Channel(str, Enum):
    WHATSAPP = "whatsapp"
    WEBSITE = "website"
    ANDROID = "android"
    PHONE = "phone"


SOURCE_AUTHORITY: Mapping[MemorySource, float] = {
    MemorySource.VERIFIED_PROFILE: 1.00,
    MemorySource.EXPLICIT_USER_STATEMENT: 0.95,
    MemorySource.DOCUMENT_EXTRACTION: 0.85,
    MemorySource.FAMILY_PROVIDED: 0.65,
    MemorySource.SYSTEM_GENERATED: 0.55,
    MemorySource.INFERRED_FROM_CONTEXT: 0.40,
}

SOURCE_CONFIDENCE_CEILING: Mapping[MemorySource, float] = {
    MemorySource.VERIFIED_PROFILE: 1.00,
    MemorySource.EXPLICIT_USER_STATEMENT: 1.00,
    MemorySource.DOCUMENT_EXTRACTION: 0.90,
    MemorySource.FAMILY_PROVIDED: 0.75,
    MemorySource.SYSTEM_GENERATED: 0.70,
    MemorySource.INFERRED_FROM_CONTEXT: 0.60,
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class AuthorizationContext:
    actor_person_id: UUID
    subject_person_id: UUID
    allowed_categories: FrozenSet[MemoryCategory] = field(default_factory=frozenset)
    allowed_sensitivities: FrozenSet[Sensitivity] = field(
        default_factory=lambda: frozenset({Sensitivity.NORMAL})
    )
    is_subject: bool = False

    def permits(self, record: "MemoryRecord") -> bool:
        if record.person_id != self.subject_person_id:
            return False
        if self.is_subject and self.actor_person_id == self.subject_person_id:
            return True
        return (
            record.category in self.allowed_categories
            and record.sensitivity in self.allowed_sensitivities
        )


@dataclass(frozen=True)
class MemoryRecord:
    person_id: UUID
    category: MemoryCategory
    key: str
    value: Any
    confidence: float
    source: MemorySource
    sensitivity: Sensitivity = Sensitivity.NORMAL
    status: MemoryStatus = MemoryStatus.ACTIVE
    version: int = 1
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=utcnow)
    updated_at: datetime = field(default_factory=utcnow)
    verified_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    superseded_by: Optional[UUID] = None
    correction_of: Optional[UUID] = None
    source_channel: Optional[Channel] = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.key or not self.key.strip():
            raise ValueError("memory key must not be empty")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence must be between 0 and 1")
        ceiling = SOURCE_CONFIDENCE_CEILING[self.source]
        if self.confidence > ceiling:
            raise ValueError(
                f"confidence {self.confidence} exceeds source ceiling {ceiling} for {self.source.value}"
            )
        if self.version < 1:
            raise ValueError("version must be >= 1")
        if self.expires_at is not None and self.expires_at.tzinfo is None:
            raise ValueError("expires_at must be timezone-aware")
        if self.category is MemoryCategory.TEMPORARY_CONTEXT and self.expires_at is None:
            raise ValueError("temporary_context requires expires_at")

    @property
    def authority(self) -> float:
        return SOURCE_AUTHORITY[self.source]

    def mark(self, *, status: MemoryStatus, now: datetime, **changes: Any) -> "MemoryRecord":
        return replace(self, status=status, updated_at=now, **changes)
