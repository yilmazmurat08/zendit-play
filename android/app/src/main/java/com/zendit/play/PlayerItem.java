package com.zendit.play;

import org.json.JSONObject;

/* loaded from: classes7.dex */
final class PlayerItem {
    static final String KIND_CATCHUP = "catchup";
    static final String KIND_LIVE = "live";
    final int archiveDays;
    final String catchup;
    final String catchupTz;
    final String id;
    final String kind;
    final int number;
    final String shortEpgUrl;
    final long startPositionMs;
    final String subtitle;
    final String title;
    final String url;
    final String userAgent;

    PlayerItem(String id, String url, String title, String subtitle, String kind, int number, String userAgent, String shortEpgUrl, long startPositionMs) {
        this(id, url, title, subtitle, kind, number, userAgent, shortEpgUrl, startPositionMs, "", "", 0);
    }

    PlayerItem(String id, String url, String title, String subtitle, String kind, int number, String userAgent, String shortEpgUrl, long startPositionMs, String catchup, String catchupTz, int archiveDays) {
        this.id = id;
        this.url = url;
        this.title = title;
        this.subtitle = subtitle;
        this.kind = kind;
        this.number = number;
        this.userAgent = userAgent;
        this.shortEpgUrl = shortEpgUrl;
        this.startPositionMs = startPositionMs;
        this.catchup = catchup == null ? "" : catchup;
        this.catchupTz = catchupTz != null ? catchupTz : "";
        this.archiveDays = Math.max(0, archiveDays);
    }

    static PlayerItem fromJson(JSONObject o) {
        String url = o.optString("url", "");
        return new PlayerItem(o.optString("id", url), url, o.optString("title", ""), o.optString("subtitle", ""), o.optString("kind", "movie"), o.optInt("number", 0), o.optString("userAgent", ""), o.optString("shortEpgUrl", ""), Math.max(0L, o.optLong("startPositionMs", 0L)), o.optString("catchup", ""), o.optString("catchupTz", ""), o.optInt("archiveDays", 0));
    }

    boolean isLive() {
        return "live".equals(this.kind);
    }

    boolean archiveCovers(long startMs, long nowMs) {
        return isLive() && !this.catchup.isEmpty() && this.archiveDays > 0 && startMs < nowMs && startMs >= nowMs - (((long) this.archiveDays) * 86400000);
    }
}
