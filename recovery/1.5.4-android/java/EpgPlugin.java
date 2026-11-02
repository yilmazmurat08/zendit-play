package com.zendit.play;

import androidx.media3.extractor.text.ttml.TtmlNode;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.zendit.play.EpgStore;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "Epg")
/* loaded from: classes7.dex */
public class EpgPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void load(final PluginCall call) {
        final List<String> sources = new ArrayList<>();
        JSArray rawSources = call.getArray("sources", new JSArray());
        for (int i = 0; i < rawSources.length(); i++) {
            String url = rawSources.optString(i, "");
            if (!url.isEmpty()) {
                sources.add(url);
            }
        }
        final List<EpgStore.ChannelRef> channels = new ArrayList<>();
        JSArray rawChannels = call.getArray("channels", new JSArray());
        for (int i2 = 0; i2 < rawChannels.length(); i2++) {
            JSONObject c = rawChannels.optJSONObject(i2);
            if (c != null) {
                channels.add(new EpgStore.ChannelRef(c.optString(TtmlNode.ATTR_ID), c.optString("epgId", ""), c.optString("name", ""), c.optInt("archiveHours", 0)));
            }
        }
        final boolean force = Boolean.TRUE.equals(call.getBoolean("force", false));
        final long maxAgeMs = 3600000 * Math.max(1, call.getData().optInt("maxAgeHours", 12));
        final int offsetMinutes = call.getData().optInt("offsetMinutes", 0);
        final int pastHours = call.getData().optInt("pastHours", 3);
        final int futureHours = call.getData().optInt("futureHours", 30);
        this.executor.execute(new Runnable() { // from class: com.zendit.play.EpgPlugin$$ExternalSyntheticLambda0
            @Override // java.lang.Runnable
            public final void run() throws Throwable {
                this.f$0.lambda$load$0(sources, channels, offsetMinutes, force, maxAgeMs, pastHours, futureHours, call);
            }
        });
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$load$0(List sources, List channels, int offsetMinutes, boolean force, long maxAgeMs, int pastHours, int futureHours, PluginCall call) throws Throwable {
        EpgStore.Summary s = EpgStore.get(getContext()).load(sources, channels, offsetMinutes, force, maxAgeMs, pastHours, futureHours);
        JSObject result = new JSObject();
        result.put("programmes", s.programmes);
        result.put("channels", s.channels);
        result.put("updatedAt", s.updatedAt);
        result.put("fromCache", s.fromCache);
        result.put("error", s.error);
        call.resolve(result);
    }

    @PluginMethod
    public void query(PluginCall pluginCall) throws JSONException {
        JSArray ids;
        long now;
        int i;
        EpgStore store;
        JSArray ids2 = pluginCall.getArray("ids", new JSArray());
        long now2 = System.currentTimeMillis();
        long from = pluginCall.getData().optLong("from", now2);
        long to = pluginCall.getData().optLong("to", 86400000 + now2);
        int limit = Math.max(1, Math.min(500, pluginCall.getData().optInt("limit", 2)));
        EpgStore store2 = EpgStore.get(getContext());
        JSObject jSObject = new JSObject();
        int i2 = 0;
        while (i2 < ids2.length()) {
            String id = ids2.optString(i2, "");
            if (id.isEmpty()) {
                ids = ids2;
                now = now2;
                i = i2;
                store = store2;
            } else {
                List<EpgStore.Programme> programmes = store2.range(id, from, to, limit);
                if (programmes.isEmpty()) {
                    ids = ids2;
                    now = now2;
                    i = i2;
                    store = store2;
                } else {
                    JSArray list = new JSArray();
                    for (EpgStore.Programme p : programmes) {
                        JSArray ids3 = ids2;
                        JSObject o = new JSObject();
                        long now3 = now2;
                        int i3 = i2;
                        EpgStore store3 = store2;
                        o.put(TtmlNode.START, p.start);
                        o.put("stop", p.stop);
                        o.put("title", p.title);
                        if (!p.desc.isEmpty()) {
                            o.put("desc", p.desc);
                        }
                        list.put(o);
                        store2 = store3;
                        ids2 = ids3;
                        now2 = now3;
                        i2 = i3;
                    }
                    ids = ids2;
                    now = now2;
                    i = i2;
                    store = store2;
                    jSObject.put(id, (Object) list);
                }
            }
            i2 = i + 1;
            store2 = store;
            ids2 = ids;
            now2 = now;
        }
        JSObject jSObject2 = new JSObject();
        jSObject2.put("items", (Object) jSObject);
        pluginCall.resolve(jSObject2);
    }

    @PluginMethod
    public void status(PluginCall call) throws JSONException {
        EpgStore store = EpgStore.get(getContext());
        JSObject result = new JSObject();
        result.put("programmes", store.programmeCount());
        result.put("channels", store.channelCount());
        result.put("updatedAt", store.updatedAt());
        result.put("loading", store.isLoading());
        result.put("error", store.lastError());
        result.put("cacheBytes", store.cacheBytes());
        call.resolve(result);
    }

    @PluginMethod
    public void clear(final PluginCall call) {
        this.executor.execute(new Runnable() { // from class: com.zendit.play.EpgPlugin$$ExternalSyntheticLambda1
            @Override // java.lang.Runnable
            public final void run() {
                this.f$0.lambda$clear$1(call);
            }
        });
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$clear$1(PluginCall call) {
        EpgStore.get(getContext()).clear();
        call.resolve();
    }

    @Override // com.getcapacitor.Plugin
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        this.executor.shutdown();
    }
}
