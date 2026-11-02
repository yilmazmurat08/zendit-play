package com.zendit.play;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/* loaded from: classes7.dex */
final class CatchupUrl {
    private static final Pattern TOKEN = Pattern.compile("\\{(utcend|utc|lutc|offset|dur_sec|dur_min|start_xc|Y|m|d|H|M|S)\\}");

    private CatchupUrl() {
    }

    static TimeZone zone(String id) {
        if (id == null || id.trim().isEmpty()) {
            return TimeZone.getDefault();
        }
        TimeZone tz = TimeZone.getTimeZone(id.trim());
        if ("GMT".equals(tz.getID()) && !id.trim().toUpperCase(Locale.ROOT).startsWith("GMT") && !"UTC".equalsIgnoreCase(id.trim())) {
            return TimeZone.getDefault();
        }
        return tz;
    }

    /**
     * Fills a catch-up address template for one programme. Times are epoch milliseconds; the date tokens use the
     * provider's time zone ({@link #zone}). Tokens: utc / utcend (start / end, seconds), lutc (now), offset (seconds
     * since the start), dur_sec / dur_min (length, at least a minute), start_xc (Xtream "Y-m-d:H-M"), Y m d H M S.
     */
    static String build(String template, String timeZone, long startMs, long stopMs, long nowMs) {
        long start = startMs / 1000;
        long stop = stopMs / 1000;
        long duration = Math.max(60, stop - start);
        long now = nowMs / 1000;
        SimpleDateFormat format = new SimpleDateFormat("yyyy|MM|dd|HH|mm|ss", Locale.ROOT);
        format.setTimeZone(zone(timeZone));
        String[] date = format.format(new Date(startMs)).split("\\|");
        Matcher m = TOKEN.matcher(template);
        StringBuffer out = new StringBuffer();
        while (m.find()) {
            String value;
            switch (m.group(1)) {
                case "utc": value = String.valueOf(start); break;
                case "utcend": value = String.valueOf(stop); break;
                case "lutc": value = String.valueOf(now); break;
                case "offset": value = String.valueOf(Math.max(0, now - start)); break;
                case "dur_sec": value = String.valueOf(duration); break;
                case "dur_min": value = String.valueOf((duration + 59) / 60); break;
                case "start_xc": value = date[0] + "-" + date[1] + "-" + date[2] + ":" + date[3] + "-" + date[4]; break;
                case "Y": value = date[0]; break;
                case "m": value = date[1]; break;
                case "d": value = date[2]; break;
                case "H": value = date[3]; break;
                case "M": value = date[4]; break;
                default: value = date[5]; break;
            }
            m.appendReplacement(out, Matcher.quoteReplacement(value));
        }
        m.appendTail(out);
        return out.toString();
    }
}
