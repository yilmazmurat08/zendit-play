package com.zendit.play;

import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Pair;
import android.view.KeyEvent;
import android.view.ViewGroup;
import android.view.WindowManager;
import androidx.annotation.OptIn;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;

/** Fullscreen Media3 ExoPlayer screen opened by NativePlayerPlugin.play(). The Back key closes it. */
@OptIn(markerClass = UnstableApi.class)
public class PlayerActivity extends AppCompatActivity {

    static final String EXTRA_URL = "url";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_LIVE = "live";
    private static final int MAX_LIVE_RETRIES = 3;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private PlayerView playerView;
    private ExoPlayer player;
    private boolean live;
    private int liveRetries = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setTitle(getIntent().getStringExtra(EXTRA_TITLE));
        live = getIntent().getBooleanExtra(EXTRA_LIVE, false);

        playerView = new PlayerView(this);
        playerView.setBackgroundColor(Color.BLACK);
        playerView.setShowBuffering(PlayerView.SHOW_BUFFERING_ALWAYS);
        playerView.setShowNextButton(false);
        playerView.setShowPreviousButton(false);
        playerView.setShowFastForwardButton(!live);
        playerView.setShowRewindButton(!live);
        playerView.setErrorMessageProvider(
            error -> Pair.create(0, "Yayın açılamadı (" + error.getErrorCodeName() + "). Geri tuşuyla çıkabilirsiniz.")
        );
        setContentView(
            playerView,
            new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        );

        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.hide(WindowInsetsCompat.Type.systemBars());
        bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    @Override
    protected void onStart() {
        super.onStart();
        startPlayer();
    }

    @Override
    protected void onStop() {
        super.onStop();
        releasePlayer();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        // D-pad and remote media keys drive the player controls; Back falls through and closes the screen.
        return playerView.dispatchKeyEvent(event) || super.dispatchKeyEvent(event);
    }

    private void startPlayer() {
        if (player != null) {
            return;
        }
        String url = getIntent().getStringExtra(EXTRA_URL);
        if (url == null || url.isEmpty()) {
            finish();
            return;
        }
        player = StreamPlayers.create(this);
        player.addListener(
            new Player.Listener() {
                @Override
                public void onPlaybackStateChanged(int playbackState) {
                    if (playbackState == Player.STATE_READY) {
                        liveRetries = 0;
                    }
                }

                @Override
                public void onPlayerError(PlaybackException error) {
                    retryLive(error);
                }
            }
        );
        playerView.setPlayer(player);
        player.setMediaItem(StreamPlayers.mediaItem(url));
        player.setPlayWhenReady(true);
        player.prepare();
        playerView.requestFocus();
    }

    /** Live streams drop now and then: rejoin the live edge a few times before showing the error. */
    private void retryLive(PlaybackException error) {
        if (player == null || !live || liveRetries >= MAX_LIVE_RETRIES) {
            return;
        }
        liveRetries++;
        long delayMs = error.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW ? 0 : 2_000;
        handler.postDelayed(
            () -> {
                if (player != null) {
                    player.seekToDefaultPosition();
                    player.prepare();
                }
            },
            delayMs
        );
    }

    private void releasePlayer() {
        handler.removeCallbacksAndMessages(null);
        if (player == null) {
            return;
        }
        playerView.setPlayer(null);
        player.release();
        player = null;
    }
}
