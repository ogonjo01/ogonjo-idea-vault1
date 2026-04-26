const { BetaAnalyticsDataClient } = require('@google-analytics/data');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const period = event.queryStringParameters?.period || 'Week';
    const periodDays = { Today: 1, Week: 7, Month: 30, Year: 365 };
    const days = periodDays[period] || 7;

    const credentials = {
      client_email: process.env.GA4_CLIENT_EMAIL,
      private_key: process.env.GA4_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };

    const client = new BetaAnalyticsDataClient({ credentials });
    const propertyId = process.env.GA4_PROPERTY_ID;

    const [sourcesResponse, summaryResponse] = await Promise.all([
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
        ],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
      }),
    ]);

    const sources = (sourcesResponse[0].rows || []).map(row => ({
      source: row.dimensionValues[0].value,
      medium: row.dimensionValues[1].value,
      sessions: parseInt(row.metricValues[0].value),
    }));

    const summaryRow = summaryResponse[0].rows?.[0];
    const totalSessions = parseInt(summaryRow?.metricValues[0]?.value || 0);
    const totalUsers    = parseInt(summaryRow?.metricValues[1]?.value || 0);
    const avgDuration   = parseFloat(summaryRow?.metricValues[2]?.value || 0);
    const bounceRate    = parseFloat(summaryRow?.metricValues[3]?.value || 0);

    const mins = Math.floor(avgDuration / 60);
    const secs = Math.round(avgDuration % 60);
    const avgSessionDuration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessions: totalSessions,
        users: totalUsers,
        avgSessionDuration,
        bounceRate: bounceRate.toFixed(1),
        sources,
      }),
    };
  } catch (err) {
    console.error('GA4 function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};