package com.zendit.play;

import org.json.JSONObject;

/* loaded from: classes7.dex */
final class PlayerConfig {
    String bufferSize = "normal";
    boolean hardwareAcceleration = true;
    String audioLanguage = "auto";
    String subtitleLanguage = "none";
    float subtitleScale = 1.0f;
    String aspectMode = "fit";
    boolean autoPlayNext = true;

    PlayerConfig() {
    }

    static PlayerConfig fromJson(JSONObject o) {
        PlayerConfig c = new PlayerConfig();
        if (o == null) {
            return c;
        }
        c.bufferSize = o.optString("bufferSize", c.bufferSize);
        c.hardwareAcceleration = o.optBoolean("hardwareAcceleration", c.hardwareAcceleration);
        c.audioLanguage = o.optString("audioLanguage", c.audioLanguage);
        c.subtitleLanguage = o.optString("subtitleLanguage", c.subtitleLanguage);
        c.subtitleScale = (float) o.optDouble("subtitleScale", c.subtitleScale);
        c.aspectMode = o.optString("aspectMode", c.aspectMode);
        c.autoPlayNext = o.optBoolean("autoPlayNext", c.autoPlayNext);
        return c;
    }
}
