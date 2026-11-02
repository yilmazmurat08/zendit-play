package com.zendit.play;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/** CatchupUrl.build was rewritten by hand from the 1.5.4 bytecode; these pin its token rules. */
public class CatchupUrlTest {
    // 7 Oct 2026 18:00:00 UTC = 21:00 in Istanbul (UTC+3); 1h programme; "now" 30 min after the end.
    private static final long START = 1791396000000L;
    private static final long STOP = START + 3600_000L;
    private static final long NOW = STOP + 1800_000L;

    @Test
    public void xtreamTimeshiftUsesProviderTimeZoneAndMinutes() {
        String url = CatchupUrl.build("http://h:8080/timeshift/u/p/{dur_min}/{start_xc}/42.ts", "Europe/Istanbul", START, STOP, NOW);
        assertEquals("http://h:8080/timeshift/u/p/60/2026-10-07:21-00/42.ts", url);
    }

    @Test
    public void epochAndDurationTokens() {
        String url = CatchupUrl.build("x?utc={utc}&end={utcend}&now={lutc}&off={offset}&s={dur_sec}", "UTC", START, STOP, NOW);
        assertEquals("x?utc=1791396000&end=1791399600&now=1791401400&off=5400&s=3600", url);
    }

    @Test
    public void dateTokensAndMinimumDuration() {
        String url = CatchupUrl.build("{Y}/{m}/{d}/{H}{M}{S}-{dur_min}", "UTC", START, START + 10_000L, NOW);
        assertEquals("2026/10/07/180000-1", url);
    }

    @Test
    public void unknownZoneFallsBackToDevice() {
        assertEquals(java.util.TimeZone.getDefault().getID(), CatchupUrl.zone("Mars/Base").getID());
        assertEquals("UTC", CatchupUrl.zone("UTC").getID());
    }
}
