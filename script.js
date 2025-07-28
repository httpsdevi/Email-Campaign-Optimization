// Global data store
let allCampaigns = [];
let allABTests = [];
let allMonthlyPerformance = [];

// --- Utility Functions ---
function showToast(message, duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Trigger reflow to enable transition
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('open');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
}

// --- Data Simulation Module ---
// This module currently generates mock data. In a real application, this would
// be replaced by fetch calls to a Python backend API.
const DataSimulator = (() => {
    const generateRandomNumber = (min, max) => (Math.random() * (max - min) + min);
    const generateRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

    const sampleEmailContents = [
        `<p>Hi there,</p><p>We have an exciting new update for you! Check out our latest features designed to boost your productivity.</p><p>Best,</p><p>The Team</p>`,
        `<p>Hello Valued Customer,</p><p>Don't miss out on our exclusive summer sale! Get up to 50% off on selected items for a limited time.</p><p>Shop now!</p>`,
        `<p>Greetings,</p><p>Your weekly dose of marketing insights is here. Learn strategies to optimize your campaigns and drive growth.</p><p>Read more on our blog.</p>`,
        `<p>Dear User,</p><p>We noticed you haven't completed your profile. Finish setting up to unlock all premium features!</p><p>Complete your profile.</p>`,
        `<p>Hey,</p><p>A quick reminder about our upcoming webinar on 'Mastering Email Automation'. Register today to secure your spot!</p><p>See you there,</p><p>The Marketing Squad</p>`
    ];

    // Generates a single mock campaign
    const generateCampaign = (id) => {
        const recipients = Math.floor(generateRandomNumber(500, 10000));
        const openRate = generateRandomNumber(0.20, 0.45); // 20-45%
        const ctr = generateRandomNumber(0.02, 0.08);    // 2-8%
        const conversionRate = generateRandomNumber(0.01, 0.05); // 1-5%
        const sendDate = generateRandomDate(new Date(2024, 0, 1), new Date()); // From Jan 1, 2024 to now

        const campaignNames = [
            "Weekly Marketing Insights",
            "Product Update: New Features!",
            "Exclusive Offer Just For You",
            "Unlock Your Growth Potential",
            "Q3 Newsletter: Deep Dive",
            "Flash Sale Alert!",
            "Your Personalized Recommendations",
            "Tips for Boosting Conversions",
            "Webinar Invitation: Master Email Marketing",
            "Customer Feedback Survey"
        ];
        const subjectLineEmojis = ["", "🚀", "💡", "✨", "📈", "🎁", "🔥"];
        const campaignName = `${campaignNames[Math.floor(Math.random() * campaignNames.length)]} ${subjectLineEmojis[Math.floor(Math.random() * subjectLineEmojis.length)]}`;
        const subjectLine = `${campaignName}`; // Subject line is the campaign name for simplicity here

        const audienceSegments = ["All Subscribers", "Engaged Users", "New Signups", "Churn Risk"];

        return {
            id: `campaign-${id}`,
            name: campaignName,
            subjectLine: subjectLine,
            audienceSegment: audienceSegments[Math.floor(Math.random() * audienceSegments.length)],
            emailContent: sampleEmailContents[Math.floor(Math.random() * sampleEmailContents.length)],
            sendDate: sendDate.toISOString().split('T')[0], // YYYY-MM-DD
            recipients: recipients,
            openRate: parseFloat(openRate.toFixed(3)),
            ctr: parseFloat(ctr.toFixed(3)),
            conversionRate: parseFloat(conversionRate.toFixed(3)),
            isABTest: false
        };
    };

    // Generates mock A/B test data
    const generateABTest = (id) => {
        const testType = Math.random() > 0.5 ? "Subject Line" : "CTA";
        let variantA, variantB;
        let openRateA, openRateB, ctrA, ctrB, conversionRateA, conversionRateB;

        if (testType === "Subject Line") {
            variantA = "Your Weekly Update";
            variantB = "🚀 This Week's Marketing Wins!";
            openRateA = generateRandomNumber(0.25, 0.35);
            openRateB = openRateA * generateRandomNumber(1.1, 1.25); // B is 10-25% better
            ctrA = generateRandomNumber(0.03, 0.05);
            ctrB = ctrA * generateRandomNumber(1.05, 1.15);
            conversionRateA = generateRandomNumber(0.015, 0.03);
            conversionRateB = conversionRateA * generateRandomNumber(1.02, 1.08);
        } else { // CTA Test
            variantA = "Learn More (Text Link)";
            variantB = "Discover Now! (Button)";
            openRateA = generateRandomNumber(0.30, 0.40);
            openRateB = openRateA * generateRandomNumber(0.95, 1.05); // Open rates similar
            ctrA = generateRandomNumber(0.03, 0.045);
            ctrB = ctrA * generateRandomNumber(1.15, 1.35); // B is 15-35% better
            conversionRateA = generateRandomNumber(0.01, 0.025);
            conversionRateB = conversionRateA * generateRandomNumber(1.1, 1.2);
        }

        const sampleSize = Math.floor(generateRandomNumber(800, 1500));
        const sendDate = generateRandomDate(new Date(2024, 3, 1), new Date()); // From April 1, 2024 to now

        return {
            id: `abtest-${id}`,
            name: `A/B Test: ${testType} #${id}`,
            type: testType,
            sendDate: sendDate.toISOString().split('T')[0],
            variantA: {
                label: variantA,
                recipients: sampleSize,
                openRate: parseFloat(openRateA.toFixed(3)),
                ctr: parseFloat(ctrA.toFixed(3)),
                conversionRate: parseFloat(conversionRateA.toFixed(3))
            },
            variantB: {
                label: variantB,
                recipients: sampleSize,
                openRate: parseFloat(openRateB.toFixed(3)),
                ctr: parseFloat(ctrB.toFixed(3)),
                conversionRate: parseFloat(conversionRateB.toFixed(3))
            },
            isABTest: true
        };
    };

    // Generates mock monthly performance data for charts
    const generateMonthlyPerformance = () => {
        const data = [];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]; // Up to current month
        let baseOpenRate = 0.30;
        let baseCTR = 0.04;
        let baseConversionRate = 0.02;

        months.forEach((month, index) => {
            // Simulate slight variations and an overall upward trend
            baseOpenRate += generateRandomNumber(-0.01, 0.02);
            baseCTR += generateRandomNumber(-0.005, 0.008);
            baseConversionRate += generateRandomNumber(-0.002, 0.005);

            data.push({
                month: month,
                openRate: parseFloat(Math.min(0.5, Math.max(0.2, baseOpenRate)).toFixed(3)),
                ctr: parseFloat(Math.min(0.09, Math.max(0.02, baseCTR)).toFixed(3)),
                conversionRate: parseFloat(Math.min(0.06, Math.max(0.01, baseConversionRate)).toFixed(3))
            });
        });
        return data;
    };

    // Main function to generate all mock data
    // In a real application, this would involve fetching data from a backend API
    // which would use Pandas for data processing.
    const generateMockData = async (numCampaigns = 15, numABTests = 3) => {
        // Example of how you would fetch data from a backend API:
        /*
        try {
            const response = await fetch('/api/get_campaign_data'); // Hypothetical API endpoint
            const data = await response.json();
            return {
                campaigns: data.campaigns,
                abTests: data.ab_tests,
                monthlyPerformance: data.monthly_performance
            };
        } catch (error) {
            console.error("Error fetching data from backend:", error);
            // Fallback to mock data if API fails or for development
            return {
                campaigns: Array.from({ length: numCampaigns }, (_, i) => generateCampaign(i + 1)),
                abTests: Array.from({ length: numABTests }, (_, i) => generateABTest(i + 1)),
                monthlyPerformance: generateMonthlyPerformance()
            };
        }
        */

        // For this simulation, we continue to use mock data
        const campaigns = [];
        for (let i = 0; i < numCampaigns; i++) {
            campaigns.push(generateCampaign(i + 1));
        }

        const abTests = [];
        for (let i = 0; i < numABTests; i++) {
            abTests.push(generateABTest(i + 1));
        }

        const monthlyPerformance = generateMonthlyPerformance();

        return { campaigns, abTests, monthlyPerformance };
    };

    return {
        generateMockData
    };
})();

// --- UI Renderer Module ---
// This module handles rendering data to the DOM.
const UIRenderer = (() => {
    // Renders the key metric cards
    const renderKeyMetrics = (campaigns, monthlyPerformance) => {
        const totalCampaigns = campaigns.length;
        const avgOpenRate = campaigns.reduce((sum, c) => sum + c.openRate, 0) / totalCampaigns;
        const avgCtr = campaigns.reduce((sum, c) => sum + c.ctr, 0) / totalCampaigns;
        const avgConversionRate = campaigns.reduce((sum, c) => sum + c.conversionRate, 0) / totalCampaigns;

        document.getElementById('total-campaigns').textContent = totalCampaigns;
        document.getElementById('avg-open-rate').textContent = `${(avgOpenRate * 100).toFixed(1)}%`;
        document.getElementById('avg-ctr').textContent = `${(avgCtr * 100).toFixed(1)}%`;
        document.getElementById('avg-conversion-rate').textContent = `${(avgConversionRate * 100).toFixed(1)}%`;

        // Simulate MoM trends for demonstration
        const lastMonth = monthlyPerformance[monthlyPerformance.length - 1];
        const secondLastMonth = monthlyPerformance[monthlyPerformance.length - 2];

        const openRateTrend = ((lastMonth.openRate - secondLastMonth.openRate) / secondLastMonth.openRate * 100).toFixed(1);
        const ctrTrend = ((lastMonth.ctr - secondLastMonth.ctr) / secondLastMonth.ctr * 100).toFixed(1);
        const conversionRateTrend = ((lastMonth.conversionRate - secondLastMonth.conversionRate) / secondLastMonth.conversionRate * 100).toFixed(1);

        document.getElementById('open-rate-trend').textContent = `${Math.abs(openRateTrend)}%`;
        document.getElementById('ctr-trend').textContent = `${Math.abs(ctrTrend)}%`;
        document.getElementById('conversion-rate-trend').textContent = `${Math.abs(conversionRateTrend)}%`;

        // Update trend arrow colors based on positive/negative
        const updateTrendIndicator = (elementId, trendValue) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.parentNode.classList.remove('text-green-600', 'text-red-600');
                if (trendValue >= 0) {
                    element.parentNode.classList.add('text-green-600');
                    element.previousElementSibling.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>';
                } else {
                    element.parentNode.classList.add('text-red-600');
                    element.previousElementSibling.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>';
                }
            }
        };

        updateTrendIndicator('open-rate-trend', openRateTrend);
        updateTrendIndicator('ctr-trend', ctrTrend);
        updateTrendIndicator('conversion-rate-trend', conversionRateTrend);
    };

    // Renders the recent campaigns table
    const renderCampaignsTable = (campaigns) => {
        const tableBody = document.getElementById('campaigns-table-body');
        tableBody.innerHTML = ''; // Clear previous content

        // Sort campaigns by send date, newest first
        const sortedCampaigns = [...campaigns].sort((a, b) => new Date(b.sendDate) - new Date(a.sendDate));

        sortedCampaigns.slice(0, 10).forEach(campaign => { // Show top 10 recent campaigns
            const row = document.createElement('tr');
            row.className = 'table-row hover:bg-indigo-50 transition-colors cursor-pointer'; // Add hover effect and cursor
            row.dataset.campaignId = campaign.id; // Store campaign ID for click event
            row.innerHTML = `
                <td class="whitespace-nowrap font-medium text-gray-900">${campaign.name}</td>
                <td class="whitespace-nowrap text-gray-700">${campaign.sendDate}</td>
                <td class="whitespace-nowrap text-gray-700">${campaign.recipients.toLocaleString()}</td>
                <td class="whitespace-nowrap text-gray-700">${(campaign.openRate * 100).toFixed(1)}%</td>
                <td class="whitespace-nowrap text-gray-700">${(campaign.ctr * 100).toFixed(1)}%</td>
                <td class="whitespace-nowrap text-gray-700">${(campaign.conversionRate * 100).toFixed(1)}%</td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners for opening campaign details
        tableBody.querySelectorAll('.table-row').forEach(row => {
            row.addEventListener('click', (event) => {
                const campaignId = event.currentTarget.dataset.campaignId;
                const campaign = allCampaigns.find(c => c.id === campaignId);
                if (campaign) {
                    displayCampaignDetails(campaign);
                }
            });
        });
    };

    // Displays campaign details in a modal
    const displayCampaignDetails = (campaign) => {
        document.getElementById('detail-campaign-name').textContent = campaign.name;
        document.getElementById('detail-send-date').textContent = campaign.sendDate;
        document.getElementById('detail-recipients').textContent = campaign.recipients.toLocaleString();
        document.getElementById('detail-open-rate').textContent = `${(campaign.openRate * 100).toFixed(1)}%`;
        document.getElementById('detail-ctr').textContent = `${(campaign.ctr * 100).toFixed(1)}%`;
        document.getElementById('detail-conversion-rate').textContent = `${(campaign.conversionRate * 100).toFixed(1)}%`;
        document.getElementById('detail-subject-line').textContent = campaign.subjectLine;
        document.getElementById('detail-audience-segment').textContent = campaign.audienceSegment;
        document.getElementById('detail-email-content-preview').innerHTML = campaign.emailContent; // Render HTML content

        openModal('campaign-detail-modal');
    };


    // Renders the A/B test results
    const renderABTestResults = (abTests) => {
        const container = document.getElementById('ab-test-results');
        container.innerHTML = ''; // Clear previous content

        abTests.forEach(test => {
            const winner = test.variantA.openRate > test.variantB.openRate ? test.variantA : test.variantB;
            const loser = test.variantA.openRate <= test.variantB.openRate ? test.variantA : test.variantB;

            const winnerMetric = (winner.openRate * 100).toFixed(1);
            const loserMetric = (loser.openRate * 100).toFixed(1);
            const percentageDiff = (((winner.openRate - loser.openRate) / loser.openRate) * 100).toFixed(1);

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3 class="text-xl font-semibold text-gray-800 mb-4">${test.name}</h3>
                <p class="text-gray-600 mb-4">Test Type: <span class="font-medium">${test.type}</span> | Sent: ${test.sendDate}</p>

                <div class="grid grid-cols-2 gap-4 text-center mb-6">
                    <div class="p-4 bg-blue-50 rounded-lg">
                        <p class="text-sm text-gray-500">Variant A</p>
                        <p class="font-bold text-lg text-blue-700">${test.variantA.label}</p>
                        <p class="text-sm text-gray-600 mt-2">Open Rate: <span class="font-semibold">${(test.variantA.openRate * 100).toFixed(1)}%</span></p>
                        <p class="text-sm text-gray-600">CTR: <span class="font-semibold">${(test.variantA.ctr * 100).toFixed(1)}%</span></p>
                        <p class="text-sm text-gray-600">Conversions: <span class="font-semibold">${(test.variantA.conversionRate * 100).toFixed(1)}%</span></p>
                    </div>
                    <div class="p-4 bg-purple-50 rounded-lg">
                        <p class="text-sm text-gray-500">Variant B</p>
                        <p class="font-bold text-lg text-purple-700">${test.variantB.label}</p>
                        <p class="text-sm text-gray-600 mt-2">Open Rate: <span class="font-semibold">${(test.variantB.openRate * 100).toFixed(1)}%</span></p>
                        <p class="text-sm text-gray-600">CTR: <span class="font-semibold">${(test.variantB.ctr * 100).toFixed(1)}%</span></p>
                        <p class="text-sm text-gray-600">Conversions: <span class="font-semibold">${(test.variantB.conversionRate * 100).toFixed(1)}%</span></p>
                    </div>
                </div>

                <div class="text-center bg-green-50 text-green-800 p-3 rounded-lg font-medium">
                    <p>Winner: <span class="font-bold">${winner.label}</span> with <span class="font-bold">${winnerMetric}%</span> Open Rate</p>
                    <p class="text-sm mt-1">(${percentageDiff}% better than ${loser.label})</p>
                </div>
            `;
            container.appendChild(card);
        });
    };

    // Renders the performance trend chart using Chart.js
    let performanceChartInstance = null; // Store chart instance to destroy/update
    const renderPerformanceChart = (monthlyPerformance) => {
        const ctx = document.getElementById('performanceChart').getContext('2d');

        if (performanceChartInstance) {
            performanceChartInstance.destroy(); // Destroy previous instance before creating a new one
        }

        const labels = monthlyPerformance.map(d => d.month);
        const openRates = monthlyPerformance.map(d => (d.openRate * 100).toFixed(1));
        const ctrs = monthlyPerformance.map(d => (d.ctr * 100).toFixed(1));
        const conversionRates = monthlyPerformance.map(d => (d.conversionRate * 100).toFixed(1));

        performanceChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Avg. Open Rate (%)',
                        data: openRates,
                        borderColor: '#4f46e5', // Indigo
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Avg. CTR (%)',
                        data: ctrs,
                        borderColor: '#a855f7', // Purple
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Avg. Conversion Rate (%)',
                        data: conversionRates,
                        borderColor: '#f97316', // Orange
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false,
                        text: 'Monthly Campaign Performance'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Percentage (%)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    };

    return {
        renderKeyMetrics,
        renderCampaignsTable,
        renderABTestResults,
        renderPerformanceChart,
        displayCampaignDetails // Expose for external use
    };
})();

// --- Insights Generator Module ---
// This module currently generates simulated insights. In a real application,
// this would involve calling a Python backend API that uses scikit-learn
// for analysis and Pandas for data manipulation to generate these insights.
const InsightsGenerator = (() => {
    let currentInsights = []; // Store current insights to manage dismissal

    const generateInsights = async (campaigns, abTests, monthlyPerformance) => {
        // Example of how you would fetch insights from a backend API:
        /*
        try {
            const response = await fetch('/api/get_actionable_insights', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    campaigns: campaigns,
                    abTests: abTests,
                    monthlyPerformance: monthlyPerformance
                })
            }); // Hypothetical API endpoint
            const data = await response.json();
            currentInsights = data.insights; // Assume backend returns an array of insights
            return currentInsights;
        } catch (error) {
            console.error("Error fetching insights from backend:", error);
            // Fallback to simulated insights if API fails
            // ... (existing simulation logic below)
        }
        */

        const insights = [];

        // Insight 1: Optimal Content/Timing (based on your project description)
        const recentCampaigns = campaigns.filter(c => new Date(c.sendDate) > new Date(new Date().setMonth(new Date().getMonth() - 3))); // Last 3 months
        if (recentCampaigns.length > 0) {
            const highPerformingCampaigns = recentCampaigns.filter(c =>
                c.ctr > 0.05 && (c.name.includes("Weekly") || c.name.includes("Update") || c.name.includes("Wins"))
            );
            if (highPerformingCampaigns.length > 0) {
                insights.push({
                    id: 'insight-1',
                    title: "Optimal Content/Timing Alert",
                    description: "Campaigns focusing on 'Weekly Updates' or 'Marketing Wins' tend to have higher engagement. Consider sending these on Tuesday/Thursday mornings for best results based on simulated data."
                });
            }
        }

        // Insight 2: Subject Line Impact (based on your A/B test simulation)
        const subjectLineTests = abTests.filter(test => test.type === "Subject Line");
        subjectLineTests.forEach((test, index) => {
            const winner = test.variantA.openRate > test.variantB.openRate ? test.variantA : test.variantB;
            const loser = test.variantA.openRate <= test.variantB.openRate ? test.variantA : test.variantB;
            const percentageDiff = (((winner.openRate - loser.openRate) / loser.openRate) * 100).toFixed(0);
            if (percentageDiff > 10) {
                insights.push({
                    id: `insight-2-${index}`,
                    title: `Subject Line Success: "${winner.label}"`,
                    description: `Your A/B test showed that subject line "${winner.label}" increased open rates by ${percentageDiff}% compared to "${loser.label}". Leverage emojis/action-oriented language in future subject lines.`
                });
            }
        });

        // Insight 3: CTA Performance (based on your A/B test simulation)
        const ctaTests = abTests.filter(test => test.type === "CTA");
        ctaTests.forEach((test, index) => {
            const winner = test.variantA.ctr > test.variantB.ctr ? test.variantA : test.variantB;
            const loser = test.variantA.ctr <= test.variantB.ctr ? test.variantA : test.variantB;
            const percentageDiff = (((winner.ctr - loser.ctr) / loser.ctr) * 100).toFixed(0);
            if (percentageDiff > 20) {
                insights.push({
                    id: `insight-3-${index}`,
                    title: `CTA Optimization: "${winner.label}"`,
                    description: `Button CTAs like "${winner.label}" improved click-through rates by ${percentageDiff}% over text links. Prioritize prominent, clear button CTAs in your email designs.`
                });
            }
        });

        // Insight 4: Mobile Optimization (Simulated from general trend)
        if (Math.random() > 0.3) {
            insights.push({
                id: 'insight-4',
                title: "Mobile Engagement Dominance",
                description: "Simulated data suggests over 65% of your audience engages with emails on mobile devices. Ensure all future templates are rigorously tested for mobile responsiveness and readability."
            });
        }

        // Insight 5: Conversion Rate Trend
        if (monthlyPerformance.length >= 2) {
            const lastMonthConversion = monthlyPerformance[monthlyPerformance.length - 1].conversionRate;
            const avgPrevMonthsConversion = monthlyPerformance.slice(0, monthlyPerformance.length - 1)
                                                .reduce((sum, d) => sum + d.conversionRate, 0) / (monthlyPerformance.length - 1);
            if (lastMonthConversion < avgPrevMonthsConversion * 0.9) {
                insights.push({
                    id: 'insight-5-down',
                    title: "Conversion Rate Dip Detected",
                    description: "Your recent conversion rates show a slight decline. Review landing page experiences, offer clarity, and post-click funnels for potential friction points."
                });
            } else if (lastMonthConversion > avgPrevMonthsConversion * 1.05) {
                 insights.push({
                    id: 'insight-5-up',
                    title: "Conversion Rate Improvement!",
                    description: "Great news! Your recent conversion rates have improved. Analyze recent successful campaigns to identify key drivers and replicate winning strategies."
                });
            }
        }

        currentInsights = insights; // Update the stored insights
        return insights;
    };

    // Renders the generated insights to the UI
    const renderInsights = (insightsToRender) => {
        const container = document.getElementById('insights-container');
        container.innerHTML = ''; // Clear previous content

        if (insightsToRender.length === 0) {
            container.innerHTML = '<p class="text-gray-600">No new actionable insights at this moment. Keep optimizing!</p>';
            return;
        }

        insightsToRender.forEach(insight => {
            const insightCard = document.createElement('div');
            insightCard.className = 'insight-card';
            insightCard.dataset.insightId = insight.id; // Add data attribute for dismissal
            insightCard.innerHTML = `
                <div>
                    <h3 class="font-semibold text-gray-800 mb-1">${insight.title}</h3>
                    <p class="text-gray-700">${insight.description}</p>
                </div>
                <button class="text-gray-400 hover:text-gray-600 ml-4" onclick="InsightsGenerator.dismissInsight('${insight.id}')">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            `;
            container.appendChild(insightCard);
        });
    };

    // Dismisses an insight from the UI and internal list
    const dismissInsight = (insightId) => {
        currentInsights = currentInsights.filter(insight => insight.id !== insightId);
        renderInsights(currentInsights); // Re-render insights
        showToast('Insight dismissed!');
    };

    return {
        generateInsights,
        renderInsights,
        dismissInsight // Expose dismiss function
    };
})();


// --- Main Application Logic ---
async function initializeDashboard() { // Made async to await data fetching
    document.getElementById('loading-overlay').classList.remove('hidden'); // Show loading overlay

    setTimeout(async () => { // Simulate loading time, now awaiting data
        // 1. Generate all mock data (or fetch from backend)
        const { campaigns, abTests, monthlyPerformance } = await DataSimulator.generateMockData(15, 3); // 15 campaigns, 3 A/B tests
        allCampaigns = campaigns; // Store globally
        allABTests = abTests;
        allMonthlyPerformance = monthlyPerformance;

        // 2. Render key metrics
        UIRenderer.renderKeyMetrics(allCampaigns, allMonthlyPerformance);

        // 3. Render recent campaigns table
        UIRenderer.renderCampaignsTable(allCampaigns);

        // 4. Render A/B test results
        UIRenderer.renderABTestResults(allABTests);

        // 5. Render performance trend chart
        UIRenderer.renderPerformanceChart(allMonthlyPerformance);

        // 6. Generate and render actionable insights (or fetch from backend)
        const insights = await InsightsGenerator.generateInsights(allCampaigns, allABTests, allMonthlyPerformance);
        InsightsGenerator.renderInsights(insights);

        document.getElementById('loading-overlay').classList.add('hidden'); // Hide loading overlay
        showToast('Dashboard loaded successfully!');

    }, 1500); // Simulate 1.5 seconds loading
}

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Create New Campaign Button
document.getElementById('create-campaign-btn').addEventListener('click', () => {
    openModal('create-campaign-modal');
});

// Handle Create Campaign Form Submission
document.getElementById('create-campaign-form').addEventListener('submit', async (event) => { // Made async
    event.preventDefault(); // Prevent default form submission

    const campaignName = document.getElementById('campaign-name').value;
    const subjectLine = document.getElementById('subject-line').value;
    const audienceSegment = document.getElementById('audience-segment').value;
    const emailContent = document.getElementById('email-content').value;

    // Simulate creating a new campaign
    // In a real scenario, this data would be sent to the Python backend
    // for processing and storage (e.g., in a database).
    /*
    try {
        const response = await fetch('/api/create_campaign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignName, subjectLine, audienceSegment, emailContent })
        });
        const result = await response.json();
        // Assuming backend returns the newly created campaign data
        const newCampaign = result.campaign;
        allCampaigns.unshift(newCampaign); // Add to the beginning of the array
        showToast('Campaign created successfully!', 4000);
    } catch (error) {
        console.error("Error creating campaign via backend:", error);
        showToast('Failed to create campaign.', 4000);
        return; // Stop if backend call fails
    }
    */

    const newCampaign = {
        id: `campaign-${allCampaigns.length + 1}`,
        name: campaignName,
        subjectLine: subjectLine,
        audienceSegment: audienceSegment,
        emailContent: emailContent,
        sendDate: new Date().toISOString().split('T')[0],
        recipients: Math.floor(Math.random() * 5000) + 500, // Random recipients
        openRate: parseFloat(DataSimulator.generateRandomNumber(0.25, 0.40).toFixed(3)),
        ctr: parseFloat(DataSimulator.generateRandomNumber(0.03, 0.07).toFixed(3)),
        conversionRate: parseFloat(DataSimulator.generateRandomNumber(0.015, 0.04).toFixed(3)),
        isABTest: false
    };

    allCampaigns.unshift(newCampaign); // Add to the beginning of the array

    // Re-render relevant sections
    UIRenderer.renderKeyMetrics(allCampaigns, allMonthlyPerformance);
    UIRenderer.renderCampaignsTable(allCampaigns);
    const insights = await InsightsGenerator.generateInsights(allCampaigns, allABTests, allMonthlyPerformance);
    InsightsGenerator.renderInsights(insights);

    closeModal('create-campaign-modal');
    document.getElementById('create-campaign-form').reset(); // Clear form
    showToast('Campaign created successfully!', 4000);
});

// Campaign Search/Filter
document.getElementById('campaign-search').addEventListener('keyup', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredCampaigns = allCampaigns.filter(campaign =>
        campaign.name.toLowerCase().includes(searchTerm) ||
        campaign.subjectLine.toLowerCase().includes(searchTerm)
    );
    UIRenderer.renderCampaignsTable(filteredCampaigns);
});
