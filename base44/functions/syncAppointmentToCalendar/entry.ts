import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointment_id } = await req.json();

    if (!appointment_id) {
      return Response.json({ error: 'Missing appointment_id' }, { status: 400 });
    }

    // Fetch appointment
    const appointments = await base44.asServiceRole.entities.Appointment.filter({ id: appointment_id });
    if (!appointments[0]) {
      return Response.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const appointment = appointments[0];

    // Get Google Calendar access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    if (!accessToken) {
      return Response.json({ error: 'Gmail not authorized. Please connect Gmail in settings.' }, { status: 400 });
    }

    // Calculate end time
    const startTime = new Date(appointment.appointment_date);
    const endTime = new Date(startTime.getTime() + (appointment.duration_minutes || 30) * 60000);

    // Create Google Calendar event
    const eventBody = {
      summary: `${appointment.patient_name} - ${appointment.appointment_type || 'Visit'}`,
      description: appointment.notes || `Patient: ${appointment.patient_name}\nType: ${appointment.appointment_type}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/New_York'
      },
      attendees: [
        { email: 'drahuwe@gmail.com', responseStatus: 'needsAction' }
      ]
    };

    const calendarRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody)
    });

    if (!calendarRes.ok) {
      const error = await calendarRes.text();
      console.error('Google Calendar API error:', error);
      return Response.json({ error: 'Failed to create calendar event', details: error }, { status: 500 });
    }

    const calendarEvent = await calendarRes.json();

    // Update appointment with calendar event ID
    await base44.asServiceRole.entities.Appointment.update(appointment_id, {
      google_calendar_event_id: calendarEvent.id,
      synced_to_calendar: true,
      synced_at: new Date().toISOString()
    });

    console.log(`Appointment synced to calendar. Event ID: ${calendarEvent.id}`);

    return Response.json({
      success: true,
      event_id: calendarEvent.id,
      calendar_link: calendarEvent.htmlLink
    });
  } catch (error) {
    console.error('Error syncing appointment:', error.message);
    return Response.json({ error: error.message || 'Failed to sync appointment' }, { status: 500 });
  }
});