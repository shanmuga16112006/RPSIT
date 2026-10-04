import unittest

from frontend.app import app
from frontend.mapping import build_dataset


class FrontendTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_home_contains_hidden_generated_timetable_target(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'id="timetable"', response.data)
        self.assertIn(b'id="result-card" hidden', response.data)
        self.assertIn(b'id="result-report"', response.data)

    def test_timetable_one_maps_first_backend_alternative(self):
        response = self.client.get("/api/timetables/1")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["alternative"], 1)
        self.assertEqual(payload["source"], "backend/generated/timetables.json")
        self.assertEqual(len(payload["timetables"]), 1)
        timetable = payload["timetables"][0]
        self.assertEqual(timetable["class_id"], "AI_DS_II_I")
        self.assertEqual(len(timetable["days"]), 6)
        self.assertTrue(all(len(day["periods"]) == 8 for day in timetable["days"]))

    def test_maps_manual_library_slots_without_extracurricular_rules(self):
        dataset = build_dataset({"subjects": [{
            "kind": "library", "code": "LIB", "name": "Library", "teacher": "Librarian",
            "weekly_periods": 3, "lab_periods": 0,
            "manual_slots": [{"day": "MON", "period": 7}, {"day": "TUE", "period": 5}, {"day": "WED", "period": 3}],
        }]})
        allotments = dataset["classes"][0]["external_allotments"]
        self.assertEqual([item["type"] for item in allotments], ["LIBRARY"] * 3)
        self.assertTrue(all(item["manual"] for item in allotments))
        self.assertEqual(dataset["classes"][0]["subjects"], [])


if __name__ == "__main__":
    unittest.main()
