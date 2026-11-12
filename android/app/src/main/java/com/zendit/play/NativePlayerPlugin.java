package com.zendit.play;

import android.app.UiModeManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Outline;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Build;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.webkit.WebView;
import androidx.activity.result.ActivityResult;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "NativePlayer")
/* loaded from: classes7.dex */
public class NativePlayerPlugin extends Plugin {
    private final Player.Listener previewListener = new AnonymousClass1();
    private ExoPlayer previewPlayer;
    private PlayerView previewView;

    /* renamed from: $r8$lambda$7oQP1N_Bh8rRTKGjMMkf-o68zzM, reason: not valid java name */
    public static /* synthetic */ void m428$r8$lambda$7oQP1N_Bh8rRTKGjMMkfo68zzM(NativePlayerPlugin nativePlayerPlugin, PluginCall pluginCall) {
        nativePlayerPlugin.lambda$stopPreview$3(pluginCall);
    }

    public static /* synthetic */ void $r8$lambda$I6sGKQUUXLoLMWeUOBOepH21QOI(NativePlayerPlugin nativePlayerPlugin, String str, Rect rect, PluginCall pluginCall) {
        nativePlayerPlugin.lambda$startPreview$1(str, rect, pluginCall);
    }

    public static /* synthetic */ void $r8$lambda$XqJtxEzlr1h1cMQF69r9wHFY4y0(NativePlayerPlugin nativePlayerPlugin) {
        nativePlayerPlugin.releasePreview();
    }

    /* renamed from: $r8$lambda$r2KDVwV_7dwgJ-bQjI1MnCDUx-M, reason: not valid java name */
    public static /* synthetic */ void m429$r8$lambda$r2KDVwV_7dwgJbQjI1MnCDUxM(NativePlayerPlugin nativePlayerPlugin, PluginCall pluginCall) {
        nativePlayerPlugin.lambda$clearCache$0(pluginCall);
    }

    public static /* synthetic */ void $r8$lambda$yReILc8nJANgzOOXCCjsiP3iBIM(NativePlayerPlugin nativePlayerPlugin, Rect rect, PluginCall pluginCall) {
        nativePlayerPlugin.lambda$updatePreview$2(rect, pluginCall);
    }

    /* renamed from: -$$Nest$mreleasePreview, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m430$$Nest$mreleasePreview(NativePlayerPlugin nativePlayerPlugin) {
        nativePlayerPlugin.releasePreview();
    }

    static /* synthetic */ void access$000(NativePlayerPlugin x0, String x1, JSObject x2) {
        x0.notifyListeners(x1, x2);
    }

    static /* synthetic */ void access$100(NativePlayerPlugin x0, String x1, JSObject x2) {
        x0.notifyListeners(x1, x2);
    }

    /* renamed from: com.zendit.play.NativePlayerPlugin$1, reason: invalid class name */
    class AnonymousClass1 implements Player.Listener {
        public static /* synthetic */ void $r8$lambda$PMvXu3aYyNTf7LsWzareO5HBbMo(AnonymousClass1 anonymousClass1) {
            anonymousClass1.lambda$onPlayerError$0();
        }

        AnonymousClass1() {
        }

        @Override // androidx.media3.common.Player.Listener
        public void onPlaybackStateChanged(int playbackState) {
            if (playbackState == 3) {
                NativePlayerPlugin.access$000(NativePlayerPlugin.this, "previewPlaying", new JSObject());
            }
        }

        @Override // androidx.media3.common.Player.Listener
        public void onPlayerError(PlaybackException error) {
            JSObject data = new JSObject();
            data.put("message", error.getErrorCodeName());
            NativePlayerPlugin.access$100(NativePlayerPlugin.this, "previewError", data);
            NativePlayerPlugin.this.getBridge().executeOnMainThread(new Runnable() { // from class: com.zendit.play.NativePlayerPlugin$1$$ExternalSyntheticLambda0
                @Override // java.lang.Runnable
                public final void run() {
                    NativePlayerPlugin.AnonymousClass1.$r8$lambda$PMvXu3aYyNTf7LsWzareO5HBbMo(AnonymousClass1.this);
                }
            });
        }

        private /* synthetic */ void lambda$onPlayerError$0() {
            NativePlayerPlugin.m430$$Nest$mreleasePreview(NativePlayerPlugin.this);
        }
    }

    @PluginMethod
    public void play(PluginCall call) {
        int i;
        List<PlayerItem> items = new ArrayList<>();
        JSArray rawItems = call.getArray("items", new JSArray());
        for (int i2 = 0; i2 < rawItems.length(); i2++) {
            JSONObject o = rawItems.optJSONObject(i2);
            if (o != null && !o.optString("url", "").isEmpty()) {
                items.add(PlayerItem.fromJson(o));
            }
        }
        String url = call.getString("url");
        if (!items.isEmpty() || url == null || url.isEmpty()) {
            i = 0;
        } else {
            boolean live = Boolean.TRUE.equals(call.getBoolean("live", false));
            i = 0;
            items.add(new PlayerItem(url, url, call.getString("title", ""), "", live ? "live" : "movie", 0, "", "", 0L));
        }
        if (items.isEmpty()) {
            call.reject("Yayın adresi yok");
            return;
        }
        PlayerSession.set(items, call.getData().optInt("index", i), PlayerConfig.fromJson(call.getObject("config", new JSObject())));
        getBridge().executeOnMainThread(new Runnable() { // from class: com.zendit.play.NativePlayerPlugin$$ExternalSyntheticLambda2
            @Override // java.lang.Runnable
            public final void run() {
                NativePlayerPlugin.$r8$lambda$XqJtxEzlr1h1cMQF69r9wHFY4y0(NativePlayerPlugin.this);
            }
        });
        Intent intent = new Intent(getContext(), (Class<?>) PlayerActivity.class);
        startActivityForResult(call, intent, "playerClosed");
    }

    @ActivityCallback
    private void playerClosed(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        JSObject data = new JSObject();
        Intent intent = result.getData();
        String json = intent != null ? intent.getStringExtra("result") : null;
        if (json != null) {
            try {
                data = new JSObject(json);
            } catch (JSONException e) {
            }
        }
        call.resolve(data);
    }

    @PluginMethod
    public void openExternal(PluginCall call) {
        String[] packages;
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Yayın adresi yok");
            return;
        }
        String title = call.getString("title", "");
        String player = call.getString("player", "system");
        Intent intent = new Intent("android.intent.action.VIEW");
        intent.setDataAndType(Uri.parse(url), "video/*");
        intent.putExtra("title", title);
        if ("vlc".equals(player)) {
            packages = new String[]{"org.videolan.vlc"};
        } else {
            packages = "mx".equals(player) ? new String[]{"com.mxtech.videoplayer.pro", "com.mxtech.videoplayer.ad"} : new String[0];
        }
        PackageManager pm = getContext().getPackageManager();
        for (String pkg : packages) {
            if (isInstalled(pm, pkg)) {
                intent.setPackage(pkg);
                try {
                    getActivity().startActivity(intent);
                    call.resolve();
                    return;
                } catch (ActivityNotFoundException e) {
                    call.reject("Oynatıcı açılamadı");
                    return;
                }
            }
        }
        if (packages.length > 0) {
            call.reject(("vlc".equals(player) ? "VLC" : "MX Player") + " cihazda yüklü değil");
            return;
        }
        try {
            getActivity().startActivity(Intent.createChooser(intent, "Oynatıcı seçin"));
            call.resolve();
        } catch (ActivityNotFoundException e2) {
            call.reject("Cihazda video oynatıcı uygulaması bulunamadı");
        }
    }

    @PluginMethod
    public void openTrailer(PluginCall call) {
        String youtubeId = call.getString("youtubeId", "");
        String url = call.getString("url", "");
        if (youtubeId != null && !youtubeId.isEmpty()) {
            try {
                getActivity().startActivity(new Intent("android.intent.action.VIEW", Uri.parse("vnd.youtube:" + youtubeId)));
                call.resolve();
                return;
            } catch (ActivityNotFoundException e) {
                url = "https://www.youtube.com/watch?v=" + youtubeId;
            }
        }
        if (url != null && !url.isEmpty()) {
            try {
                getActivity().startActivity(new Intent("android.intent.action.VIEW", Uri.parse(url)));
                call.resolve();
                return;
            } catch (ActivityNotFoundException e2) {
                call.reject("Fragmanı açacak uygulama bulunamadı (YouTube veya tarayıcı)");
                return;
            }
        }
        call.reject("Fragman adresi yok");
    }

    /** Last crash report saved on the device ({@code text} is empty when there is none). */
    @PluginMethod
    public void lastCrash(PluginCall call) {
        String text = CrashLog.take(getContext());
        JSObject result = new JSObject();
        result.put("text", text == null ? "" : text);
        call.resolve(result);
    }

    /** Opens Android's share sheet with a text (crash report). */
    @PluginMethod
    public void shareText(PluginCall call) {
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_SUBJECT, call.getString("title", "Zendit Player"));
        send.putExtra(Intent.EXTRA_TEXT, call.getString("text", ""));
        Intent chooser = Intent.createChooser(send, call.getString("title", "Paylaş"));
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Paylaşılacak uygulama bulunamadı");
        }
    }

    @PluginMethod
    public void players(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        JSObject result = new JSObject();
        result.put("vlc", isInstalled(pm, "org.videolan.vlc"));
        result.put("mx", isInstalled(pm, "com.mxtech.videoplayer.pro") || isInstalled(pm, "com.mxtech.videoplayer.ad"));
        call.resolve(result);
    }

    @PluginMethod
    public void deviceInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("manufacturer", Build.MANUFACTURER);
        result.put("model", Build.MODEL);
        result.put("androidVersion", Build.VERSION.RELEASE);
        result.put("sdk", Build.VERSION.SDK_INT);
        UiModeManager uiMode = (UiModeManager) getContext().getSystemService("uimode");
        result.put("isTv", uiMode != null && uiMode.getCurrentModeType() == 4);
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            result.put("appVersion", info.versionName);
        } catch (PackageManager.NameNotFoundException e) {
            result.put("appVersion", "");
        }
        result.put("webCacheBytes", folderSize(getContext().getCacheDir()));
        call.resolve(result);
    }

    @PluginMethod
    public void clearCache(final PluginCall call) {
        getBridge().executeOnMainThread(new Runnable() { // from class: com.zendit.play.NativePlayerPlugin$$ExternalSyntheticLambda1
            @Override // java.lang.Runnable
            public final void run() {
                NativePlayerPlugin.m429$r8$lambda$r2KDVwV_7dwgJbQjI1MnCDUxM(NativePlayerPlugin.this, call);
            }
        });
    }

    private /* synthetic */ void lambda$clearCache$0(PluginCall call) {
        getBridge().getWebView().clearCache(true);
        deleteChildren(getContext().getCacheDir());
        call.resolve();
    }

    private static boolean isInstalled(PackageManager pm, String pkg) {
        try {
            pm.getPackageInfo(pkg, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    private static long folderSize(File dir) {
        File[] files = dir == null ? null : dir.listFiles();
        if (files == null) {
            return 0L;
        }
        long total = 0;
        for (File f : files) {
            total += f.isDirectory() ? folderSize(f) : f.length();
        }
        return total;
    }

    private static void deleteChildren(File dir) {
        File[] files = dir == null ? null : dir.listFiles();
        if (files == null) {
            return;
        }
        for (File f : files) {
            if (f.isDirectory()) {
                deleteChildren(f);
            }
            f.delete();
        }
    }

    @PluginMethod
    public void startPreview(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Yayın adresi yok");
        } else {
            final Rect rect = readRect(call);
            getBridge().executeOnMainThread(new Runnable() { // from class: com.zendit.play.NativePlayerPlugin$$ExternalSyntheticLambda3
                @Override // java.lang.Runnable
                public final void run() {
                    NativePlayerPlugin.$r8$lambda$I6sGKQUUXLoLMWeUOBOepH21QOI(NativePlayerPlugin.this, url, rect, call);
                }
            });
        }
    }

    private /* synthetic */ void lambda$startPreview$1(String url, Rect rect, PluginCall call) {
        showPreview(url, rect);
        call.resolve();
    }

    @PluginMethod
    public void updatePreview(final PluginCall call) {
        final Rect rect = readRect(call);
        getBridge().executeOnMainThread(new Runnable() { // from class: com.zendit.play.NativePlayerPlugin$$ExternalSyntheticLambda0
            @Override // java.lang.Runnable
            public final void run() {
                NativePlayerPlugin.$r8$lambda$yReILc8nJANgzOOXCCjsiP3iBIM(NativePlayerPlugin.this, rect, call);
            }
        });
    }

    private /* synthetic */ void lambda$updatePreview$2(Rect rect, PluginCall call) {
        if (this.previewView != null) {
            placePreview(rect);
        }
        call.resolve();
    }

    @PluginMethod
    public void stopPreview(final PluginCall call) {
        getBridge().executeOnMainThread(new Runnable() { // from class: com.zendit.play.NativePlayerPlugin$$ExternalSyntheticLambda4
            @Override // java.lang.Runnable
            public final void run() {
                NativePlayerPlugin.m428$r8$lambda$7oQP1N_Bh8rRTKGjMMkfo68zzM(NativePlayerPlugin.this, call);
            }
        });
    }

    private /* synthetic */ void lambda$stopPreview$3(PluginCall call) {
        releasePreview();
        call.resolve();
    }

    @Override // com.getcapacitor.Plugin
    protected void handleOnPause() {
        super.handleOnPause();
        if (this.previewPlayer != null) {
            this.previewPlayer.stop();
        }
    }

    @Override // com.getcapacitor.Plugin
    protected void handleOnResume() {
        super.handleOnResume();
        if (this.previewPlayer != null) {
            this.previewPlayer.prepare();
        }
    }

    @Override // com.getcapacitor.Plugin
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        releasePreview();
    }

    private Rect readRect(PluginCall call) {
        int x = call.getInt("x", 0).intValue();
        int y = call.getInt("y", 0).intValue();
        int width = Math.max(0, call.getInt("width", 0).intValue());
        int height = Math.max(0, call.getInt("height", 0).intValue());
        return new Rect(x, y, x + width, y + height);
    }

    private void showPreview(String url, Rect rect) {
        if (this.previewView == null) {
            ViewGroup parent = (ViewGroup) getBridge().getWebView().getParent();
            this.previewView = (PlayerView) LayoutInflater.from(getContext()).inflate(R.layout.zendit_preview_player, parent, false);
            this.previewView.setDescendantFocusability(393216);
            final float radius = getContext().getResources().getDisplayMetrics().density * 12.0f;
            this.previewView.setOutlineProvider(new ViewOutlineProvider() { // from class: com.zendit.play.NativePlayerPlugin.2
                @Override // android.view.ViewOutlineProvider
                public void getOutline(View view, Outline outline) {
                    outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), radius);
                }
            });
            this.previewView.setClipToOutline(true);
            parent.addView(this.previewView);
        }
        placePreview(rect);
        if (this.previewPlayer == null) {
            this.previewPlayer = StreamPlayers.create(getContext());
            this.previewPlayer.addListener(this.previewListener);
            this.previewView.setPlayer(this.previewPlayer);
        }
        this.previewPlayer.setMediaItem(StreamPlayers.mediaItem(url));
        this.previewPlayer.setPlayWhenReady(true);
        this.previewPlayer.prepare();
    }

    private void placePreview(Rect rect) {
        WebView webView = getBridge().getWebView();
        ViewGroup.LayoutParams params = this.previewView.getLayoutParams();
        params.width = rect.width();
        params.height = rect.height();
        this.previewView.setLayoutParams(params);
        this.previewView.setX(webView.getX() + rect.left);
        this.previewView.setY(webView.getY() + rect.top);
    }

    private void releasePreview() {
        if (this.previewPlayer != null) {
            this.previewPlayer.removeListener(this.previewListener);
            this.previewPlayer.release();
            this.previewPlayer = null;
        }
        if (this.previewView != null) {
            this.previewView.setPlayer(null);
            ViewGroup parent = (ViewGroup) this.previewView.getParent();
            if (parent != null) {
                parent.removeView(this.previewView);
            }
            this.previewView = null;
        }
    }
}
