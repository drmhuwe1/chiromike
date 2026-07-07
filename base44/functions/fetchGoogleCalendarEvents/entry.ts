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

    // Fetch all calendars the user has access to (including shared/checked ones)
    const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50', { headers: authHeader });
    if (!calListRes.ok) {
      console.error('Failed to fetch calendar list:', calListRes.status, await calListRes.text());
      return Response.json({ error: 'Failed to fetch calendar list' }, { status: calListRes.status });
    }
    const calListData = await calListRes.json();
    const calendars = (calListData.items || []).filter(c => c.selected !== false);

    // Fetch events from all calendars in parallel
    const allEventArrays = await Promise.all(
      calendars.map(async (cal) => {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${start}&timeMax=${end}&maxResults=100&singleEvents=true&orderBy=startTime`;
        const res = await fetch(url, { headers: authHeader });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).map(event => ({
          id: event.id,
          title: event.summary || 'Untitled',
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          description: event.description || '',
          location: event.location || '',
          htmlLink: event.htmlLink,
          calendarName: cal.summary || cal.id,
          source: 'google_calendar'
        }));
      })
    );

    // Deduplicate by event id
    const seen = new Set();
    const events = allEventArrays.flat().filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    return Response.json({ events });
  } catch (error) {
    console.error('Error fetching calendar:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});