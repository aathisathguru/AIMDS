from __future__ import annotations

import unittest

from app.services import notifications


class NotificationTests(unittest.TestCase):
    def setUp(self) -> None:
        notifications._memory_settings.clear()
        notifications._memory_history.clear()
        notifications.update_settings(
            "USR-TEST",
            {
                "mobile_number": "+14155552671",
                "sms_enabled": True,
                "sms_critical": True,
                "sms_warning": True,
                "cooldown_seconds": 900,
            },
        )

    def test_e164_validation(self) -> None:
        self.assertEqual(notifications.validate_mobile_number(" +14155552671 "), "+14155552671")
        with self.assertRaises(ValueError):
            notifications.validate_mobile_number("555-0100")

    def test_missing_gateway_is_not_success(self) -> None:
        status, provider_id, error = notifications._twilio_send("+14155552671", "test")
        self.assertEqual(status, "not_configured")
        self.assertIsNone(provider_id)
        self.assertIn("missing", error or "")

    def test_submitted_delivery_is_deduplicated(self) -> None:
        calls: list[tuple[str, str]] = []

        def sender(to: str, body: str):
            calls.append((to, body))
            return "submitted", "SM123", None

        alert = {
            "id": "ALT-VOLT-HIGH",
            "severity": "critical",
            "blockCode": "SF",
            "floorCode": "1F",
            "metric": "voltage",
            "title": "Mains Overvoltage",
            "value": 255,
            "unit": "V",
        }
        first = notifications.dispatch_alert(alert, sender)
        second = notifications.dispatch_alert(alert, sender)
        self.assertEqual(first[0]["status"], "submitted")
        self.assertEqual(len(second), 0)
        self.assertEqual(len(calls), 1)
        self.assertIn("255 V", calls[0][1])


if __name__ == "__main__":
    unittest.main()
