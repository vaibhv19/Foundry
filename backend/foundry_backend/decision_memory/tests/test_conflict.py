from foundry_backend.decision_memory.conflict import ConflictDetector

def test_conflict_detector_no_conflict():
    proposed = [{"decision_key": "database", "choice_value": "PostgreSQL"}]
    active = [{"decision_key": "database", "choice_value": "PostgreSQL", "priority": "P0"}]

    conflicts = ConflictDetector.detect_conflicts(proposed, active)
    assert len(conflicts) == 0

def test_conflict_detector_with_conflict():
    proposed = [{"decision_key": "database", "choice_value": "MySQL"}]
    active = [{"decision_key": "database", "choice_value": "PostgreSQL", "priority": "P0"}]

    conflicts = ConflictDetector.detect_conflicts(proposed, active)
    assert len(conflicts) == 1
    assert conflicts[0]["key"] == "database"
    assert conflicts[0]["stored_value"] == "PostgreSQL"
    assert conflicts[0]["proposed_value"] == "MySQL"
    assert conflicts[0]["priority"] == "P0"
