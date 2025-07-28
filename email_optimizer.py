import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import chi2_contingency
import datetime
import random

# --- 1. Synthetic Data Generation ---
def generate_synthetic_data(num_records=5000):
    """
    Generates synthetic email campaign data for demonstration purposes.
    Includes A/B test variations.
    """
    print("Generating synthetic email campaign data...")

    data = {
        'campaign_id': np.random.choice(['Campaign_A', 'Campaign_B', 'Campaign_C', 'Campaign_D'], num_records),
        'email_id': [f'email_{i+1}' for i in range(num_records)],
        'user_id': np.random.randint(1000, 5000, num_records),
        'timestamp_sent': [datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 60),
                                                                        hours=random.randint(0, 23),
                                                                        minutes=random.randint(0, 59))
                           for _ in range(num_records)],
        'subject_line_version': np.random.choice(['Version A: Exciting Offer!', 'Version B: Don\'t Miss Out!'], num_records),
        'email_content_version': np.random.choice(['Content X', 'Content Y'], num_records),
        'opened': np.random.choice([0, 1], num_records, p=[0.7, 0.3]), # 30% open rate
        'clicked': np.random.choice([0, 1], num_records, p=[0.85, 0.15]), # 15% click rate (of all sent)
        'converted': np.random.choice([0, 1], num_records, p=[0.95, 0.05]), # 5% conversion rate (of all sent)
        'revenue': np.random.uniform(0, 50, num_records) * np.random.choice([0, 1], num_records, p=[0.9, 0.1]), # 10% chance of revenue
        'segment': np.random.choice(['New User', 'Loyal Customer', 'Churn Risk'], num_records)
    }

    df = pd.DataFrame(data)

    # Ensure clicks only happen if opened
    df.loc[df['opened'] == 0, 'clicked'] = 0
    # Ensure conversions only happen if clicked
    df.loc[df['clicked'] == 0, 'converted'] = 0
    # Ensure revenue only happens if converted
    df.loc[df['converted'] == 0, 'revenue'] = 0

    print(f"Generated {num_records} records.")
    return df

# --- 2. Performance Analytics ---
def calculate_kpis(df):
    """
    Calculates key performance indicators (KPIs) for email campaigns.
    """
    print("\nCalculating KPIs...")
    total_emails_sent = len(df)
    total_opens = df['opened'].sum()
    total_clicks = df['clicked'].sum()
    total_conversions = df['converted'].sum()
    total_revenue = df['revenue'].sum()

    open_rate = (total_opens / total_emails_sent) * 100 if total_emails_sent > 0 else 0
    click_through_rate = (total_clicks / total_opens) * 100 if total_opens > 0 else 0 # CTR based on opens
    conversion_rate = (total_conversions / total_clicks) * 100 if total_clicks > 0 else 0 # Conversion based on clicks
    revenue_per_email = total_revenue / total_emails_sent if total_emails_sent > 0 else 0

    kpis = {
        'Total Emails Sent': total_emails_sent,
        'Total Opens': total_opens,
        'Total Clicks': total_clicks,
        'Total Conversions': total_conversions,
        'Total Revenue': f"${total_revenue:.2f}",
        'Open Rate (%)': f"{open_rate:.2f}%",
        'Click-Through Rate (CTR) (%)': f"{click_through_rate:.2f}%",
        'Conversion Rate (%)': f"{conversion_rate:.2f}%",
        'Revenue per Email': f"${revenue_per_email:.2f}"
    }

    print("KPIs calculated:")
    for key, value in kpis.items():
        print(f"- {key}: {value}")
    return kpis

def analyze_by_segment(df):
    """
    Analyzes KPIs by user segment.
    """
    print("\nAnalyzing KPIs by Segment...")
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

    print("Segment Analysis:")
    print(segment_analysis[['segment', 'open_rate', 'click_rate', 'conversion_rate', 'revenue_per_email']].round(2))
    return segment_analysis

# --- 3. A/B Testing Framework ---
def perform_ab_test(df, group_column, metric_column):
    """
    Performs an A/B test using a Chi-squared test for independence.
    Assumes metric_column is binary (e.g., opened, clicked, converted).
    """
    print(f"\nPerforming A/B Test on '{group_column}' for '{metric_column}'...")

    # Filter out rows where the metric column is not relevant (e.g., not opened for click rate)
    if metric_column == 'clicked':
        test_df = df[df['opened'] == 1].copy() # Only consider emails that were opened for click rate
    elif metric_column == 'converted':
        test_df = df[df['clicked'] == 1].copy() # Only consider emails that were clicked for conversion rate
    else:
        test_df = df.copy()

    if test_df.empty:
        print(f"Not enough data to perform A/B test for {metric_column} after filtering.")
        return None

    # Get the two unique versions for the A/B test
    versions = test_df[group_column].unique()
    if len(versions) != 2:
        print(f"Error: A/B test requires exactly two versions in '{group_column}'. Found: {len(versions)}")
        return None

    version_A = versions[0]
    version_B = versions[1]

    # Create a contingency table
    # Rows: Versions (A, B)
    # Columns: Success (metric_column = 1), Failure (metric_column = 0)
    contingency_table = pd.DataFrame({
        'Success': [test_df[test_df[group_column] == version_A][metric_column].sum(),
                    test_df[test_df[group_column] == version_B][metric_column].sum()],
        'Failure': [len(test_df[test_df[group_column] == version_A]) - test_df[test_df[group_column] == version_A][metric_column].sum(),
                    len(test_df[test_df[group_column] == version_B]) - test_df[test_df[group_column] == version_B][metric_column].sum()]
    }, index=[version_A, version_B])

    print("\nContingency Table:")
    print(contingency_table)

    # Perform Chi-squared test
    chi2, p_value, dof, expected = chi2_contingency(contingency_table)

    print(f"\nChi-squared Statistic: {chi2:.2f}")
    print(f"P-value: {p_value:.3f}")

    alpha = 0.05 # Significance level

    if p_value < alpha:
        conclusion = f"The difference in {metric_column} between '{version_A}' and '{version_B}' is statistically significant (p < {alpha})."
        if contingency_table.loc[version_A, 'Success'] / (contingency_table.loc[version_A, 'Success'] + contingency_table.loc[version_A, 'Failure']) > \
           contingency_table.loc[version_B, 'Success'] / (contingency_table.loc[version_B, 'Success'] + contingency_table.loc[version_B, 'Failure']):
            winner = version_A
            loser = version_B
        else:
            winner = version_B
            loser = version_A
        print(f"Conclusion: {conclusion} '{winner}' performed better than '{loser}'.")
        return {'test_type': 'A/B Test', 'group_column': group_column, 'metric_column': metric_column,
                'version_A': version_A, 'version_B': version_B,
                'success_A': contingency_table.loc[version_A, 'Success'], 'total_A': contingency_table.loc[version_A].sum(),
                'success_B': contingency_table.loc[version_B, 'Success'], 'total_B': contingency_table.loc[version_B].sum(),
                'chi2_statistic': chi2, 'p_value': p_value, 'significant': True, 'winner': winner}
    else:
        conclusion = f"The difference in {metric_column} between '{version_A}' and '{version_B}' is NOT statistically significant (p >= {alpha})."
        print(f"Conclusion: {conclusion} More data or a larger effect size might be needed.")
        return {'test_type': 'A/B Test', 'group_column': group_column, 'metric_column': metric_column,
                'version_A': version_A, 'version_B': version_B,
                'success_A': contingency_table.loc[version_A, 'Success'], 'total_A': contingency_table.loc[version_A].sum(),
                'success_B': contingency_table.loc[version_B, 'Success'], 'total_B': contingency_table.loc[version_B].sum(),
                'chi2_statistic': chi2, 'p_value': p_value, 'significant': False, 'winner': 'None'}

# --- 4. Basic Visualization ---
def plot_kpis(df):
    """
    Generates basic bar plots for KPI comparison.
    """
    print("\nGenerating KPI plots...")

    # Open Rate by Subject Line Version
    open_rate_by_subject = df.groupby('subject_line_version')['opened'].mean() * 100
    plt.figure(figsize=(8, 5))
    open_rate_by_subject.plot(kind='bar', color=['skyblue', 'lightcoral'])
    plt.title('Open Rate by Subject Line Version')
    plt.ylabel('Open Rate (%)')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig('open_rate_by_subject.png') # Save plot for potential web display
    plt.close() # Close plot to free memory

    # Conversion Rate by Segment
    conversion_by_segment = df.groupby('segment')['converted'].mean() * 100
    plt.figure(figsize=(8, 5))
    conversion_by_segment.plot(kind='bar', color=['lightgreen', 'orange', 'purple'])
    plt.title('Conversion Rate by User Segment')
    plt.ylabel('Conversion Rate (%)')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig('conversion_rate_by_segment.png')
    plt.close()

    print("KPI plots saved as PNG files.")

# --- Main Execution ---
if __name__ == "__main__":
    # Generate data
    email_df = generate_synthetic_data(num_records=10000)

    # Calculate overall KPIs
    overall_kpis = calculate_kpis(email_df)

    # Analyze by segment
    segment_kpis = analyze_by_segment(email_df)

    # Perform A/B test on subject line version for conversion rate
    ab_test_results = perform_ab_test(email_df, 'subject_line_version', 'converted')

    # Generate plots
    plot_kpis(email_df)

    print("\n--- Python Script Execution Complete ---")
    print("You can now integrate these analytics into a web interface.")
    print("The plots 'open_rate_by_subject.png' and 'conversion_rate_by_segment.png' have been saved.")

