import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const runtimeEnv = (locals as any)?.runtime?.env;
  const icalUrl = runtimeEnv?.ICAL_URL || import.meta.env.ICAL_URL;

  if (!icalUrl) {
    return new Response(
      JSON.stringify({ blocked: [], error: 'ICAL_URL not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const response = await fetch(icalUrl);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ blocked: [], error: `iCal fetch failed: ${response.status}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const icalText = await response.text();

    // Parsear iCal manualmente (más confiable que ical.js)
    const blockedDates: string[] = [];
    const lines = icalText.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === 'BEGIN:VEVENT') {
        let startDate = '';
        let endDate = '';

        // Buscar DTSTART y DTEND dentro del evento
        for (let j = i + 1; j < lines.length && j < i + 15; j++) {
          const eventLine = lines[j].trim();

          // DTSTART;VALUE=DATE:20260910
          const startMatch = eventLine.match(/^DTSTART(?:;[^:]*)?:(\d{8})/);
          if (startMatch) {
            const raw = startMatch[1];
            startDate = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
          }

          // DTEND;VALUE=DATE:20260911
          const endMatch = eventLine.match(/^DTEND(?:;[^:]*)?:(\d{8})/);
          if (endMatch) {
            const raw = endMatch[1];
            endDate = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
          }

          if (eventLine === 'END:VEVENT') break;
        }

        // Generar todas las fechas bloqueadas entre start y end
        if (startDate && endDate) {
          const current = new Date(startDate + 'T00:00:00');
          const end = new Date(endDate + 'T00:00:00');

          while (current < end) {
            const dateStr = current.toISOString().split('T')[0];
            if (!blockedDates.includes(dateStr)) {
              blockedDates.push(dateStr);
            }
            current.setDate(current.getDate() + 1);
          }
        }
      }
    }

    blockedDates.sort();

    return new Response(
      JSON.stringify({ blocked: blockedDates }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error) {
    console.error('iCal error:', error);
    return new Response(
      JSON.stringify({ blocked: [], error: 'Failed to parse calendar' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
