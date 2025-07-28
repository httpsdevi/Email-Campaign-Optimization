from flask import Flask, jsonify, render_template, request
from flask_cors import CORS # Required for handling Cross-Origin Resource Sharing
import pandas as pd
import datetime
import random
import json # To handle JSON serialization/deserialization
import os # Import os module to get environment variables

# Import the core analytical functions from your email_optimizer.py
# Make sure email_optimizer.py is in the same directory or accessible in PYTHONPATH
from email_optimizer import generate_synthetic_data, calculate_kpis, analyze_by_segment, perform_ab_test

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing frontend (index.html) to fetch from different origin if needed

# Global DataFrame to store the generated data.
# In a real application, this would be loaded from a database or external source.
# We'll regenerate it once when the server starts for simplicity.
email_data_df = None

def initialize_data():
    """Generates synthetic data once when the Flask app starts."""
    global email_data_df
    if email_data_df is None:
        print("Initializing synthetic data for the Flask app...")
        email_data_df = generate_synthetic_data(num_records=20000) # Generate more data for better analytics
        print("Synthetic data initialized.")

# Call data initialization when the app starts
with app.app_context():
    initialize_data()

@app.route('/')
def index():
    """
    Serves the main HTML dashboard file.
    """
    return render_template('index.html')

@app.route('/api/data', methods=['GET'])
def get_data():
    """
    API endpoint to fetch filtered email campaign data.
    Supports date range filtering.
    """
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')

    filtered_df = email_data_df.copy()

    if start_date_str:
        start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d')
        filtered_df = filtered_df[filtered_df['timestamp_sent'] >= start_date]
    if end_date_str:
        end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d')
        # Add one day to end_date to include data for the entire end day
        filtered_df = filtered_df[filtered_df['timestamp_sent'] < end_date + datetime.timedelta(days=1)]

    # Convert timestamp_sent to string for JSON serialization
    filtered_df['timestamp_sent'] = filtered_df['timestamp_sent'].dt.strftime('%Y-%m-%d %H:%M:%S')

    # Return the filtered DataFrame as a list of dictionaries (JSON)
    return jsonify(filtered_df.to_dict(orient='records'))

@app.route('/api/kpis', methods=['POST']) # Changed to POST
def get_kpis():
    """
    API endpoint to calculate and return overall KPIs.
    Requires 'data' parameter in request body, which is the filtered data.
    """
    try:
        data_records = request.json.get('data') # Get the data sent from frontend
        if not data_records:
            return jsonify({"error": "No data provided for KPI calculation"}), 400

        df = pd.DataFrame(data_records)
        kpis = calculate_kpis(df)

        # The email_optimizer.py now returns raw numbers, so no need for string parsing here.
        return jsonify(kpis)
    except Exception as e:
        app.logger.error(f"Error calculating KPIs: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/segments', methods=['POST']) # Changed to POST
def get_segments_analysis():
    """
    API endpoint to calculate and return segment-wise KPIs.
    Requires 'data' parameter in request body.
    """
    try:
        data_records = request.json.get('data') # Get the data sent from frontend
        if not data_records:
            return jsonify({"error": "No data provided for segment analysis"}), 400

        df = pd.DataFrame(data_records)
        segment_kpis_df = analyze_by_segment(df)

        # Convert DataFrame to list of dictionaries for JSON serialization
        return jsonify(segment_kpis_df.to_dict(orient='records'))
    except Exception as e:
        app.logger.error(f"Error analyzing segments: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ab_test', methods=['POST']) # Changed to POST
def get_ab_test_results():
    """
    API endpoint to perform and return A/B test results.
    Requires 'data' parameter in request body.
    """
    try:
        data_records = request.json.get('data') # Get the data sent from frontend
        if not data_records:
            return jsonify({"error": "No data provided for A/B test"}), 400

        df = pd.DataFrame(data_records)
        # Assuming we always test 'subject_line_version' for 'converted' for now
        ab_results = perform_ab_test(df, 'subject_line_version', 'converted')

        if ab_results:
            return jsonify(ab_results)
        else:
            return jsonify({"message": "A/B test could not be performed with the provided data."}), 200
    except Exception as e:
        app.logger.error(f"Error performing A/B test: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Use PORT environment variable for deployment platforms like Heroku/Render
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port) # host='0.0.0.0' makes it accessible externally
