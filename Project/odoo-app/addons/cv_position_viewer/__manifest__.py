{
    "name": "CVForge Position Viewer",
    "summary": "Read-only viewer for positions and aggregated CV results imported from CVForge",
    "description": """
Imports positions with their attribute set and aggregated results
(average/min/max for numeric attributes, most popular values for text)
from a CVForge instance via its external REST API. Access is granted
by a per-position api token generated on the position form.
    """,
    "version": "17.0.1.0.0",
    "category": "Human Resources",
    "author": "CVForge",
    "license": "LGPL-3",
    "depends": ["base"],
    "external_dependencies": {"python": ["requests"]},
    "data": [
        "security/ir.model.access.csv",
        "views/position_views.xml",
        "views/import_wizard_views.xml",
        "views/menu.xml",
    ],
    "application": True,
    "installable": True,
}
