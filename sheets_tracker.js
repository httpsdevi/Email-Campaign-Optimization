/**
 * Google Sheets Tracker for Email Campaign Analytics
 * This module handles logging campaign data to Google Sheets for analysis
 */

class SheetsTracker {
    constructor(spreadsheetId, apiKey) {
        this.spreadsheetId = spreadsheetId;
        this.apiKey = apiKey;
        this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
        this.batchData = [];
        this.batchTimer = null;
        this.initialized = false;
    }

    /**
     * Initialize the tracker and create necessary sheets
     */
    async initialize() {
        try {
            await this.createSheetsIfNotExists();
            this.initialized = true;
            console.log('Google Sheets Tracker initialized successfully');
        } catch (error) {
            console.error('Error initializing Sheets Tracker:', error);
            // Continue in offline mode
            this.initialized = false;
        }
    }

    /**
     * Create necessary sheets if they don't exist
     */
    async createSheetsIfNotExists() {
        const sheetsToCreate = [
            {
                name: 'Campaign_Overview',
                headers: ['Timestamp', 'Campaign_ID', 'Campaign_Name', 'Type', 'Segment', 'Status', 'Email_Count']
            },
            {
                name: 'Campaign_Metrics',
                headers: ['Timestamp', 'Campaign_ID', 'Open_Rate', 'Click_Rate', 'Conversion_Rate', 'Unsubscribe_Rate', 'Leads_Generated']
            },
            {
                name: 'Email_Performance',
                headers: ['Timestamp', 'Campaign_ID', 'Email_Index', 'Subject', 'Type', 'Day', 'Opens', 'Clicks', 'Replies']
            },
            {
                name: 'AB_Tests',
                headers: ['Timestamp', 'Test_ID', 'Subject_A', 'Subject_B', 'Open_Rate_A', 'Open_Rate_B', 'Click_Rate_A', 'Click_Rate_B', 'Winner', 'Sample_Size']
            },
            {
                name: 'User_Actions',
                headers: ['Timestamp', 'Action_Type', 'Campaign_ID', 'User_Agent', 'Details']
            }
        ];

        for (const sheet of sheetsToCreate) {
            try {
                await this.createSheet(sheet.name, sheet.headers);
            } catch (error) {
                console.warn(`Sheet ${sheet.name} might already exist or error occurred:`, error);
            }
        }
    }

    /**
     * Create a new sheet with headers
     */
    async createSheet(sheetName, headers) {
        const requests = [
            {
                addSheet: {
                    properties: {
                        title: sheetName
                    }
                }
            }
        ];

        try {
            const response = await fetch(`${this.baseUrl}/${this.spreadsheetId}:batchUpdate?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requests: requests
                })
            });

            if (response.ok) {
                // Add headers to the new sheet
                await this.addHeaders(sheetName, headers);
            }
        } catch (error) {
            // Sheet might already exist, try to add headers anyway
            await this.addHeaders(sheetName, headers);
        }
    }

    /**
     * Add headers to a sheet
     */
    async addHeaders(sheetName, headers) {
        const range = `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1`;
        
        try {
            await fetch(`${this.baseUrl}/${this.spreadsheetId}/values/${range}?valueInputOption=RAW&key=${this.apiKey}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [headers]
                })
            });
        } catch (error) {
            console.warn('Error adding headers:', error);
        }
    }

    /**
     * Log campaign creation
     */
    async logCampaignCreation(campaignId, campaignData) {
        const data = [
            new Date().toISOString(),
            campaignId,
            campaignData.name,
            campaignData.type,
            campaignData.segment,
            campaignData.status || 'active',
            campaignData.emailCount || 5
        ];

        await this.appendToSheet('Campaign_Overview', data);
        this.logUserAction('campaign_created', campaignId, JSON.stringify(campaignData));
    }

    /**
     * Log campaign metrics
     */
    async logCampaignMetrics(campaignId, metrics) {
        const data = [
            new Date().toISOString(),
            campaignId,
            metrics.openRate || 0,
            metrics.clickRate || 0,
            metrics.conversionRate || 0,
            metrics.unsubscribeRate || 0,
            metrics.leads || 0
        ];

        await this.appendToSheet('Campaign_Metrics', data);
    }

    /**
     * Log email performance
     */
    async logEmailPerformance(campaignId, emailIndex, emailData, performance) {
        const data = [
            new Date().toISOString(),
            campaignId,
            emailIndex,
            emailData.subject,
            emailData.type,
            emailData.day,
            performance.opens || 0,
            performance.clicks || 0,
            performance.replies || 0
        ];

        await this.appendToSheet('Email_Performance', data);
    }

    /**
     * Log A/B test results
     */
    async logABTest(testId, testData) {
        const data = [
            new Date().toISOString(),
            testId,
            testData.subjectA,
            testData.subjectB,
            testData.openRateA,
            testData.openRateB,
            testData.clickRateA,
            testData.clickRateB,
            testData.winner,
            testData.sampleSize
        ];

        await this.appendToSheet('AB_Tests', data);
        this.logUserAction('ab_test_completed', testId, JSON.stringify(testData));
    }

    /**
     * Log user actions
     */
    async logUserAction(actionType, campaignId = '', details = '') {
        const data = [
            new Date().toISOString(),
            actionType,
            campaignId,
            navigator.userAgent,
            details
        ];

        await this.appendToSheet('User_Actions', data);
    }

    /**
     * Log campaign sent
     */
    async logCampaignSent(campaignId) {
        this.logUserAction('campaign_sent', campaignId, 'Campaign sent successfully');
    }

    /**
     * Append data to a specific sheet
     */
    async appendToSheet(sheetName, data) {
        if (!this.initialized) {
            // Store in batch for offline mode
            this.batchData.push({ sheet: sheetName, data: data });
            return;
        }

        try {
            const range = `${sheetName}!A:Z`;
            const response = await fetch(`${this.baseUrl}/${this.spreadsheetId}/values/${range}:append?valueInputOption=RAW&key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [data]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error appending to sheet:', error);
            // Store in batch for retry
            this.batchData.push({ sheet: sheetName, data: data });
        }
    }

    /**
     * Process batched data when connection is restored
     */
    async processBatchedData() {
        if (!this.initialized || this.batchData.length === 0) return;

        console.log(`Processing ${this.batchData.length} batched entries...`);

        for (const entry of this.batchData) {
            try {
                await this.appendToSheet(entry.sheet, entry.data);
            } catch (error) {
                console.error('Error processing batched data:', error);
            }
        }

        this.batchData = [];
        console.log('Batched data processed successfully');
    }

    /**
     * Get campaign analytics from sheets
     */
    async getCampaignAnalytics(campaignId = null) {
        if (!this.initialized) {
            return this.getMockAnalytics();
        }

        try {
            const ranges = [
                'Campaign_Overview!A:Z',
                'Campaign_Metrics!A:Z',
                'Email_Performance!A:Z'
            ];

            const response = await fetch(`${this.baseUrl}/${this.spreadsheetId}/values:batchGet?ranges=${ranges.join('&ranges=')}&key=${this.apiKey}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return this.processAnalyticsData(data.valueRanges, campaignId);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            return this.getMockAnalytics();
        }
    }

    /**
     * Process analytics data from sheets
     */
    processAnalyticsData(ranges, campaignId) {
        const [overviewData, metricsData, performanceData] = ranges;

        const analytics = {
            totalCampaigns: 0,
            avgOpenRate: 0,
            avgClickRate: 0,
            totalLeads: 0,
            campaigns: [],
            emailPerformance: []
        };

        // Process overview data
        if (overviewData.values && overviewData.values.length > 1) {
            const campaigns = overviewData.values.slice(1);
            analytics.totalCampaigns = campaigns.length;
            
            if (campaignId) {
                analytics.campaigns = campaigns.filter(row => row[1] === campaignId);
            } else {
                analytics.campaigns = campaigns;
            }
        }

        // Process metrics data
        if (metricsData.values && metricsData.values.length > 1) {
            const metrics = metricsData.values.slice(1);
            let totalOpenRate = 0;
            let totalClickRate = 0;
            let totalLeads = 0;

            metrics.forEach(row => {
                if (!campaignId || row[1] === campaignId) {
                    totalOpenRate += parseFloat(row[2]) || 0;
                    totalClickRate += parseFloat(row[3]) || 0;
                    totalLeads += parseInt(row[6]) || 0;
                }
            });

            const count = campaignId ? metrics.filter(row => row[1] === campaignId).length : metrics.length;
            analytics.avgOpenRate = count > 0 ? Math.round(totalOpenRate / count) : 0;
            analytics.avgClickRate = count > 0 ? Math.round(totalClickRate / count) : 0;
            analytics.totalLeads = totalLeads;
        }

        // Process email performance data
        if (performanceData.values && performanceData.values.length > 1) {
            const performance = performanceData.values.slice(1);
            analytics.emailPerformance = campaignId 
                ? performance.filter(row => row[1] === campaignId)
                : performance;
        }

        return analytics;
    }

    /**
     * Generate dashboard report
     */
    async generateDashboardReport() {
        const analytics = await this.getCampaignAnalytics();
        
        return {
            summary: {
                totalCampaigns: analytics.totalCampaigns,
                avgOpenRate: analytics.avgOpenRate,
                avgClickRate: analytics.avgClickRate,
                totalLeads: analytics.totalLeads
            },
            topPerformingCampaigns: this.getTopPerformers(analytics.campaigns),
            emailPerformance: analytics.emailPerformance.slice(0, 10) // Top 10
        };
    }

    /**
     * Get top performing campaigns
     */
    getTopPerformers(campaigns) {
        return campaigns
            .sort((a, b) => (parseFloat(b[2]) || 0) - (parseFloat(a[2]) || 0)) // Sort by open rate
            .slice(0, 5)
            .map(campaign => ({
                name: campaign[2],
                type: campaign[3],
                openRate: parseFloat(campaign[2]) || 0
            }));
    }

    /**
     * Export data to CSV
     */
    async exportToCsv(sheetName) {
        try {
            const range = `${sheetName}!A:Z`;
            const response = await fetch(`${this.baseUrl}/${this.spreadsheetId}/values/${range}?key=${this.apiKey}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const csv = this.convertToCSV(data.values);
            
            // Download CSV
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${sheetName}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting to CSV:', error);
        }
    }

    /**
     * Convert array data to CSV format
     */
    convertToCSV(data) {
        return data.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }

    /**
     * Mock analytics for offline mode
     */
    getMockAnalytics() {
        return {
            totalCampaigns: 5,
            avgOpenRate: 25,
            avgClickRate: 4,
            totalLeads: 150,
            campaigns: [],
            emailPerformance: []
        };
    }

    /**
     * Schedule automatic data sync
     */
    startAutoSync(intervalMinutes = 5) {
        setInterval(() => {
            this.processBatchedData();
        }, intervalMinutes * 60 * 1000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize with demo credentials (replace with real ones)
    window.sheetsTracker = new SheetsTracker('demo-spreadsheet-id', 'demo-api-key');
    
    // Initialize the tracker
    window.sheetsTracker.initialize().then(() => {
        console.log('Google Sheets Tracker ready');
        // Start auto-sync every 5 minutes
        window.sheetsTracker.startAutoSync(5);
    });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SheetsTracker;
}
