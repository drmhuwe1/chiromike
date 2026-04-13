import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { startDate, endDate } = await req.json();
    const start = new Date(startDate).toISOString();
    const end = new Date(endDate).toISOString();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&maxResults=100&singleEvents=true&orderBy=startTime`;
    const res = await fetch(url, { headers: authHeader });

    if (!res.ok) {
      console.error('Google Calendar API error:', res.status, await res.text());
      return Response.json({ error: 'Failed to fetch calendar events' }, { status: res.status });
    }

    const data = await res.json();
    const events = (data.items || []).map(event => ({
      id: event.id,
      title: event.summary || 'Untitled',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description || '',
      location: event.location || '',
      source: 'google_calendar'
    }));

    return Response.json({ events });
  } catch (error) {
    console.error('Error fetching calendar:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});