/**
 * Google Sheets Integration for Email Campaign Tracking
 * Handles real-time data synchronization and automated reporting
 */

class SheetsTracker {
    constructor(credentials, spreadsheetId) {
        this.credentials = credentials;
        this.spreadsheetId = spreadsheetId;
        this.accessToken = null;
        this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
        
        // Sheet names for different data types
        this.sheets = {
            campaigns: 'Campaign_Data',
            analytics: 'Analytics_Dashboard',
            realtime: 'Realtime_Tracking',
            summary: 'Performance_Summary'
        };
    }

    /**
     * Authenticate with Google Sheets API using service account
     */
    async authenticate() {
        try {
            const jwtToken = this.createJWT();
            
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion: jwtToken
                })
            });

            const tokenData = await response.json();
            
            if (!response.ok) {
                throw new Error(`Authentication failed: ${tokenData.error_description}`);
            }

            this.accessToken = tokenData.access_token;
            console.log('✅ Google Sheets authentication successful');
            return { success: true };

        } catch (error) {
            console.error('❌ Google Sheets authentication failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create JWT token for service account authentication
     */
    createJWT() {
        const header = {
            alg: 'RS256',
            typ: 'JWT'
        };

        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: this.credentials.client_email,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };

        // Note: In production, use a proper JWT library for signing
        // This is a simplified version for demonstration
        return this.signJWT(header, payload, this.credentials.private_key);
    }

    /**
     * Initialize spreadsheet with required sheets and headers
     */
    async initializeSpreadsheet() {
        try {
            await this.authenticate();

            // Create sheets if they don't exist
            await this.createSheetsIfNotExist();
            
            // Set up headers for each sheet
            await this.setupSheetHeaders();
            
            console.log('✅ Spreadsheet initialized successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to initialize spreadsheet:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create required sheets if they don't exist
     */
    async createSheetsIfNotExist() {
        const requests = [];
        
        Object.values(this.sheets).forEach(sheetName => {
            requests.push({
                addSheet: {
                    properties: {
                        title: sheetName,
                        gridProperties: {
                            rowCount: 1000,
                            columnCount: 20
                        }
                    }
                }
            });
        });

        await this.batchUpdate(requests);
    }

    /**
     * Set up headers for all sheets
     */
    async setupSheetHeaders() {
        const headers = {
            [this.sheets.campaigns]: [
                'Campaign ID', 'Campaign Title', 'Subject Line', 'Send Date', 
                'Audience Size', 'Emails Sent', 'Delivered', 'Opens', 'Unique Opens',
                'Clicks', 'Unique Clicks', 'Unsubscribes', 'Open Rate %', 'CTR %', 
                'Delivery Rate %', 'Status', 'Campaign Type'
            ],
            [this.sheets.analytics]: [
                'Metric', 'Campaign A', 'Campaign B', 'Improvement %', 'Last Updated'
            ],
            [this.sheets.realtime]: [
                'Timestamp', 'Event Type', 'Campaign ID', 'Email Address', 
                'URL Clicked', 'Device Type', 'Location', 'User Agent'
            ],
            [this.sheets.summary]: [
                'Date', 'Total Campaigns', 'Total Emails Sent', 'Avg Open Rate',
                'Avg CTR', 'Total Conversions', 'Best Performing Campaign'
            ]
        };

        for (const [sheetName, headerRow] of Object.entries(headers)) {
            await this.updateRange(`${sheetName}!A1:${this.getColumnLetter(headerRow.length)}1`, [headerRow]);
        }
    }

    /**
     * Add new campaign data to tracking sheet
     */
    async addCampaignData(campaignData) {
        try {
            await this.authenticate();

            const row = [
                campaignData.campaignId,
                campaignData.title,
                campaignData.subjectLine,
                campaignData.sendTime,
                campaignData.audienceSize || '',
                campaignData.emailsSent || 0,
                campaignData.delivered || 0,
                campaignData.opens || 0,
                campaignData.uniqueOpens || 0,
                campaignData.clicks || 0,
                campaignData.uniqueClicks || 0,
                campaignData.unsubscribes || 0,
                campaignData.openRate || 0,
                campaignData.clickRate || 0,
                campaignData.deliveryRate || 0,
                campaignData.status || 'sent',
                campaignData.campaignType || 'regular'
            ];

            const result = await this.appendRow(this.sheets.campaigns, row);
            
            if (result.success) {
                console.log('✅ Campaign data added to sheet');
                // Update summary statistics
                await this.updateSummaryStats();
            }

            return result;

        } catch (error) {
            console.error('❌ Failed to add campaign data:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update existing campaign data
     */
    async updateCampaignData(campaignId, updatedData) {
        try {
            await this.authenticate();

            // Find the row with matching campaign ID
            const campaignSheet = await this.getSheetData(this.sheets.campaigns);
            const campaignRowIndex = campaignSheet.findIndex(row => row[0] === campaignId);

            if (campaignRowIndex === -1) {
                throw new Error(`Campaign ${campaignId} not found`);
            }

            // Update specific fields
            const updatePromises = [];
            const fieldMapping = {
                emailsSent: 5, delivered: 6, opens: 7, uniqueOpens: 8,
                clicks: 9, uniqueClicks: 10, unsubscribes: 11,
                openRate: 12, clickRate: 13, deliveryRate: 14, status: 15
            };

            Object.entries(updatedData).forEach(([field, value]) => {
                if (fieldMapping[field] !== undefined) {
                    const column = this.getColumnLetter(fieldMapping[field] + 1);
                    const range = `${this.sheets.campaigns}!${column}${campaignRowIndex + 2}`;
                    updatePromises.push(this.updateRange(range, [[value]]));
                }
            });

            await Promise.all(updatePromises);
            
            console.log('✅ Campaign data updated');
            await this.updateSummaryStats();
            
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to update campaign data:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Log real-time engagement events
     */
    async logEngagementEvent(eventData) {
        try {
            const row = [
                new Date().toISOString(),
                eventData.eventType, // 'open', 'click', 'unsubscribe'
                eventData.campaignId,
                eventData.email || '',
                eventData.url || '',
                eventData.deviceType || '',
                eventData.location || '',
                eventData.userAgent || ''
            ];

            const result = await this.appendRow(this.sheets.realtime, row);
            
            if (result.success) {
                // Update campaign totals in real-time
                await this.updateCampaignTotals(eventData.campaignId, eventData.eventType);
            }

            return result;

        } catch (error) {
            console.error('❌ Failed to log engagement event:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update campaign totals based on real-time events
     */
    async updateCampaignTotals(campaignId, eventType) {
        try {
            const campaignData = await this.getCampaignData(campaignId);
            if (!campaignData) return;

            const updates = {};
            
            switch (eventType) {
                case 'open':
                    updates.opens = (campaignData.opens || 0) + 1;
                    updates.openRate = ((updates.opens / campaignData.emailsSent) * 100).toFixed(2);
                    break;
                case 'click':
                    updates.clicks = (campaignData.clicks || 0) + 1;
                    updates.clickRate = ((updates.clicks / campaignData.emailsSent) * 100).toFixed(2);
                    break;
                case 'unsubscribe':
                    updates.unsubscribes = (campaignData.unsubscribes || 0) + 1;
                    break;
            }

            if (Object.keys(updates).length > 0) {
                await this.updateCampaignData(campaignId, updates);
            }

        } catch (error) {
            console.error('❌ Failed to update campaign totals:', error);
        }
    }

    /**
     * Create A/B test comparison analysis
     */
    async createABTestAnalysis(campaignAData, campaignBData) {
        try {
            await this.authenticate();

            const analysisData = [
                ['Metric', 'Campaign A', 'Campaign B', 'Improvement %', 'Last Updated'],
                [
                    'Open Rate',
                    `${campaignAData.openRate}%`,
                    `${campaignBData.openRate}%`,
                    this.calculateImprovement(campaignAData.openRate, campaignBData.openRate),
                    new Date().toISOString()
                ],
                [
                    'Click-Through Rate',
                    `${campaignAData.clickRate}%`,
                    `${campaignBData.clickRate}%`,
                    this.calculateImprovement(campaignAData.clickRate, campaignBData.clickRate),
                    new Date().toISOString()
                ],
                [
                    'Delivery Rate',
                    `${campaignAData.deliveryRate}%`,
                    `${campaignBData.deliveryRate}%`,
                    this.calculateImprovement(campaignAData.deliveryRate, campaignBData.deliveryRate),
                    new Date().toISOString()
                ],
                [
                    'Total Opens',
                    campaignAData.opens,
                    campaignBData.opens,
                    this.calculateImprovement(campaignAData.opens, campaignBData.opens),
                    new Date().toISOString()
                ],
                [
                    'Total Clicks',
                    campaignAData.clicks,
                    campaignBData.clicks,
                    this.calculateImprovement(campaignAData.clicks, campaignBData.clicks),
                    new Date().toISOString()
                ]
            ];

            await this.updateRange(`${this.sheets.analytics}!A1:E6`, analysisData);
            
            console.log('✅ A/B test analysis created');
            return { success: true, analysis: analys
