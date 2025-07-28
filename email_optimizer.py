import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import chi2_contingency
import datetime
import random

# --- 1. Synthetic Data Generation ---
def generate_synthetic_data(num_records=5000):
    """
    Generates a synthetic dataset for email campaign analysis. This function creates
    a DataFrame that mimics real-world email marketing data, including various
    campaign attributes and simulated user interactions. It's designed for
    demonstration and testing the analytics framework without needing live data.

    The data includes variations for A/B testing (e.g., different subject lines)
    and ensures logical dependencies between actions (e.g., a click can only
    occur if an email was first opened).

    Args:
        num_records (int): The total number of email send records to generate.

    Returns:
        pd.DataFrame: A DataFrame containing the synthetic email campaign data.
    """
    print(f"Initiating synthetic email campaign data generation for {num_records} records...")

    data = {
        'campaign_id': np.random.choice(['Campaign_A', 'Campaign_B', 'Campaign_C', 'Campaign_D', 'Campaign_E'], num_records),
        'email_id': [f'email_{i+1}' for i in range(num_records)],
        'user_id': np.random.randint(1000, 6000, num_records),
        'timestamp_sent': [datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 60),
                                                                        hours=random.randint(0, 23),
                                                                        minutes=random.randint(0, 59))
                           for _ in range(num_records)],
        'subject_line_version': np.random.choice(['Version A: Exciting Offer!', 'Version B: Don\'t Miss Out!', 'Version C: Limited Time Deal'], num_records),
        'email_content_version': np.random.choice(['Content X', 'Content Y', 'Content Z'], num_records),
        'opened': np.random.choice([0, 1], num_records, p=[0.7, 0.3]),
        'clicked': np.random.choice([0, 1], num_records, p=[0.85, 0.15]),
        'converted': np.random.choice([0, 1], num_records, p=[0.95, 0.05]),
        'revenue': np.random.uniform(0, 75, num_records) * np.random.choice([0, 1], num_records, p=[0.9, 0.1]),
        'segment': np.random.choice(['New User', 'Loyal Customer', 'Churn Risk', 'High Value'], num_records)
    }

    df = pd.DataFrame(data)

    df.loc[df['opened'] == 0, 'clicked'] = 0
    df.loc[df['clicked'] == 0, 'converted'] = 0
    df.loc[df['converted'] == 0, 'revenue'] = 0

    print(f"Successfully generated {num_records} email campaign records.")
    return df

# --- 2. Performance Analytics ---
def calculate_kpis(df):
    """
    Calculates key performance indicators (KPIs) for the entire email campaign dataset.
    Returns raw numerical values for easy JSON serialization.

    Args:
        df (pd.DataFrame): The DataFrame containing email campaign data.

    Returns:
        dict: A dictionary containing calculated KPIs as raw numbers.
    """
    total_emails_sent = len(df)
    total_opens = df['opened'].sum()
    total_clicks = df['clicked'].sum()
    total_conversions = df['converted'].sum()
    total_revenue = df['revenue'].sum()

    open_rate = (total_opens / total_emails_sent) * 100 if total_emails_sent > 0 else 0
    click_through_rate = (total_clicks / total_opens) * 100 if total_opens > 0 else 0
    conversion_rate = (total_conversions / total_clicks) * 100 if total_clicks > 0 else 0
    revenue_per_email = total_revenue / total_emails_sent if total_emails_sent > 0 else 0

    kpis = {
        'TotalEmailsSent': int(total_emails_sent), # Ensure integer for JSON
        'TotalOpens': int(total_opens),
        'TotalClicks': int(total_clicks),
        'TotalConversions': int(total_conversions),
        'TotalRevenue': round(float(total_revenue), 2), # Ensure float for JSON, rounded
        'OpenRate': round(float(open_rate), 2),
        'ClickThroughRate': round(float(click_through_rate), 2),
        'ConversionRate': round(float(conversion_rate), 2),
        'RevenuePerEmail': round(float(revenue_per_email), 2)
    }
    return kpis

def analyze_by_segment(df):
    """
    Analyzes key performance indicators (KPIs) broken down by user segment.
    Returns a DataFrame suitable for conversion to JSON.

    Args:
        df (pd.DataFrame): The DataFrame containing email campaign data.

    Returns:
        pd.DataFrame: A DataFrame summarizing KPIs for each segment.
    """
    segment_analysis = df.groupby('segment').agg(
        total_sent=('email_id', 'count'),
        total_opened=('opened', 'sum'),
        total_clicked=('clicked', 'sum'),
        total_converted=('converted', 'sum'),
        total_revenue=('revenue', 'sum')
    ).reset_index()

    segment_analysis['open_rate'] = (segment_analysis['total_opened'] / segment_analysis['total_sent']) * 100
    segment_analysis['click_rate'] = (segment_analysis['total_clicked'] / segment_analysis['total_opened']) * 100
    segment_analysis['conversion_rate'] = (segment_analysis['total_converted'] / segment_analysis['total_clicked']) * 100
    segment_analysis['revenue_per_email'] = (segment_analysis['total_revenue'] / segment_analysis['total_sent'])

    segment_analysis.fillna(0, inplace=True)
    # Convert to standard Python types for JSON compatibility
    segment_analysis = segment_analysis.round(2)
    segment_analysis['total_sent'] = segment_analysis['total_sent'].astype(int)
    segment_analysis['total_opened'] = segment_analysis['total_opened'].astype(int)
    segment_analysis['total_clicked'] = segment_analysis['total_clicked'].astype(int)
    segment_analysis['total_converted'] = segment_analysis['total_converted'].astype(int)

    return segment_analysis

# --- 3. A/B Testing Framework ---
def perform_ab_test(df, group_column, metric_column):
    """
    Performs an A/B test and returns the results as a dictionary.

    Args:
        df (pd.DataFrame): The DataFrame containing email campaign data.
        group_column (str): The column name representing the A/B test variations.
        metric_column (str): The binary column representing the success metric.

    Returns:
        dict or None: A dictionary containing A/B test results and conclusion, or None if test cannot be performed.
    """
    # Pre-filtering data for relevant metrics:
    if metric_column == 'clicked':
        test_df = df[df['opened'] == 1].copy()
    elif metric_column == 'converted':
        test_df = df[df['clicked'] == 1].copy()
    else:
        test_df = df.copy()

    if test_df.empty:
        return None

    versions = test_df[group_column].unique()
    if len(versions) != 2:
        return None # Cannot perform A/B test with more or less than 2 versions

    version_A = versions[0]
    version_B = versions[1]

    contingency_table = pd.DataFrame({
        'Success': [test_df[test_df[group_column] == version_A][metric_column].sum(),
                    test_df[test_df[group_column] == version_B][metric_column].sum()],
        'Failure': [len(test_df[test_df[group_column] == version_A]) - test_df[test_df[group_column] == version_A][metric_column].sum(),
                    len(test_df[test_df[group_column] == version_B]) - test_df[test_df[group_column] == version_B][metric_column].sum()]
    }, index=[version_A, version_B])

    chi2, p_value, dof, expected = chi2_contingency(contingency_table)

    alpha = 0.05
    significant = p_value < alpha

    rate_A = (contingency_table.loc[version_A, 'Success'] / contingency_table.loc[version_A].sum()) * 100 if contingency_table.loc[version_A].sum() > 0 else 0
    rate_B = (contingency_table.loc[version_B, 'Success'] / contingency_table.loc[version_B].sum()) * 100 if contingency_table.loc[version_B].sum() > 0 else 0

    winner = 'None'
    if significant:
        winner = version_A if rate_A > rate_B else version_B

    return {
        'test_type': 'A/B Test',
        'group_column': group_column,
        'metric_column': metric_column,
        'version_A': version_A,
        'success_A': int(contingency_table.loc[version_A, 'Success']),
        'total_A': int(contingency_table.loc[version_A].sum()),
        'rate_A': round(rate_A, 2),
        'version_B': version_B,
        'success_B': int(contingency_table.loc[version_B, 'Success']),
        'total_B': int(contingency_table.loc[version_B].sum()),
        'rate_B': round(rate_B, 2),
        'chi2_statistic': round(float(chi2), 4),
        'p_value': round(float(p_value), 5),
        'significant': significant,
        'winner': winner
    }

# --- 4. Basic Visualization ---
# This function remains for local file generation, but the web UI will use Chart.js
def plot_kpis(df):
    """
    Generates and saves basic bar plots to visually compare KPI performance.
    These plots offer a quick and intuitive understanding of the data trends
    and are saved as PNG files, which can then be displayed in a web interface
    or used in reports.
    """
    print("\nGenerating static KPI plots using Matplotlib...")

    open_rate_by_subject = df.groupby('subject_line_version')['opened'].mean() * 100
    plt.figure(figsize=(10, 6))
    open_rate_by_subject.plot(kind='bar', color=['#66b3ff', '#ff9999', '#99ff99'])
    plt.title('Average Open Rate by Subject Line Version', fontsize=14)
    plt.ylabel('Open Rate (%)', fontsize=12)
    plt.xlabel('Subject Line Version', fontsize=12)
    plt.xticks(rotation=45, ha='right', fontsize=10)
    plt.yticks(fontsize=10)
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    plt.tight_layout()
    plt.savefig('open_rate_by_subject.png', dpi=300)
    plt.close()

    conversion_by_segment = df.groupby('segment')['converted'].mean() * 100
    plt.figure(figsize=(10, 6))
    conversion_by_segment.plot(kind='bar', color=['#ffcc99', '#c2c2f0', '#ffb3e6', '#b3d9ff'])
    plt.title('Average Conversion Rate by User Segment', fontsize=14)
    plt.ylabel('Conversion Rate (%)', fontsize=12)
    plt.xlabel('User Segment', fontsize=12)
    plt.xticks(rotation=45, ha='right', fontsize=10)
    plt.yticks(fontsize=10)
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    plt.tight_layout()
    plt.savefig('conversion_rate_by_segment.png', dpi=300)
    plt.close()

    print("KPI plots 'open_rate_by_subject.png' and 'conversion_rate_by_segment.png' have been successfully saved in high resolution.")


