package com.zendit.play;

import android.content.Context;
import android.text.TextUtils;
import android.util.Base64;
import android.util.Xml;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;
import org.json.JSONArray;
import org.json.JSONObject;
import org.xmlpull.v1.XmlPullParser;

/* loaded from: classes7.dex */
final class EpgStore {
    private static final int CACHE_VERSION = 2;
    private static final int MAX_DESC_CHARS = 220;
    /** Upper bound on programmes kept in memory; the real limit is scaled to the device (see {@link #programmeLimit}). */
    private static final int MAX_PROGRAMMES = 400000;
    private static volatile int programmeLimit = MAX_PROGRAMMES;
    private static final String USER_AGENT = "ZenditPlay/1.1 (Android)";
    private static EpgStore instance;
    private final File cacheFile;
    private volatile boolean loading;
    private volatile int programmeCount;
    private volatile long updatedAt;
    private static final Pattern PREFIX = Pattern.compile("^\\s*(\\|[a-z]{2,3}\\||\\[[a-z]{2,3}\\]|[a-z]{2,3}\\s*[:|]|[a-z]{2}\\s+-)\\s*");
    private static final Pattern QUALITY = Pattern.compile("\\b(uhd|fhd|hd|sd|4k|8k|hevc|h265|h264|backup|yedek|raw|multi|\\d{3,4}p)\\b");
    private static final Pattern MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]");
    private volatile Map<String, Programme[]> byChannel = Collections.emptyMap();
    private final Map<String, Programme[]> shortEpg = Collections.synchronizedMap(new HashMap());
    private final Map<String, Long> shortEpgFetchedAt = Collections.synchronizedMap(new HashMap());
    private volatile String key = "";
    private volatile String lastError = "";

    static final class Programme {
        final String desc;
        final long start;
        final long stop;
        final String title;

        Programme(long start, long stop, String title, String desc) {
            this.start = start;
            this.stop = stop;
            this.title = title;
            this.desc = desc;
        }
    }

    static final class ChannelRef {
        final int archiveHours;
        final String epgId;
        final String id;
        final String name;

        ChannelRef(String id, String epgId, String name) {
            this(id, epgId, name, 0);
        }

        ChannelRef(String id, String epgId, String name, int archiveHours) {
            this.id = id;
            this.epgId = epgId;
            this.name = name;
            this.archiveHours = Math.max(0, archiveHours);
        }
    }

    static final class Summary {
        int channels;
        String error = "";
        boolean fromCache;
        int programmes;
        long updatedAt;

        Summary() {
        }
    }

    private EpgStore(Context context) {
        this.cacheFile = new File(context.getApplicationContext().getFilesDir(), "epg-cache.bin");
        programmeLimit = programmeLimitFor(context);
    }

    /**
     * A guide with hundreds of thousands of programmes needs well over 100 MB on the Java heap, which
     * kills the app on 1 GB TV sticks. Scale the cap to the heap this device gives one app
     * (about 700 programmes per MB of memory class), and stay lower still on low-RAM devices.
     */
    private static int programmeLimitFor(Context context) {
        try {
            android.app.ActivityManager am = (android.app.ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
            int limit = Math.max(40000, Math.min(MAX_PROGRAMMES, am.getMemoryClass() * 700));
            return am.isLowRamDevice() ? Math.min(limit, 60000) : limit;
        } catch (RuntimeException e) {
            return 100000;
        }
    }

    static synchronized EpgStore get(Context context) {
        if (instance == null) {
            instance = new EpgStore(context);
        }
        return instance;
    }

    Summary load(List<String> sources, List<ChannelRef> channels, int offsetMinutes, boolean force, long maxAgeMs, int pastHours, int futureHours) {
        synchronized (this) {
            this.loading = true;
            try {
                return loadLocked(sources, channels, offsetMinutes, force, maxAgeMs, pastHours, futureHours);
            } finally {
                this.loading = false;
            }
        }
    }

    private Summary loadLocked(List<String> sources, List<ChannelRef> channels, int offsetMinutes, boolean force, long maxAgeMs, int pastHours, int futureHours) {
        String newKey = cacheKey(sources, channels, offsetMinutes);
        long now = System.currentTimeMillis();
        if (!force && newKey.equals(this.key) && !this.byChannel.isEmpty() && now - this.updatedAt < maxAgeMs) {
            return summary(false);
        }
        if (!force && readCache(newKey, maxAgeMs)) {
            return summary(true);
        }
        Matcher matcher = new Matcher(channels);
        ParseResult result = new ParseResult();
        result.now = now;
        long from = now - (pastHours * 3600000L);
        long to = now + (futureHours * 3600000L);
        long offsetMs = 60000L * offsetMinutes;
        List<String> errors = new ArrayList<>();
        for (String source : sources) {
            if (source == null || source.trim().isEmpty()) continue;
            try {
                download(source.trim(), matcher, from, to, offsetMs, result);
            } catch (Exception e) {
                errors.add(shortError(e));
            }
        }
        Map<String, Programme[]> assigned = result.assign();
        if (assigned.isEmpty()) {
            // Nothing matched (or every source failed): keep what we had, or fall back to an old cache.
            if (this.byChannel.isEmpty()) {
                readCache(newKey, Long.MAX_VALUE);
            }
            this.lastError = errors.isEmpty() ? "Rehberde bu listedeki kanallarla eşleşen program bulunamadı." : errors.get(0);
            Summary s = summary(!this.byChannel.isEmpty());
            s.error = this.lastError;
            return s;
        }
        this.byChannel = assigned;
        this.key = newKey;
        this.updatedAt = now;
        this.programmeCount = result.count;
        this.lastError = errors.isEmpty() ? "" : errors.get(0);
        writeCache();
        Summary s = summary(false);
        s.error = this.lastError;
        return s;
    }

    private Summary summary(boolean fromCache) {
        Summary s = new Summary();
        s.programmes = this.programmeCount;
        s.channels = this.byChannel.size();
        s.updatedAt = this.updatedAt;
        s.fromCache = fromCache;
        return s;
    }

    boolean isLoading() {
        return this.loading;
    }

    String lastError() {
        return this.lastError;
    }

    int programmeCount() {
        return this.programmeCount;
    }

    int channelCount() {
        return this.byChannel.size();
    }

    long updatedAt() {
        return this.updatedAt;
    }

    long cacheBytes() {
        if (this.cacheFile.exists()) {
            return this.cacheFile.length();
        }
        return 0L;
    }

    synchronized void clear() {
        this.byChannel = Collections.emptyMap();
        this.shortEpg.clear();
        this.shortEpgFetchedAt.clear();
        this.key = "";
        this.updatedAt = 0L;
        this.programmeCount = 0;
        this.lastError = "";
        this.cacheFile.delete();
    }

    List<Programme> range(String channelId, long from, long to, int limit) {
        Programme[] list = this.byChannel.get(channelId);
        if (list == null || list.length == 0) {
            list = this.shortEpg.get(channelId);
        }
        if (list == null || list.length == 0) {
            return Collections.emptyList();
        }
        int lo = 0;
        int hi = list.length;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (list[mid].stop <= from) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        List<Programme> out = new ArrayList<>();
        for (int i = lo; i < list.length && out.size() < limit && list[i].start < to; i++) {
            out.add(list[i]);
        }
        return out;
    }

    void fetchShortEpg(String channelId, String url) {
        if (url == null || url.isEmpty()) {
            return;
        }
        Long last = this.shortEpgFetchedAt.get(channelId);
        if (last != null && System.currentTimeMillis() - last.longValue() < 600000) {
            return;
        }
        this.shortEpgFetchedAt.put(channelId, Long.valueOf(System.currentTimeMillis()));
        try (InputStream in = open(url)) {
            String body = readText(in, 2000000);
            JSONArray listings = new JSONObject(body).optJSONArray("epg_listings");
            if (listings == null) {
                return;
            }
            List<Programme> programmes = new ArrayList<>();
            for (int i = 0; i < listings.length(); i++) {
                JSONObject o = listings.optJSONObject(i);
                if (o != null) {
                    long start = o.optLong("start_timestamp", 0L) * 1000;
                    long stop = o.optLong("stop_timestamp", o.optLong("end_timestamp", 0L)) * 1000;
                    if (start > 0 && stop > start) {
                        programmes.add(new Programme(start, stop, decodeBase64(o.optString("title")), truncate(decodeBase64(o.optString("description")))));
                    }
                }
            }
            Collections.sort(programmes, (x, y) -> Long.compare(x.start, y.start));
            this.shortEpg.put(channelId, programmes.toArray(new Programme[0]));
        } catch (Exception e) {
            // Short EPG is a bonus for channels the XMLTV guide does not cover; failures are ignored.
        }
    }

    private static final class Matcher {
        final Map<String, List<String>> byEpgId = new HashMap();
        final Map<String, List<String>> byName = new HashMap();
        final Map<String, Integer> archiveHours = new HashMap();

        Matcher(List<ChannelRef> channels) {
            for (ChannelRef c : channels) {
                if (c.archiveHours > 0) {
                    this.archiveHours.put(c.id, Integer.valueOf(c.archiveHours));
                }
                if (c.epgId != null && !c.epgId.trim().isEmpty()) {
                    add(this.byEpgId, c.epgId.trim().toLowerCase(Locale.ROOT), c.id);
                }
                String name = EpgStore.normalize(c.name);
                if (!name.isEmpty()) {
                    add(this.byName, name, c.id);
                }
            }
        }

        private static void add(Map<String, List<String>> map, String k, String id) {
            List<String> list = map.get(k);
            if (list == null) {
                list = new ArrayList(1);
                map.put(k, list);
            }
            list.add(id);
        }

        List<String> byId(String xmlId) {
            List<String> list = xmlId == null ? null : this.byEpgId.get(xmlId.trim().toLowerCase(Locale.ROOT));
            return list == null ? Collections.emptyList() : list;
        }

        Set<String> byNames(String xmlId, List<String> names) {
            Set<String> out = new LinkedHashSet<>();
            for (String n : names) {
                List<String> l = this.byName.get(EpgStore.normalize(n));
                if (l != null) {
                    out.addAll(l);
                }
            }
            if (out.isEmpty() && xmlId != null) {
                int dot = xmlId.indexOf(46);
                List<String> l2 = this.byName.get(EpgStore.normalize(dot > 0 ? xmlId.substring(0, dot) : xmlId));
                if (l2 != null) {
                    out.addAll(l2);
                }
            }
            return out;
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    static final class ParseResult {
        final Map<String, List<Programme>> byXml;
        int count;
        final Map<String, Long> fromByXml;
        final Map<String, List<String>> idLinks;
        final Map<String, Set<String>> nameLinks;
        long now;
        final Set<String> resolved;

        ParseResult() {
            this.byXml = new HashMap();
            this.idLinks = new HashMap();
            this.nameLinks = new HashMap();
            this.resolved = new HashSet();
            this.fromByXml = new HashMap();
        }

        long fromFor(String xmlId, long from, Matcher matcher) {
            if (this.now <= 0 || matcher.archiveHours.isEmpty()) {
                return from;
            }
            Long cached = this.fromByXml.get(xmlId);
            if (cached != null) {
                return cached.longValue();
            }
            int hours = 0;
            List<String> ids = this.idLinks.get(xmlId);
            if (ids != null) {
                for (String id : ids) {
                    Integer h = matcher.archiveHours.get(id);
                    if (h != null && h.intValue() > hours) {
                        hours = h.intValue();
                    }
                }
            }
            Set<String> names = this.nameLinks.get(xmlId);
            if (names != null) {
                for (String id2 : names) {
                    Integer h2 = matcher.archiveHours.get(id2);
                    if (h2 != null && h2.intValue() > hours) {
                        hours = h2.intValue();
                    }
                }
            }
            long value = Math.min(from, this.now - (hours * 3600000));
            this.fromByXml.put(xmlId, Long.valueOf(value));
            return value;
        }

        boolean hasTargets(String xmlId) {
            List<String> ids = this.idLinks.get(xmlId);
            Set<String> names = this.nameLinks.get(xmlId);
            return ((ids == null || ids.isEmpty()) && (names == null || names.isEmpty())) ? false : true;
        }

        Map<String, Programme[]> assign() {
            Map<String, Programme[]> arrays = new HashMap<>();
            for (Map.Entry<String, List<Programme>> e : this.byXml.entrySet()) {
                List<Programme> list = e.getValue();
                Collections.sort(list, new Comparator() { // from class: com.zendit.play.EpgStore$ParseResult$$ExternalSyntheticLambda0
                    @Override // java.util.Comparator
                    public final int compare(Object obj, Object obj2) {
                        return EpgStore.ParseResult.lambda$assign$0((EpgStore.Programme) obj, (EpgStore.Programme) obj2);
                    }
                });
                arrays.put(e.getKey(), dedupe(list));
            }
            Map<String, Programme[]> out = new HashMap<>();
            Set<String> byIdAssigned = new HashSet<>();
            for (Map.Entry<String, List<String>> e2 : this.idLinks.entrySet()) {
                Programme[] arr = arrays.get(e2.getKey());
                if (arr != null && arr.length != 0) {
                    for (String appId : e2.getValue()) {
                        putBetter(out, appId, arr);
                        byIdAssigned.add(appId);
                    }
                }
            }
            for (Map.Entry<String, Set<String>> e3 : this.nameLinks.entrySet()) {
                Programme[] arr2 = arrays.get(e3.getKey());
                if (arr2 != null && arr2.length != 0) {
                    for (String appId2 : e3.getValue()) {
                        if (!byIdAssigned.contains(appId2)) {
                            putBetter(out, appId2, arr2);
                        }
                    }
                }
            }
            return out;
        }

        static /* synthetic */ int lambda$assign$0(Programme a, Programme b) {
            return Long.compare(a.start, b.start);
        }

        private static void putBetter(Map<String, Programme[]> out, String appId, Programme[] arr) {
            Programme[] existing = out.get(appId);
            if (existing == null || existing.length < arr.length) {
                out.put(appId, arr);
            }
        }

        private static Programme[] dedupe(List<Programme> sorted) {
            List<Programme> out = new ArrayList<>(sorted.size());
            Programme prev = null;
            for (Programme p : sorted) {
                if (prev == null || prev.start != p.start) {
                    out.add(p);
                    prev = p;
                }
            }
            return (Programme[]) out.toArray(new Programme[0]);
        }
    }

    private void download(String url, Matcher matcher, long from, long to, long offsetMs, ParseResult out) throws Exception {
        InputStream in = open(url);
        try {
            parse(in, matcher, from, to, offsetMs, out);
            if (in != null) {
                in.close();
            }
        } catch (Throwable th) {
            if (in == null) {
                throw th;
            }
            try {
                in.close();
                throw th;
            } catch (Throwable th2) {
                th.addSuppressed(th2);
                throw th;
            }
        }
    }

    private static void parse(InputStream in, Matcher matcher, long from, long to, long offsetMs, ParseResult out) throws Exception {
        XmlPullParser p = Xml.newPullParser();
        try {
            p.setFeature("http://xmlpull.org/v1/doc/features.html#relaxed", true);
        } catch (Exception e) {
        }
        p.setInput(in, null);
        try {
            for (int event = p.getEventType(); event != 1; event = p.next()) {
                if (event == 2) {
                    String tag = p.getName();
                    if ("channel".equals(tag)) {
                        readChannel(p, matcher, out);
                    } else if ("programme".equals(tag)) {
                        readProgramme(p, matcher, from, to, offsetMs, out);
                    }
                }
            }
        } catch (Exception e2) {
            if (out.count == 0) {
                throw e2;
            }
        }
    }

    private static void readChannel(XmlPullParser p, Matcher matcher, ParseResult out) throws Exception {
        String id = p.getAttributeValue(null, "id");
        List<String> names = new ArrayList<>();
        int depth = 1;
        while (depth > 0) {
            int event = p.next();
            if (event == 1) {
                break;
            }
            if (event == 2) {
                if ("display-name".equals(p.getName())) {
                    names.add(p.nextText());
                } else {
                    depth++;
                }
            } else if (event == 3) {
                depth--;
            }
        }
        if (id != null) {
            link(id, names, matcher, out);
        }
    }

    private static void link(String xmlId, List<String> names, Matcher matcher, ParseResult out) {
        out.resolved.add(xmlId);
        List<String> ids = matcher.byId(xmlId);
        if (!ids.isEmpty()) {
            out.idLinks.put(xmlId, ids);
        }
        Set<String> byNames = matcher.byNames(xmlId, names);
        if (!byNames.isEmpty()) {
            out.nameLinks.put(xmlId, byNames);
        }
    }

    private static void readProgramme(XmlPullParser p, Matcher matcher, long from, long to, long offsetMs, ParseResult out) throws Exception {
        int event;
        String channel = p.getAttributeValue(null, "channel");
        if (channel == null || out.count >= programmeLimit) {
            skip(p);
            return;
        }
        if (!out.resolved.contains(channel)) {
            link(channel, Collections.emptyList(), matcher, out);
        }
        if (out.hasTargets(channel)) {
            long start = parseTime(p.getAttributeValue(null, "start"));
            long stop = parseTime(p.getAttributeValue(null, "stop"));
            if (start <= 0) {
                skip(p);
                return;
            }
            long start2 = start + offsetMs;
            long stop2 = stop > 0 ? stop + offsetMs : 3600000 + start2;
            if (stop2 <= out.fromFor(channel, from, matcher) || start2 >= to || stop2 <= start2) {
                skip(p);
                return;
            }
            String title = null;
            String desc = null;
            int depth = 1;
            while (depth > 0 && (event = p.next()) != 1) {
                if (event == 2) {
                    String tag = p.getName();
                    if ("title".equals(tag) && title == null) {
                        title = p.nextText();
                    } else if ("desc".equals(tag) && desc == null) {
                        desc = p.nextText();
                    } else {
                        depth++;
                    }
                } else if (event == 3) {
                    depth--;
                }
            }
            List<Programme> list = out.byXml.get(channel);
            if (list == null) {
                list = new ArrayList();
                out.byXml.put(channel, list);
            }
            list.add(new Programme(start2, stop2, title == null ? "" : title.trim(), truncate(desc)));
            out.count++;
            return;
        }
        skip(p);
    }

    private static void skip(XmlPullParser p) throws Exception {
        int depth = 1;
        while (depth > 0) {
            int event = p.next();
            if (event == 1) {
                return;
            }
            if (event == 2) {
                depth++;
            } else if (event == 3) {
                depth--;
            }
        }
    }

    static long parseTime(String s) throws NumberFormatException {
        int second;
        if (s == null) {
            return 0L;
        }
        String s2 = s.trim();
        if (s2.length() < 12) {
            return 0L;
        }
        try {
            int year = Integer.parseInt(s2.substring(0, 4));
            int month = Integer.parseInt(s2.substring(4, 6));
            int day = Integer.parseInt(s2.substring(6, 8));
            int hour = Integer.parseInt(s2.substring(8, 10));
            int minute = Integer.parseInt(s2.substring(10, 12));
            if (s2.length() >= 14 && Character.isDigit(s2.charAt(12)) && Character.isDigit(s2.charAt(13))) {
                second = Integer.parseInt(s2.substring(12, 14));
            } else {
                second = 0;
            }
            long millis = ((((((daysFromCivil(year, month, day) * 24) + hour) * 60) + minute) * 60) + second) * 1000;
            try {
                String zone = s2.length() > 14 ? s2.substring(14).trim() : "";
                if (zone.length() < 5) {
                    return millis;
                }
                if (zone.charAt(0) == '+' || zone.charAt(0) == '-') {
                    int zoneMinutes = (Integer.parseInt(zone.substring(1, 3)) * 60) + Integer.parseInt(zone.substring(3, 5));
                    return millis + ((zone.charAt(0) == '+' ? -1 : 1) * zoneMinutes * 60000);
                }
                return millis;
            } catch (RuntimeException e) {
                return 0L;
            }
        } catch (RuntimeException e2) {
            return 0L;
        }
    }

    private static long daysFromCivil(int y, int m, int d) {
        int y2 = y - (m <= 2 ? 1 : 0);
        long era = (y2 >= 0 ? y2 : y2 - 399) / 400;
        long yoe = y2 - (400 * era);
        long doy = ((((((m > 2 ? -3 : 9) + m) * 153) + 2) / 5) + d) - 1;
        long doe = (((365 * yoe) + (yoe / 4)) - (yoe / 100)) + doy;
        return ((146097 * era) + doe) - 719468;
    }

    static String normalize(String name) {
        if (name == null) {
            return "";
        }
        String n = name.toLowerCase(Locale.ROOT).replace((char) 305, 'i');
        return NON_ALNUM.matcher(MARKS.matcher(Normalizer.normalize(QUALITY.matcher(PREFIX.matcher(n).replaceFirst("")).replaceAll(""), Normalizer.Form.NFD)).replaceAll("")).replaceAll("");
    }

    private static InputStream open(String url) throws IOException {
        String current = url;
        for (int redirects = 0; redirects < 6; redirects++) {
            HttpURLConnection c = (HttpURLConnection) new URL(current).openConnection();
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(20000);
            c.setReadTimeout(90000);
            c.setRequestProperty("User-Agent", "ZenditPlay/1.1 (Android)");
            int code = c.getResponseCode();
            if (code >= 300 && code < 400) {
                String location = c.getHeaderField("Location");
                c.disconnect();
                if (location == null) {
                    throw new IOException("HTTP " + code);
                }
                current = new URL(new URL(current), location).toString();
            } else {
                if (code != 200) {
                    c.disconnect();
                    throw new IOException("HTTP " + code);
                }
                InputStream in = new BufferedInputStream(c.getInputStream(), 65536);
                in.mark(4);
                int b1 = in.read();
                int b2 = in.read();
                in.reset();
                if (b1 == 31 && b2 == 139) {
                    return new GZIPInputStream(in, 65536);
                }
                return in;
            }
        }
        throw new IOException("Çok fazla yönlendirme");
    }

    private static String readText(InputStream in, int maxBytes) throws IOException {
        byte[] buffer = new byte[16384];
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        while (true) {
            int read = in.read(buffer);
            if (read == -1 || out.size() >= maxBytes) {
                break;
            }
            out.write(buffer, 0, read);
        }
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }

    private static String cacheKey(List<String> sources, List<ChannelRef> channels, int offsetMinutes) {
        int hash = 17;
        for (ChannelRef c : channels) {
            hash = (((((hash * 31) + c.id.hashCode()) * 31) + (c.epgId == null ? 0 : c.epgId.hashCode())) * 31) + c.archiveHours;
        }
        return TextUtils.join(" ", sources) + "|" + offsetMinutes + "|" + channels.size() + "|" + hash;
    }

    /** Reads the on-disk cache (format 2) if it belongs to `key` and is younger than `maxAgeMs`. */
    private boolean readCache(String key, long maxAgeMs) {
        if (!this.cacheFile.exists()) {
            return false;
        }
        try (DataInputStream in = new DataInputStream(new BufferedInputStream(new GZIPInputStream(new FileInputStream(this.cacheFile))))) {
            if (in.readInt() != 2) {
                return false;
            }
            String cachedKey = in.readUTF();
            long cachedAt = in.readLong();
            if (!cachedKey.equals(key) || System.currentTimeMillis() - cachedAt > maxAgeMs) {
                return false;
            }
            int groups = in.readInt();
            Map<String, Programme[]> map = new HashMap<>();
            int programmes = 0;
            for (int g = 0; g < groups; g++) {
                int idCount = in.readInt();
                String[] ids = new String[idCount];
                for (int i = 0; i < idCount; i++) {
                    ids[i] = in.readUTF();
                }
                int count = in.readInt();
                Programme[] list = new Programme[count];
                for (int i = 0; i < count; i++) {
                    list[i] = new Programme(in.readLong(), in.readLong(), in.readUTF(), in.readUTF());
                }
                programmes += count;
                for (String id : ids) {
                    map.put(id, list);
                }
            }
            this.byChannel = map;
            this.key = cachedKey;
            this.updatedAt = cachedAt;
            this.programmeCount = programmes;
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void writeCache() {
        Map<Programme[], List<String>> groups = new IdentityHashMap<>();
        for (Map.Entry<String, Programme[]> e : this.byChannel.entrySet()) {
            List<String> ids = groups.get(e.getValue());
            if (ids == null) {
                ids = new ArrayList<>();
                groups.put(e.getValue(), ids);
            }
            ids.add(e.getKey());
        }
        File tmp = new File(this.cacheFile.getPath() + ".tmp");
        try (DataOutputStream out = new DataOutputStream(new BufferedOutputStream(new GZIPOutputStream(new FileOutputStream(tmp))))) {
            out.writeInt(2);
            out.writeUTF(this.key);
            out.writeLong(this.updatedAt);
            out.writeInt(groups.size());
            for (Map.Entry<Programme[], List<String>> e : groups.entrySet()) {
                out.writeInt(e.getValue().size());
                for (String id : e.getValue()) {
                    out.writeUTF(id);
                }
                out.writeInt(e.getKey().length);
                for (Programme p : e.getKey()) {
                    out.writeLong(p.start);
                    out.writeLong(p.stop);
                    out.writeUTF(p.title);
                    out.writeUTF(p.desc);
                }
            }
        } catch (IOException e) {
            tmp.delete();
            return;
        }
        tmp.renameTo(this.cacheFile);
    }

    private static String truncate(String text) {
        if (text == null) {
            return "";
        }
        String t = text.trim();
        return t.length() > 220 ? t.substring(0, 219).trim() + "…" : t;
    }

    private static String decodeBase64(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        try {
            return new String(Base64.decode(value, 0), StandardCharsets.UTF_8).trim();
        } catch (IllegalArgumentException e) {
            return value;
        }
    }

    private static String shortError(Exception e) {
        String message = e.getMessage();
        if (e instanceof UnknownHostException) {
            return "EPG sunucusu bulunamadı";
        }
        if (e instanceof SocketTimeoutException) {
            return "EPG sunucusu zaman aşımına uğradı";
        }
        if (message == null || !message.startsWith("HTTP ")) {
            return "EPG okunamadı" + (message == null ? "" : ": " + message);
        }
        return "EPG indirilemedi (" + message + ")";
    }
}
