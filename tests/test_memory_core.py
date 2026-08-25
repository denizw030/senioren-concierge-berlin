from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from memory_core import (
    AuthorizationContext,
    AuthorizationError,
    Channel,
    MemoryCategory,
    MemoryEngine,
    MemoryRecord,
    MemorySource,
    MemoryStatus,
    Sensitivity,
)

NOW = datetime(2026, 8, 26, 0, 0, tzinfo=timezone.utc)


def own_auth(person_id):
    return AuthorizationContext(actor_person_id=person_id, subject_person_id=person_id, is_subject=True)


def rec(person_id, category, key, value, *, confidence=0.95, source=MemorySource.EXPLICIT_USER_STATEMENT, sensitivity=Sensitivity.NORMAL, expires_at=None, channel=Channel.WHATSAPP):
    return MemoryRecord(person_id=person_id, category=category, key=key, value=value, confidence=confidence, source=source, sensitivity=sensitivity, expires_at=expires_at, source_channel=channel)


def test_explicit_preference_store_and_channel_neutral_retrieval():
    person = uuid4(); engine = MemoryEngine()
    stored = engine.upsert(rec(person, MemoryCategory.PREFERENCE, "coffee", "decaf"), now=NOW)
    got = engine.retrieve(person_id=person, authorization=own_auth(person), requested_memory_categories=[MemoryCategory.PREFERENCE], now=NOW)
    assert got == [stored]
    assert got[0].person_id == person and got[0].source_channel is Channel.WHATSAPP


def test_explicit_correction_supersedes_old_memory():
    person = uuid4(); engine = MemoryEngine()
    old = engine.upsert(rec(person, MemoryCategory.RELATIONSHIP, "daughter_name", "Anne"), now=NOW)
    new = engine.correct(old.id, new_value="Anna", now=NOW + timedelta(seconds=1))
    assert engine.get(old.id).status is MemoryStatus.SUPERSEDED
    assert engine.get(old.id).superseded_by == new.id
    assert new.correction_of == old.id and new.version == 2


def test_forget_one_and_category():
    person = uuid4(); engine = MemoryEngine()
    a = engine.upsert(rec(person, MemoryCategory.PREFERENCE, "tea", "earl grey"), now=NOW)
    engine.upsert(rec(person, MemoryCategory.PREFERENCE, "music", "jazz"), now=NOW)
    assert engine.forget_one(a.id, now=NOW).status is MemoryStatus.FORGOTTEN
    assert engine.forget_category(person, MemoryCategory.PREFERENCE, now=NOW) == 1
    assert engine.retrieve(person_id=person, authorization=own_auth(person), requested_memory_categories=[MemoryCategory.PREFERENCE], now=NOW) == []


def test_expiry_and_temporary_context_requires_expiry():
    person = uuid4(); engine = MemoryEngine()
    ctx = rec(person, MemoryCategory.TEMPORARY_CONTEXT, "trip", "airport pickup", expires_at=NOW + timedelta(hours=1))
    stored = engine.upsert(ctx, now=NOW)
    assert engine.retrieve(person_id=person, authorization=own_auth(person), requested_memory_categories=[MemoryCategory.TEMPORARY_CONTEXT], now=NOW) == [stored]
    assert engine.expire(now=NOW + timedelta(hours=2)) == 1
    assert engine.get(stored.id).status is MemoryStatus.EXPIRED
    with pytest.raises(ValueError):
        rec(person, MemoryCategory.TEMPORARY_CONTEXT, "bad", "no expiry")


def test_low_confidence_and_inference_ceiling():
    person = uuid4()
    low = rec(person, MemoryCategory.FACT, "city", "Berlin", confidence=0.4, source=MemorySource.INFERRED_FROM_CONTEXT)
    assert low.confidence == 0.4
    with pytest.raises(ValueError):
        rec(person, MemoryCategory.FACT, "city", "Berlin", confidence=0.9, source=MemorySource.INFERRED_FROM_CONTEXT)


def test_conflicting_inference_cannot_displace_explicit_fact():
    person = uuid4(); engine = MemoryEngine()
    explicit = engine.upsert(rec(person, MemoryCategory.FACT, "city", "Berlin", confidence=1.0), now=NOW)
    inferred = rec(person, MemoryCategory.FACT, "city", "Hamburg", confidence=0.5, source=MemorySource.INFERRED_FROM_CONTEXT)
    result = engine.upsert(inferred, now=NOW + timedelta(seconds=1))
    assert result.id == explicit.id
    assert engine.get(explicit.id).status is MemoryStatus.ACTIVE


def test_family_without_permission_gets_nothing_relationship_is_not_authorization():
    senior = uuid4(); family = uuid4(); engine = MemoryEngine()
    engine.upsert(rec(senior, MemoryCategory.RELATIONSHIP, "daughter", str(family)), now=NOW)
    auth = AuthorizationContext(actor_person_id=family, subject_person_id=senior)
    assert engine.retrieve(person_id=senior, authorization=auth, requested_memory_categories=[MemoryCategory.RELATIONSHIP], now=NOW) == []


def test_family_authorized_scope_only():
    senior = uuid4(); family = uuid4(); engine = MemoryEngine()
    pref = engine.upsert(rec(senior, MemoryCategory.PREFERENCE, "contact", "text"), now=NOW)
    engine.upsert(rec(senior, MemoryCategory.DEVICE, "phone", "Pixel"), now=NOW)
    auth = AuthorizationContext(actor_person_id=family, subject_person_id=senior, allowed_categories=frozenset({MemoryCategory.PREFERENCE}), allowed_sensitivities=frozenset({Sensitivity.NORMAL}))
    got = engine.retrieve(person_id=senior, authorization=auth, requested_memory_categories=[MemoryCategory.PREFERENCE, MemoryCategory.DEVICE], now=NOW)
    assert got == [pref]


def test_wrong_person_id_rejected():
    a = uuid4(); b = uuid4(); engine = MemoryEngine()
    auth = own_auth(a)
    with pytest.raises(AuthorizationError):
        engine.retrieve(person_id=b, authorization=auth, requested_memory_categories=[MemoryCategory.FACT], now=NOW)


def test_nilo_mira_same_fact_basis():
    person = uuid4(); engine = MemoryEngine()
    engine.upsert(rec(person, MemoryCategory.DEVICE, "tv", "Samsung QN90", channel=Channel.ANDROID), now=NOW)
    nilo = engine.retrieve(person_id=person, authorization=own_auth(person), requested_memory_categories=[MemoryCategory.DEVICE], context="persona:nilo", now=NOW)
    mira = engine.retrieve(person_id=person, authorization=own_auth(person), requested_memory_categories=[MemoryCategory.DEVICE], context="persona:mira", now=NOW)
    assert nilo == mira


def test_sensitive_memory_not_opportunistically_retrieved_and_restricted_requires_explicit_category_request():
    person = uuid4(); engine = MemoryEngine()
    engine.upsert(rec(person, MemoryCategory.FACT, "general", "likes concise answers"), now=NOW)
    restricted = engine.upsert(rec(person, MemoryCategory.FACT, "financial_note", "fixture-only", sensitivity=Sensitivity.RESTRICTED), now=NOW)
    auto = engine.retrieve(person_id=person, authorization=own_auth(person), intent="general fact", now=NOW)
    assert restricted not in auto
    explicit = engine.retrieve(person_id=person, authorization=own_auth(person), requested_memory_categories=[MemoryCategory.FACT], now=NOW)
    assert restricted in explicit


def test_retrieval_only_relevant_categories():
    person = uuid4(); engine = MemoryEngine()
    device = engine.upsert(rec(person, MemoryCategory.DEVICE, "tv", "Samsung"), now=NOW)
    engine.upsert(rec(person, MemoryCategory.PREFERENCE, "restaurant", "Italian"), now=NOW)
    got = engine.retrieve(person_id=person, authorization=own_auth(person), intent="Mein Fernseher macht wieder Probleme", now=NOW)
    assert device in got
    assert all(x.category in {MemoryCategory.DEVICE, MemoryCategory.EPISODIC} for x in got)


def test_reminders_are_not_memory_category():
    assert "reminder" not in {c.value for c in MemoryCategory}
