import os
import io
import base64
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from flask import Flask, request, jsonify, render_template
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score

# --- Flask App Initialization ---
app = Flask(__name__, static_folder='static', template_folder='.')

# --- Machine Learning & Data Processing Class ---
class EmailCampaignOptimizer:
    """
    A class to handle all data processing, ML modeling, and analysis.
    """
    def __init__(self):
        """Initializes the optimizer with a model and initial state."""
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.data = None
        self.is_trained = False
        self.model_accuracy = 0
        self.features = ['subject_length', 'send_hour', 'send_day', 'list_size']

    def load_and_preprocess_data(self, file_stream):
        """
        Loads data from a file stream (CSV or Excel) and preprocesses it.
        Args:
            file_stream: The file stream from the uploaded file.
        Returns:
            A dictionary with basic stats of the loaded data.
        """
        try:
            # Determine file type and load data using Pandas
            if file_stream.filename.endswith('.csv'):
                self.data = pd.read_csv(file_stream)
            else:
                self.data = pd.read_excel(file_stream)

            # --- Data Preprocessing ---
            # Basic cleaning: fill missing numerical values with the mean
            for col in self.data.select_dtypes(include=np.number).columns:
                self.data[col].fillna(self.data[col].mean(), inplace=True)

            # Feature Engineering: Create features needed for the model
            if 'subject_line' in self.data.columns:
                 self.data['subject_length'] = self.data['subject_line'].str.len()
            else: # Fallback if column is missing
                self.data['subject_length'] = np.random.randint(10, 100, self.data.shape[0])


            if 'send_time' in self.data.columns:
                # Convert to datetime, coercing errors
                send_time_dt = pd.to_datetime(self.data['send_time'], errors='coerce')
                self.data['send_hour'] = send_time_dt.dt.hour
                self.data['send_day'] = send_time_dt.dt.dayofweek
            else: # Fallback if column is missing
                self.data['send_hour'] = np.random.randint(0, 24, self.data.shape[0])
                self.data['send_day'] = np.random.randint(0, 7, self.data.shape[0])

            # Fill any NaNs that might have resulted from coercion
            self.data.fillna(0, inplace=True)

            return self.data.describe().to_dict()

        except Exception as e:
            print(f"Error loading data: {e}")
            return None

    def train_model(self):
        """
        Trains the Scikit-Learn model on the loaded data.
        Returns:
            The model's R-squared accuracy score.
        """
        if self.data is None:
            return "No data available for training."

        # Define features (X) and target (y)
        X = self.data[self.features]
        y = self.data['open_rate']

        # Split data into training and testing sets
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Fit the model
        self.model.fit(X_train, y_train)
        
        # Evaluate the model
        predictions = self.model.predict(X_test)
        self.model_accuracy = r2_score(y_test, predictions)
        
        self.is_trained = True
        return self.model_accuracy

    def predict_performance(self, subject_length, send_hour):
        """
        Predicts email open rate based on input features.
        Args:
            subject_length (int): The length of the email subject.
            send_hour (int): The hour the email is sent (0-23).
        Returns:
            A dictionary containing the predicted open rate.
        """
        if not self.is_trained:
            return {"error": "Model has not been trained yet. Please upload data."}
        
        # Create a sample DataFrame for prediction
        # Assuming an average send_day and list_size for the prediction
        avg_day = int(self.data['send_day'].mean())
        avg_list_size = int(self.data['list_size'].mean())
        
        input_data = pd.DataFrame([[subject_length, send_hour, avg_day, avg_list_size]], columns=self.features)
        
        # Make prediction
        prediction = self.model.predict(input_data)
        return {"predicted_open_rate": f"{prediction[0]:.2f}"}

    def generate_matplotlib_chart(self, chart_type):
        """
        Generates a Matplotlib chart and returns it as a base64 encoded string.
        Args:
            chart_type (str): The type of chart to generate.
        Returns:
            A base64 encoded string of the chart image.
        """
        if self.data is None:
            return None
        
        plt.style.use('seaborn-v0_8-whitegrid')
        fig, ax = plt.subplots(figsize=(10, 5))

        if chart_type == 'performance':
            self.data.groupby('send_hour')['open_rate'].mean().plot(kind='bar', ax=ax, color='#667eea')
            ax.set_title('Average Open Rate by Send Hour', fontsize=16)
            ax.set_xlabel('Hour of Day (24h)', fontsize=12)
            ax.set_ylabel('Average Open Rate (%)', fontsize=12)
        
        elif chart_type == 'correlation':
            corr_features = self.features + ['open_rate', 'click_rate']
            valid_features = [f for f in corr_features if f in self.data.columns]
            correlation_matrix = self.data[valid_features].corr()
            sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', ax=ax, fmt=".2f")
            ax.set_title('Feature Correlation Matrix', fontsize=16)

        elif chart_type == 'distribution':
            sns.histplot(self.data['open_rate'], kde=True, ax=ax, color='#764ba2')
            ax.set_title('Distribution of Email Open Rates', fontsize=16)
            ax.set_xlabel('Open Rate (%)', fontsize=12)
            ax.set_ylabel('Frequency', fontsize=12)

        elif chart_type == 'heatmap':
            pivot = self.data.pivot_table(values='open_rate', index='send_hour', columns='send_day')
            sns.heatmap(pivot, annot=True, cmap='viridis', ax=ax, fmt=".1f")
            ax.set_title('Open Rate by Day of Week and Hour', fontsize=16)
            ax.set_xlabel('Day of Week (0=Mon)', fontsize=12)
            ax.set_ylabel('Hour of Day', fontsize=12)

        plt.tight_layout()
        
        # Save plot to a memory buffer
        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        buf.seek(0)
        
        # Encode buffer to base64 and return
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        buf.close()
        return f"data:image/png;base64,{image_base64}"

    def run_ab_test(self, rate_a, rate_b, size):
        """
        Performs a Chi-squared test for A/B testing.
        Args:
            rate_a (float): Conversion rate for variant A.
            rate_b (float): Conversion rate for variant B.
            size (int): Sample size for each variant.
        Returns:
            A dictionary with statistical results.
        """
        conv_a = int(rate_a / 100 * size)
        conv_b = int(rate_b / 100 * size)
        
        # Create contingency table
        table = [
            [conv_a, size - conv_a],
            [conv_b, size - conv_b]
        ]
        
        chi2, p_value, _, _ = stats.chi2_contingency(table)
        
        significant = p_value < 0.05
        winner = 'B' if rate_b > rate_a else 'A'
        
        return {
            "p_value": f"{p_value:.4f}",
            "significant": bool(significant),
            "winner": winner,
            "confidence": f"{(1 - p_value) * 100:.2f}%"
        }

# Instantiate the optimizer
optimizer = EmailCampaignOptimizer()

# --- Flask API Routes ---

@app.route('/')
def home():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_data():
    """Handles file upload, data processing, and model training."""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        summary = optimizer.load_and_preprocess_data(file)
        if summary:
            accuracy = optimizer.train_model()
            return jsonify({
                "message": "File processed and model trained successfully!",
                "data_summary": summary,
                "model_accuracy": f"{accuracy:.2f}"
            })
        else:
            return jsonify({"error": "Failed to process file"}), 500

@app.route('/predict', methods=['POST'])
def predict():
    """Endpoint for making predictions."""
    data = request.get_json()
    subject_length = int(data.get('subject_length'))
    send_hour = int(data.get('send_hour'))
    prediction = optimizer.predict_performance(subject_length, send_hour)
    return jsonify(prediction)

@app.route('/plot', methods=['POST'])
def plot():
    """Endpoint for generating charts."""
    data = request.get_json()
    chart_type = data.get('chart_type')
    chart_image = optimizer.generate_matplotlib_chart(chart_type)
    if chart_image:
        return jsonify({"image": chart_image})
    return jsonify({"error": "Could not generate chart. Is data loaded?"}), 400

@app.route('/abtest', methods=['POST'])
def ab_test():
    """Endpoint for running A/B tests."""
    data = request.get_json()
    rate_a = float(data.get('variant_a'))
    rate_b = float(data.get('variant_b'))
    size = int(data.get('sample_size'))
    results = optimizer.run_ab_test(rate_a, rate_b, size)
    return jsonify(results)

# --- Main Execution ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)
