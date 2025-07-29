import unittest
import json
from app import app, optimizer
import pandas as pd
import io

class AppTestCase(unittest.TestCase):
    """Test case for the Flask application."""

    def setUp(self):
        """Set up a test client for the app."""
        self.app = app.test_client()
        self.app.testing = True

    def test_home_route(self):
        """Test if the home page loads correctly."""
        result = self.app.get('/')
        self.assertEqual(result.status_code, 200)
        self.assertIn(b'Email Campaign Optimizer', result.data)

    def test_ab_test_endpoint(self):
        """Test the A/B test endpoint with sample data."""
        payload = {
            "variant_a": 10.0,
            "variant_b": 12.0,
            "sample_size": 1000
        }
        result = self.app.post('/abtest',
                               data=json.dumps(payload),
                               content_type='application/json')
        self.assertEqual(result.status_code, 200)
        data = json.loads(result.data)
        self.assertIn('p_value', data)
        self.assertIn('significant', data)
        self.assertEqual(data['winner'], 'B')

    def test_upload_and_predict(self):
        """Test file upload, model training, and prediction."""
        # Create a dummy CSV file in memory
        csv_data = (
            "subject_line,send_time,list_size,open_rate,click_rate\n"
            "Sale Now!,2023-01-01 10:00:00,1000,25,2\n"
            "Hello World,2023-01-01 14:00:00,2000,30,3\n"
        )
        data = {'file': (io.BytesIO(csv_data.encode('utf-8')), 'test.csv')}

        # 1. Test upload
        upload_result = self.app.post('/upload', data=data, content_type='multipart/form-data')
        self.assertEqual(upload_result.status_code, 200)
        upload_data = json.loads(upload_result.data)
        self.assertIn('model_accuracy', upload_data)
        self.assertTrue(optimizer.is_trained)

        # 2. Test predict endpoint after training
        predict_payload = {"subject_length": 20, "send_hour": 12}
        predict_result = self.app.post('/predict',
                                       data=json.dumps(predict_payload),
                                       content_type='application/json')
        self.assertEqual(predict_result.status_code, 200)
        predict_data = json.loads(predict_result.data)
        self.assertIn('predicted_open_rate', predict_data)

if __name__ == '__main__':
    unittest.main()
