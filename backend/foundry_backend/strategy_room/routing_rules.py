from blueprints.models import SectionCategory

class AgentRouter:
    @staticmethod
    def get_execution_nodes(section_category: str) -> list:
        if section_category == SectionCategory.TECH_STACK:
            return ["Tech_Lead", "Consistency_Check"]
        elif section_category == SectionCategory.PRODUCT:
            return ["Product_Manager", "Tech_Lead", "Consistency_Check"]
        elif section_category in (SectionCategory.MARKET, SectionCategory.BUSINESS):
            return ["Investor", "Product_Manager", "Tech_Lead", "Consistency_Check"]
        else:
            return ["Investor", "Product_Manager", "Tech_Lead", "Consistency_Check"]
