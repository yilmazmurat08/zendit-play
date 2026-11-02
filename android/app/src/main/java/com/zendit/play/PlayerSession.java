package com.zendit.play;

import java.util.Collections;
import java.util.List;

/* loaded from: classes7.dex */
final class PlayerSession {
    private static int startIndex;
    private static List<PlayerItem> items = Collections.emptyList();
    private static PlayerConfig config = new PlayerConfig();

    private PlayerSession() {
    }

    static synchronized void set(List<PlayerItem> newItems, int newStartIndex, PlayerConfig newConfig) {
        items = newItems;
        startIndex = Math.max(0, Math.min(newStartIndex, newItems.size() - 1));
        config = newConfig;
    }

    static synchronized List<PlayerItem> items() {
        return items;
    }

    static synchronized int startIndex() {
        return startIndex;
    }

    static synchronized PlayerConfig config() {
        return config;
    }
}
