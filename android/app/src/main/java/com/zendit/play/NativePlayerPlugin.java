package com.zendit.play;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Outline;
import android.graphics.Rect;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.webkit.WebView;
import androidx.activity.result.ActivityResult;
import androidx.annotation.OptIn;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native playback for the web app (src/lib/nativePlayer.ts): the fullscreen player (PlayerActivity),
 * external player apps, and the Live TV preview - an ExoPlayer view laid over the WebView.
 */
@OptIn(markerClass = UnstableApi.class)
@CapacitorPlugin(name = "NativePlayer")
public class NativePlayerPlugin extends Plugin {

    private PlayerView previewView;
    private ExoPlayer previewPlayer;

    private final Player.Listener previewListener = new Player.Listener() {
        @Override
        public void onPlaybackStateChanged(int playbackState) {
            if (playbackState == Player.STATE_READY) {
                notifyListeners("previewPlaying", new JSObject());
            }
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            JSObject data = new JSObject();
            data.put("message", error.getErrorCodeName());
            notifyListeners("previewError", data);
            // Remove the native view so the web page can show its error message inside the box.
            getBridge().executeOnMainThread(() -> releasePreview());
        }
    };

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Yayın adresi yok");
            return;
        }
        // Most IPTV accounts allow a single stream at a time: free the preview first.
        getBridge().executeOnMainThread(this::releasePreview);
        Intent intent = new Intent(getContext(), PlayerActivity.class);
        intent.putExtra(PlayerActivity.EXTRA_URL, url);
        intent.putExtra(PlayerActivity.EXTRA_TITLE, call.getString("title", ""));
        intent.putExtra(PlayerActivity.EXTRA_LIVE, Boolean.TRUE.equals(call.getBoolean("live", false)));
        startActivityForResult(call, intent, "playerClosed");
    }

    @ActivityCallback
    private void playerClosed(PluginCall call, ActivityResult result) {
        if (call != null) {
            call.resolve();
        }
    }

    @PluginMethod
    public void openExternal(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Yayın adresi yok");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(Uri.parse(url), "video/*");
        // VLC and MX Player show this as the video title.
        intent.putExtra("title", call.getString("title", ""));
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("Cihazda video oynatıcı uygulaması bulunamadı");
        }
    }

    @PluginMethod
    public void startPreview(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Yayın adresi yok");
            return;
        }
        Rect rect = readRect(call);
        getBridge().executeOnMainThread(() -> {
            showPreview(url, rect);
            call.resolve();
        });
    }

    @PluginMethod
    public void updatePreview(PluginCall call) {
        Rect rect = readRect(call);
        getBridge().executeOnMainThread(() -> {
            if (previewView != null) {
                placePreview(rect);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void stopPreview(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            releasePreview();
            call.resolve();
        });
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        // App sent to the background: close the stream connection but remember the channel.
        if (previewPlayer != null) {
            previewPlayer.stop();
        }
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        // The media item and playWhenReady survive stop(), so prepare() resumes the same channel.
        if (previewPlayer != null) {
            previewPlayer.prepare();
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        releasePreview();
    }

    /** The web page sends the preview box in device pixels, relative to the WebView. */
    private Rect readRect(PluginCall call) {
        int x = call.getInt("x", 0);
        int y = call.getInt("y", 0);
        int width = Math.max(0, call.getInt("width", 0));
        int height = Math.max(0, call.getInt("height", 0));
        return new Rect(x, y, x + width, y + height);
    }

    private void showPreview(String url, Rect rect) {
        if (previewView == null) {
            ViewGroup parent = (ViewGroup) getBridge().getWebView().getParent();
            previewView = (PlayerView) LayoutInflater.from(getContext()).inflate(R.layout.zendit_preview_player, parent, false);
            previewView.setDescendantFocusability(ViewGroup.FOCUS_BLOCK_DESCENDANTS);
            float radius = 12 * getContext().getResources().getDisplayMetrics().density;
            previewView.setOutlineProvider(
                new ViewOutlineProvider() {
                    @Override
                    public void getOutline(View view, Outline outline) {
                        outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), radius);
                    }
                }
            );
            previewView.setClipToOutline(true);
            // Added after the WebView, so it is drawn on top of it. It is neither focusable nor
            // clickable: the TV remote and touches keep working in the web page.
            parent.addView(previewView);
        }
        placePreview(rect);
        if (previewPlayer == null) {
            previewPlayer = StreamPlayers.create(getContext());
            previewPlayer.addListener(previewListener);
            previewView.setPlayer(previewPlayer);
        }
        previewPlayer.setMediaItem(StreamPlayers.mediaItem(url));
        previewPlayer.setPlayWhenReady(true);
        previewPlayer.prepare();
    }

    private void placePreview(Rect rect) {
        WebView webView = getBridge().getWebView();
        ViewGroup.LayoutParams params = previewView.getLayoutParams();
        params.width = rect.width();
        params.height = rect.height();
        previewView.setLayoutParams(params);
        previewView.setX(webView.getX() + rect.left);
        previewView.setY(webView.getY() + rect.top);
    }

    private void releasePreview() {
        if (previewPlayer != null) {
            previewPlayer.removeListener(previewListener);
            previewPlayer.release();
            previewPlayer = null;
        }
        if (previewView != null) {
            previewView.setPlayer(null);
            ViewGroup parent = (ViewGroup) previewView.getParent();
            if (parent != null) {
                parent.removeView(previewView);
            }
            previewView = null;
        }
    }
}
