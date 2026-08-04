class ConflictDetector:
    @staticmethod
    def detect_conflicts(proposed_list: list, active_list: list) -> list:
        active_map = {}
        for active in active_list:
            if hasattr(active, 'decision_key'):
                key = getattr(active, 'decision_key')
                val = getattr(active, 'choice_value')
                # Fallback to 'priority' field, or check if priority is set.
                # In Django models, we can add a priority field if needed, or default it to P1.
                # Let's check: the DecisionLog model doesn't explicitly have priority, but we can store it or add it!
                # Wait, let's look at Task 6.4 description:
                # "Extract the priority of the conflicting active decision (e.g. P0 conflicts block auto-generation, requiring client override)."
                # In the DB Schema spec (3.6 decision_log), priority is not explicitly listed, but the task description says "Extract the priority of the conflicting active decision".
                # To support this, let's check: can we add a priority column to DecisionLog?
                # Actually, yes, let's check: DecisionLog has priority in Pydantic schema, so it would make a lot of sense to have it in the database too!
                # Let's add 'priority' CharField to DecisionLog, or default it if missing. Let's make sure it's supported!
                prio = getattr(active, 'priority', 'P1')
            elif isinstance(active, dict):
                key = active.get('decision_key')
                val = active.get('choice_value')
                prio = active.get('priority', 'P1')
            else:
                continue
            active_map[key] = (val, prio)

        conflicts = []
        for proposed in proposed_list:
            if hasattr(proposed, 'decision_key'):
                key = getattr(proposed, 'decision_key')
                val = getattr(proposed, 'choice_value')
            elif isinstance(proposed, dict):
                key = proposed.get('decision_key')
                val = proposed.get('choice_value')
            else:
                continue

            if key in active_map:
                stored_val, stored_prio = active_map[key]
                if str(val).strip().lower() != str(stored_val).strip().lower():
                    conflicts.append({
                        "key": key,
                        "stored_value": stored_val,
                        "proposed_value": val,
                        "priority": stored_prio,
                        "details": f"Conflict detected on key '{key}': Proposed value '{val}' deviates from active value '{stored_val}' ({stored_prio})."
                    })
        return conflicts
