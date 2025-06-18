/**
 * Mailchimp API Integration for Email Campaign Funnel Simulation
 * This module handles communication with Mailchimp API for real campaign management
 */

class MailchimpIntegration {
    constructor(apiKey, serverPrefix) {
        this.apiKey = apiKey;
        this.serverPrefix = serverPrefix;
        this.baseUrl = `https://${serverPrefix}.api.mailchimp.com/3.0`;
        this.headers = {
            'Authorization': `apikey ${apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Get all Mailchimp lists (audiences)
     */
    async getLists() {
        try {
            const response = await fetch(`${this.baseUrl}/lists`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.lists;
        } catch (error) {
            console.error('Error fetching Mailchimp lists:', error);
            // Return mock data for simulation
            return this.getMockLists();
        }
    }

    /**
     * Create a new campaign in Mailchimp
     */
    async createCampaign(campaignData) {
        try {
            const mailchimpCampaign = {
                type: 'regular',
                recipients: {
                    list_id: campaignData.listId
                },
                settings: {
                    subject_line: campaignData.subject,
                    from_name: campaignData.fromName || 'Your Company',
                    reply_to: campaignData.replyTo || 'noreply@yourcompany.com',
                    title: campaignData.name
                }
            };

            const response = await fetch(`${this.baseUrl}/campaigns`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(mailchimpCampaign)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const campaign = await response.json();
            
            // Log to Google Sheets
            if (window.sheetsTracker) {
                window.sheetsTracker.logCampaignCreation(campaign.id, campaignData);
            }

            return campaign;
        } catch (error) {
            console.error('Error creating Mailchimp campaign:', error);
            // Return mock campaign for simulation
            return this.createMockCampaign(campaignData);
        }
    }

    /**
     * Set campaign content
     */
    async setCampaignContent(campaignId, content) {
        try {
            const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/content`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify({
                    html: content.html,
                    plain_text: content.plainText
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error setting campaign content:', error);
            return { status: 'mock_success' };
        }
    }

    /**
     * Send campaign
     */
    async sendCampaign(campaignId) {
        try {
            const response = await fetch(`${this.baseUrl}/campaigns/${campaignId}/actions/send`, {
                method: 'POST',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Log send action to Google Sheets
            if (window.sheetsTracker) {
                window.sheetsTracker.logCampaignSent(campaignId);
            }

            return { status: 'sent' };
        } catch (error) {
            console.error('Error sending campaign:', error);
            return { status: 'mock_sent' };
        }
    }

    /**
     * Get campaign reports
     */
    async getCampaignReports(campaignId) {
        try {
            const response = await fetch(`${this.baseUrl}/reports/${campaignId}`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const report = await response.json();
            
            // Log metrics to Google Sheets
            if (window.sheetsTracker) {
                window.sheetsTracker.logCampaignMetrics(campaignId, report);
            }

            return {
                opens: report.opens.opens_total,
                clicks: report.clicks.clicks_total,
                unsubscribes: report.unsubscribed.unsubscribes,
                bounces: report.bounces.hard_bounces + report.bounces.soft_bounces,
                openRate: report.opens.open_rate * 100,
                clickRate: report.clicks.click_rate * 100
            };
        } catch (error) {
            console.error('Error fetching campaign reports:', error);
            return this.generateMockReports();
        }
    }

    /**
     * Create automation workflow
     */
    async createAutomation(automationData) {
        try {
            const workflow = {
                type: 'drip',
                recipients: {
                    list_id: automationData.listId,
                    segment_opts: automationData.segmentOptions
                },
                settings: {
                    title: automationData.name,
                    from_name: automationData.fromName || 'Your Company',
                    reply_to: automationData.replyTo || 'noreply@yourcompany.com'
                },
                trigger_settings: {
                    workflow_type: 'listSignup'
                }
            };

            const response = await fetch(`${this.baseUrl}/automations`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(workflow)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating automation:', error);
            return this.createMockAutomation(automationData);
        }
    }

    /**
     * Add emails to automation workflow
     */
    async addAutomationEmail(workflowId, emailData) {
        try {
            const email = {
                settings: {
                    subject_line: emailData.subject,
                    title: emailData.title,
                    from_name: emailData.fromName || 'Your Company',
                    reply_to: emailData.replyTo || 'noreply@yourcompany.com'
                },
                delay: {
                    amount: emailData.delayDays,
                    type: 'day'
                }
            };

            const response = await fetch(`${this.baseUrl}/automations/${workflowId}/emails`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(email)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error adding automation email:', error);
            return { id: 'mock_email_' + Date.now() };
        }
    }

    /**
     * Get audience segments
     */
    async getSegments(listId) {
        try {
            const response = await fetch(`${this.baseUrl}/lists/${listId}/segments`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.segments;
        } catch (error) {
            console.error('Error fetching segments:', error);
            return this.getMockSegments();
        }
    }

    // Mock data methods for simulation when API is not available
    getMockLists() {
        return [
            { id: 'mock_list_1', name: 'Main Newsletter', member_count: 2450 },
            { id: 'mock_list_2', name: 'Prospects', member_count: 1820 },
            { id: 'mock_list_3', name: 'Customers', member_count: 3670 },
            { id: 'mock_list_4', name: 'Inactive Users', member_count: 950 }
        ];
    }

    createMockCampaign(campaignData) {
        return {
            id: 'mock_campaign_' + Date.now(),
            web_id: Math.floor(Math.random() * 1000000),
            type: 'regular',
            create_time: new Date().toISOString(),
            archive_url: '#',
            status: 'save',
            emails_sent: 0,
            send_time: null,
            content_type: 'template',
            settings: {
                subject_line: campaignData.subject,
                title: campaignData.name,
                from_name: campaignData.fromName || 'Your Company',
                reply_to: campaignData.replyTo || 'noreply@yourcompany.com'
            }
        };
    }

    createMockAutomation(automationData) {
        return {
            id: 'mock_automation_' + Date.now(),
            workflow_id: 'workflow_' + Date.now(),
            title: automationData.name,
            status: 'save',
            emails_sent: 0,
            create_time: new Date().toISOString()
        };
    }

    generateMockReports() {
        return {
            opens: Math.floor(Math.random() * 500) + 100,
            clicks: Math.floor(Math.random() * 100) + 20,
            unsubscribes: Math.floor(Math.random() * 10) + 1,
            bounces: Math.floor(Math.random() * 20) + 5,
            openRate: Math.floor(Math.random() * 30) + 15,
            clickRate: Math.floor(Math.random() * 8) + 2
        };
    }

    getMockSegments() {
        return [
            { id: 'seg_1', name: 'New Leads', member_count: 2450 },
            { id: 'seg_2', name: 'Qualified Prospects', member_count: 1820 },
            { id: 'seg_3', name: 'Existing Customers', member_count: 3670 },
            { id: 'seg_4', name: 'Inactive Users', member_count: 950 }
        ];
    }

    /**
     * Sync campaign data with local storage
     */
    syncWithLocalData(campaigns) {
        campaigns.forEach(campaign => {
            if (campaign.mailchimpId) {
                this.getCampaignReports(campaign.mailchimpId).then(reports => {
                    campaign.metrics = {
                        ...campaign.metrics,
                        openRate: reports.openRate,
                        clickRate: reports.clickRate,
                        leads: reports.clicks
                    };
                });
            }
        });
    }
}

// Initialize Mailchimp integration when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize with demo credentials (replace with real ones)
    window.mailchimpIntegration = new MailchimpIntegration('demo-api-key', 'us1');
    
    console.log('Mailchimp Integration initialized');
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MailchimpIntegration;
}
