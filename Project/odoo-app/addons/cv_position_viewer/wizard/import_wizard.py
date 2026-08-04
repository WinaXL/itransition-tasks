import requests

from odoo import fields, models
from odoo.exceptions import UserError


class CvPositionImport(models.TransientModel):
    """Imports (or refreshes) one position from CVForge by its api token."""

    _name = "cv.position.import"
    _description = "Import position from CVForge"

    base_url = fields.Char(
        string="CVForge URL",
        required=True,
        default="https://cv-management-tdgj.onrender.com",
        help="Base URL of the CVForge instance.",
    )
    api_token = fields.Char(
        string="API Token",
        required=True,
        help="Generated on the position form in CVForge (recruiters/admins only). "
        "The token grants read-only access to that single position.",
    )

    def action_import(self):
        self.ensure_one()
        base = (self.base_url or "").rstrip("/")
        try:
            response = requests.get(
                f"{base}/api/external/position",
                params={"token": (self.api_token or "").strip()},
                timeout=30,
            )
        except requests.RequestException as exc:
            raise UserError(f"Could not reach CVForge: {exc}") from exc
        if response.status_code == 401:
            raise UserError("CVForge rejected the api token. Generate a fresh one on the position form.")
        if response.status_code != 200:
            raise UserError(f"CVForge returned HTTP {response.status_code}: {response.text[:300]}")

        data = response.json()
        position_data = data["position"]

        lines = []
        for attr in data.get("attributes", []):
            popular = ", ".join(f'{p["value"]} ({p["count"]}×)' for p in attr.get("popular") or [])
            lines.append(
                (
                    0,
                    0,
                    {
                        "name": attr["name"],
                        "attr_type": attr["type"],
                        "filled_count": attr.get("count") or 0,
                        "avg_value": attr.get("average") or 0.0,
                        "min_value": attr.get("min") or 0.0,
                        "max_value": attr.get("max") or 0.0,
                        "popular_values": popular,
                    },
                )
            )

        values = {
            "name": position_data["title"],
            "company": position_data.get("company") or "",
            "level": position_data.get("level") or "",
            "cv_count": position_data.get("cvCount") or 0,
            "api_token": (self.api_token or "").strip(),
            "source_url": base,
            "imported_at": fields.Datetime.now(),
            # Replace all aggregate lines on re-import.
            "attribute_ids": [(5, 0, 0)] + lines,
        }

        position = self.env["cv.position"].search([("api_token", "=", values["api_token"])], limit=1)
        if position:
            position.write(values)
        else:
            position = self.env["cv.position"].create(values)

        return {
            "type": "ir.actions.act_window",
            "res_model": "cv.position",
            "res_id": position.id,
            "view_mode": "form",
            "target": "current",
        }
