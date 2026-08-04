from odoo import fields, models


class CvPosition(models.Model):
    """A position imported from CVForge together with its aggregated results.

    Records are created/refreshed exclusively by the import wizard; the UI is
    a read-only viewer (create/edit are disabled on the views).
    """

    _name = "cv.position"
    _description = "CVForge Position"
    _order = "imported_at desc"

    name = fields.Char(string="Position Title", required=True)
    company = fields.Char(string="Company")
    level = fields.Char(string="Level")
    cv_count = fields.Integer(string="Published CVs")
    api_token = fields.Char(string="API Token", required=True, index=True)
    source_url = fields.Char(string="Source Instance")
    imported_at = fields.Datetime(string="Last Import")
    attribute_ids = fields.One2many("cv.position.attribute", "position_id", string="Attributes")

    _sql_constraints = [
        ("api_token_uniq", "unique(api_token)", "A position with this api token is already imported."),
    ]


class CvPositionAttribute(models.Model):
    """One attribute of an imported position with its aggregated result."""

    _name = "cv.position.attribute"
    _description = "CVForge Position Attribute (aggregated)"
    _order = "id"

    position_id = fields.Many2one("cv.position", required=True, ondelete="cascade")
    name = fields.Char(string="Attribute", required=True)
    attr_type = fields.Char(string="Type", required=True)
    filled_count = fields.Integer(string="Filled Values")
    avg_value = fields.Float(string="Average", digits=(16, 2))
    min_value = fields.Float(string="Min", digits=(16, 2))
    max_value = fields.Float(string="Max", digits=(16, 2))
    popular_values = fields.Text(string="Most Popular Values")
