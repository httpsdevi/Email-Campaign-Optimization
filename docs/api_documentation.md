# Email Campaign Optimizer - API Documentation

This document provides details on the API endpoints available in the Flask backend.

## Base URL

`http://127.0.0.1:5000`

---

## 1. File Upload and Model Training

- **Endpoint:** `/upload`
- **Method:** `POST`
- **Description:** Uploads a campaign data file (CSV or Excel), processes the data, and trains the machine learning model.
- **Request Body:** `multipart/form-data`
  - `file`: The campaign data file.
- **Success Response (200):**
  ```json
  {
    "message": "File processed and model trained successfully!",
    "data_summary": { "...": "..." },
    "model_accuracy": "0.85"
  }

Error Response (400, 500):

{
  "error": "Descriptive error message."
}

2. Predict Campaign Performance
Endpoint: /predict

Method: POST

Description: Predicts the open rate for a campaign based on input features. Requires a model to be trained first.

Request Body: application/json

{
  "subject_length": 50,
  "send_hour": 10
}

Success Response (200):

{
  "predicted_open_rate": "27.50"
}

Error Response (400):

{
  "error": "Model has not been trained yet. Please upload data."
}

3. Generate Matplotlib Chart
Endpoint: /plot

Method: POST

Description: Generates a Matplotlib visualization based on the loaded data.

Request Body: application/json

{
  "chart_type": "performance"
}

Possible chart_type values: performance, correlation, distribution, heatmap.

Success Response (200):

{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
}

Error Response (400):

{
  "error": "Could not generate chart. Is data loaded?"
}

4. Run Statistical A/B Test
Endpoint: /abtest

Method: POST

Description: Performs a Chi-squared statistical test to compare two variants.

Request Body: application/json

{
  "variant_a": 24.5,
  "variant_b": 26.8,
  "sample_size": 1000
}

Success Response (200):

{
  "p_value": "0.0455",
  "significant": true,
  "winner": "B",
  "confidence": "95.45%"
}
