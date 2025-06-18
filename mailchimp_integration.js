/**
 * Mailchimp API Integration for Email Campaign Optimization
 * Handles campaign creation, management, and analytics retrieval
 */

class MailchimpIntegration {
    constructor(apiKey, serverPrefix = 'us1') {
        this.apiKey = apiKey;
        this.serverPrefix = serverPrefix;
        this.baseUrl = `https://${serverPrefix}.api.mailchimp.com/3.0`;
        this.headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Test API connection and get account information
     */
    async authenticateAndGetAccount() {
        try {
            const response = await fetch(`${this.baseUrl}/`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const accountData = await response.json();
            console.log('✅ Mailchimp connection successful');
            return {
                success: true,
                data: {
                    accountId: accountData.account_id,
                    accountName: accountData.account_name,
                    email: accountData.email,
                    totalSubscribers: accountData.total_subscribers
                }
            };

        } catch (error) {
            console.error('❌ Mailchimp authentication failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all audience lists
     */
    async getAudienceLists() {
        try {
            const response = await fetch(`${this.baseUrl}/lists?count=100`, {
                method: 'GET',
                headers: this.headers
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to fetch audiences');
            }

            return {
                success: true,
                lists: data.lists.map(list => ({
                    id: list.id,
                    name: list.name,
                    memberCount: list.stats.member_count,
                    openRate: list.stats.open_rate,
                    clickRate: list.stats.click_rate
                }))
            };

        } catch (error) {
            console.error('❌ Failed to get audience lists:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a new email campaign
     */
    async createCampaign(campaignData) {
        try {
            const campaign = {
                type: 'regular',
                recipients: {
                    list_id: campaignData.audienceId
                },
                settings: {
                    subject_line: campaignData.subjectLine,
                    title: campaignData.campaignTitle,
                    from_name: campaignData.fromName,
                    reply_to: campaignData.replyTo,
                    to_name: '*|FNAME|* *|LNAME|*',
                    template_id: campaignData.templateId || null,
                    auto_footer: false,
                    inline_css: true
                },
                tracking: {
                    opens: true,
                    html_clicks: true,
                    text_clicks: true,
                    goal_tracking: true,
                    ecomm360: false,
                    google_analytics: campaignData.googleAnalytics || '',
                    clicktale: ''
                }
            };

            // Add segmentation if provided
            if (campaignData.segment) {
                campaign.recipients.segment_opts = campaignData.segment;
            }

            const response = await fetch(`${this.baseUrl}/campaigns`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(campaign)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to create campaign');
            }

            console.log('✅ Campaign created successfully:', data.id);
            return {
                success: true,
                campaignId: data.id,
                webId: data.web_id,
                status: data.status,
                createTime: data.create_time
            };

        } catch (error) {
            console.error('❌ Failed to create campaign:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set campaign content (HTML template)
     */
    async setCampaignContent(campaignId, htmlContent) {
        try {
            const content = {
                html: htmlContent
            };

            const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/content`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify(content)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to set campaign content');
            }

            console.log('✅ Campaign content updated successfully');
            return { success: true, data };

        } catch (error) {
            console.error('❌ Failed to set campaign content:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send a test email
     */
    async sendTestEmail(campaignId, testEmails, sendType = 'html') {
        try {
            const testData = {
                test_emails: Array.isArray(testEmails) ? testEmails : [testEmails],
                send_type: sendType
            };

            const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/actions/test`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(testData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to send test email');
            }

            console.log('✅ Test email sent successfully');
            return { success: true };

        } catch (error) {
            console.error('❌ Failed to send test email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Schedule or send campaign
     */
    async sendCampaign(campaignId, scheduleTime = null) {
        try {
            let endpoint = `${this.baseUrl}/campaigns/${campaignId}/actions/send`;
            let method = 'POST';
            let body = null;

            // If schedule time is provided, schedule the campaign
            if (scheduleTime) {
                endpoint = `${this.baseUrl}/campaigns/${campaignId}/actions/schedule`;
                body = JSON.stringify({
                    schedule_time: scheduleTime // ISO 8601 format
                });
            }

            const response = await fetch(endpoint, {
                method,
                headers: this.headers,
                body
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to send/schedule campaign');
            }

            const action = scheduleTime ? 'scheduled' : 'sent';
            console.log(`✅ Campaign ${action} successfully`);
            return { success: true, action };

        } catch (error) {
            console.error('❌ Failed to send/schedule campaign:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get campaign analytics/statistics
     */
    async getCampaignStats(campaignId) {
        try {
            const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}`, {
                method: 'GET',
                headers: this.headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to get campaign stats');
            }

            const stats = data.report_summary || {};
            
            return {
                success: true,
                campaignInfo: {
                    id: data.id,
                    webId: data.web_id,
                    title: data.settings.title,
                    subjectLine: data.settings.subject_line,
                    status: data.status,
                    sendTime: data.send_time,
                    createTime: data.create_time
                },
                stats: {
                    emailsSent: stats.emails_sent || 0,
                    delivered: stats.emails_sent - (stats.bounces?.hard_bounces || 0) - (stats.bounces?.soft_bounces || 0),
                    opens: stats.opens || 0,
                    uniqueOpens: stats.unique_opens || 0,
                    openRate: stats.open_rate || 0,
                    clicks: stats.clicks || 0,
                    uniqueClicks: stats.unique_clicks || 0,
                    clickRate: stats.click_rate || 0,
                    subscriberClicks: stats.subscriber_clicks || 0,
                    unsubscribes: stats.unsubscribed || 0,
                    bounces: stats.bounces?.hard_bounces || 0 + stats.bounces?.soft_bounces || 0
                }
            };

        } catch (error) {
            console.error('❌ Failed to get campaign stats:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get detailed campaign reports
     */
    async getDetailedCampaignReport(campaignId) {
        try {
            const response = await fetch(`${this.baseUrl}/reports/${campaignId}`, {
                method: 'GET',
                headers: this.headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to get detailed report');
            }

            return {
                success: true,
                report: {
                    campaignTitle: data.campaign_title,
                    emailsSent: data.emails_sent,
                    delivered: data.emails_sent - data.bounces.hard_bounces - data.bounces.soft_bounces,
                    deliveryRate: ((data.emails_sent - data.bounces.hard_bounces - data.bounces.soft_bounces) / data.emails_sent * 100).toFixed(2),
                    opens: data.opens.opens_total,
                    uniqueOpens: data.opens.unique_opens,
                    openRate: (data.opens.open_rate * 100).toFixed(2),
                    clicks: data.clicks.clicks_total,
                    uniqueClicks: data.clicks.unique_clicks,
                    clickRate: (data.clicks.click_rate * 100).toFixed(2),
                    unsubscribes: data.unsubscribed,
                    bounces: data.bounces.hard_bounces + data.bounces.soft_bounces,
                    sendTime: data.send_time,
                    timeseries: data.timeseries || []
                }
            };

        } catch (error) {
            console.error('❌ Failed to get detailed campaign report:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get click tracking data for campaign
     */
    async getClickTrackingData(campaignId) {
        try {
            const response = await fetch(`${this.baseUrl}/reports/${campaignId}/click-details`, {
                method: 'GET',
                headers: this.headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to get click tracking data');
            }

            return {
                success: true,
                clickData: data.urls_clicked.map(url => ({
                    id: url.id,
                    url: url.url,
                    totalClicks: url.total_clicks,
                    uniqueClicks: url.unique_clicks,
                    clickPercentage: url.click_percentage
                }))
            };

        } catch (error) {
            console.error('❌ Failed to get click tracking data:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all campaigns with basic stats
     */
    async getAllCampaigns(count = 50, status = null) {
        try {
            let url = `${this.baseUrl}/campaigns?count=${count}&sort_field=create_time&sort_dir=DESC`;
            
            if (status) {
                url += `&status=${status}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: this.headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to get campaigns');
            }

            return {
                success: true,
                campaigns: data.campaigns.map(campaign => ({
                    id: campaign.id,
                    webId: campaign.web_id,
                    title: campaign.settings.title,
                    subjectLine: campaign.settings.subject_line,
                    status: campaign.status,
                    emailsSent: campaign.emails_sent,
                    sendTime: campaign.send_time,
                    createTime: campaign.create_time
                }))
            };

        } catch (error) {
            console.error('❌ Failed to get campaigns:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create A/B test campaign
     */
    async createABTestCampaign(testData) {
        try {
            const campaign = {
                type: 'variate',
                recipients: {
                    list_id: testData.audienceId
                },
                variate_settings: {
                    winning_criteria: testData.winningCriteria || 'opens', // 'opens', 'clicks', 'manual'
                    winner_criteria_value: testData.winnerCriteriaValue || 'opens',
                    wait_time: testData.waitTime || 60, // minutes
                    test_size: testData.testSize || 25, // percentage
                    subject_lines: testData.subjectLines // array of subject lines
                },
                settings: {
                    title: testData.campaignTitle,
                    from_name: testData.fromName,
                    reply_to: testData.replyTo
                }
            };

            const response = await fetch(`${this.baseUrl}/campaigns`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(campaign)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to create A/B test campaign');
            }

            console.log('✅ A/B test campaign created successfully:', data.id);
            return {
                success: true,
                campaignId: data.id,
                testSettings: data.variate_settings
            };

        } catch (error) {
            console.error('❌ Failed to create A/B test campaign:', error);
            return { success: false, error: error.message };
        }
    }
}

// Utility functions
const MailchimpUtils = {
    /**
     * Format campaign data for easy consumption
     */
    formatCampaignData(rawData) {
        return {
            campaignId: rawData.campaignInfo?.id,
            title: rawData.campaignInfo?.title,
            subjectLine: rawData.campaignInfo?.subjectLine,
            status: rawData.campaignInfo?.status,
            sendTime: rawData.campaignInfo?.sendTime,
            emailsSent: rawData.stats?.emailsSent || 0,
            delivered: rawData.stats?.delivered || 0,
            opens: rawData.stats?.opens || 0,
            uniqueOpens: rawData.stats?.uniqueOpens || 0,
            openRate: ((rawData.stats?.openRate || 0) * 100).toFixed(2),
            clicks: rawData.stats?.clicks || 0,
            uniqueClicks: rawData.stats?.uniqueClicks || 0,
            clickRate: ((rawData.stats?.clickRate || 0) * 100).toFixed(2),
            unsubscribes: rawData.stats?.unsubscribes || 0,
            bounces: rawData.stats?.bounces || 0,
            deliveryRate: rawData.stats?.delivered ? 
                ((rawData.stats.delivered / rawData.stats.emailsSent) * 100).toFixed(2) : '0'
        };
    },

    /**
     * Calculate performance improvements between campaigns
     */
    calculateImprovement(baseline, optimized) {
        const improvements = {};
        
        ['openRate', 'clickRate', 'deliveryRate'].forEach(metric => {
            const baseValue = parseFloat(baseline[metric]) || 0;
            const optValue = parseFloat(optimized[metric]) || 0;
            
            if (baseValue > 0) {
                improvements[metric] = {
                    baseline: baseValue,
                    optimized: optValue,
                    improvement: ((optValue - baseValue) / baseValue * 100).toFixed(2),
                    absolute: (optValue - baseValue).toFixed(2)
                };
            }
        });
        
        return improvements;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MailchimpIntegration, MailchimpUtils };
}

// Example usage:
/*
const mailchimp = new MailchimpIntegration('your-api-key', 'us1');

// Test connection
mailchimp.authenticateAndGetAccount()
    .then(result => console.log(result));

// Create and send campaign
async function createAndSendCampaign() {
    const campaignData = {
        audienceId: 'your-audience-id',
        subjectLine: 'Test Campaign Subject',
        campaignTitle: 'Test Campaign',
        fromName: 'Your Name',
        replyTo: 'your-email@domain.com'
    };
    
    const campaign = await mailchimp.createCampaign(campaignData);
    if (campaign.success) {
        await mailchimp.setCampaignContent(campaign.campaignId, htmlContent);
        await mailchimp.sendCampaign(campaign.campaignId);
    }
}
*/
