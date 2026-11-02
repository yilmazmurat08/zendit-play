package com.zendit.play;

import java.util.Locale;
import java.util.TimeZone;
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

    /* JADX WARN: Removed duplicated region for block: B:44:0x0100 A[PHI: r16
      0x0100: PHI (r16v16 char) = 
      (r16v3 char)
      (r16v4 char)
      (r16v5 char)
      (r16v6 char)
      (r16v7 char)
      (r16v8 char)
      (r16v9 char)
      (r16v10 char)
      (r16v11 char)
      (r16v12 char)
      (r16v13 char)
      (r16v14 char)
      (r16v17 char)
     binds: [B:42:0x00fb, B:39:0x00ee, B:36:0x00e1, B:33:0x00d4, B:30:0x00c8, B:27:0x00bb, B:24:0x00ae, B:21:0x00a1, B:18:0x0093, B:15:0x0086, B:12:0x0078, B:9:0x006a, B:7:0x005e] A[DONT_GENERATE, DONT_INLINE]] */
    /*
        Code decompiled incorrectly, please refer to instructions dump.
        To view partially-correct add '--show-bad-code' argument
    */
    static java.lang.String build(java.lang.String r25, java.lang.String r26, long r27, long r29, long r31) {
        /*
            Method dump skipped, instructions count: 488
            To view this dump add '--comments-level debug' option
        */
        throw new UnsupportedOperationException("Method not decompiled: com.zendit.play.CatchupUrl.build(java.lang.String, java.lang.String, long, long, long):java.lang.String");
    }
}
