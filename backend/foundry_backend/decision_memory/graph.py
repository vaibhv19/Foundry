from collections import deque
from .models import DecisionDependency

class DependencyGraphTraverser:
    @staticmethod
    def get_downstream_impact(blueprint_id: str, changed_key: str) -> list:
        dependencies = DecisionDependency.objects.filter(blueprint_id=blueprint_id)

        adj = {}
        for dep in dependencies:
            p = dep.parent_key
            c = dep.child_key
            if p not in adj:
                adj[p] = []
            adj[p].append(c)

        visited = set()
        visited_all = set()
        queue = deque([changed_key])

        while queue:
            curr = queue.popleft()
            if curr not in visited_all:
                visited_all.add(curr)
                if curr != changed_key:
                    visited.add(curr)
                if curr in adj:
                    for child in adj[curr]:
                        if child not in visited_all:
                            queue.append(child)

        return list(visited)
