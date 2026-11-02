package com.zendit.play;

import android.app.PictureInPictureParams;
import android.app.UiModeManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Typeface;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Rational;
import android.view.KeyEvent;
import android.view.SurfaceView;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.TextView;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.GravityCompat;
import androidx.core.view.OnApplyWindowInsetsListener;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.lifecycle.Lifecycle;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.common.TrackGroup;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.TrackSelectionParameters;
import androidx.media3.common.Tracks;
import androidx.media3.common.VideoSize;
import androidx.media3.common.text.CueGroup;
import androidx.media3.common.util.Util;
import androidx.media3.datasource.HttpDataSource;
import androidx.media3.exoplayer.DecoderCounters;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.analytics.AnalyticsListener;
import androidx.media3.exoplayer.dash.DashMediaSource;
import androidx.media3.exoplayer.upstream.DefaultBandwidthMeter;
import androidx.media3.extractor.text.ttml.TtmlNode;
import androidx.media3.extractor.ts.TsExtractor;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.CaptionStyleCompat;
import androidx.media3.ui.SubtitleView;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.common.collect.UnmodifiableIterator;
import com.zendit.play.EpgStore;
import com.zendit.play.PlayerGestures;
import com.zendit.play.RowAdapter;
import java.io.IOException;
import java.lang.ref.WeakReference;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import kotlin.text.Typography;
import kotlinx.coroutines.scheduling.WorkQueueKt;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/* loaded from: classes7.dex */
public class PlayerActivity extends AppCompatActivity implements PlayerGestures.Callbacks {
    static final String EXTRA_LIVE = "live";
    static final String EXTRA_RESULT = "result";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_URL = "url";
    private static final long HIDE_DELAY_MS = 4500;
    private static final int MAX_LIVE_RETRIES = 3;
    private static final int NEXT_COUNTDOWN_SECONDS = 10;
    private static final long NUMBER_DELAY_MS = 1800;
    private static final long SEEK_STEP_MS = 10000;
    private static final int SIDE_CHANNELS = 1;
    private static final int SIDE_EPISODES = 2;
    private static final int SIDE_NONE = 0;
    private static final int SIDE_OPTIONS = 3;
    private static final long ZAP_DELAY_MS = 400;
    private int aspectIndex;
    private AudioManager audioManager;
    private View bottomBar;
    private ProgressBar buffering;
    private PlayerItem catchupItem;
    private long catchupStart;
    private long catchupStop;
    private TextView clockView;
    private View controls;
    private boolean controlsVisible;
    private TextView durationView;
    private EpgStore epg;
    private ProgressBar epgProgress;
    private View epgRow;
    private TextView errorDetail;
    private View errorPanel;
    private TextView errorRetry;
    private TextView errorTitle;
    private ImageView gestureIcon;
    private ProgressBar gestureLevel;
    private View gesturePanel;
    private TextView gestureText;
    private TextView hint;
    private boolean inPip;
    private int index;
    private ImageButton infoButton;
    private TextView infoView;
    private boolean infoVisible;
    private boolean isTv;
    private ImageButton leftButton;
    private ImageButton listButton;
    private TextView liveBadge;
    private int liveRetries;
    private EpgStore.Programme liveShow;
    private boolean locked;
    private View nextCard;
    private int nextCountdown;
    private TextView nextLabel;
    private TextView nextPlay;
    private View nextRow;
    private TextView nextTimeView;
    private TextView nextTitle;
    private TextView nextView;
    private TextView nowDescView;
    private TextView nowLeftView;
    private TextView nowView;
    private TextView numberView;
    private ImageButton pipButton;
    private ImageButton playButton;
    private ExoPlayer player;
    private long playingSince;
    private TextView positionView;
    private boolean resultSent;
    private View returnFocus;
    private ImageButton rightButton;
    private View root;
    private SeekBar seekBar;
    private View seekRow;
    private RecyclerView sideList;
    private View sidePanel;
    private View sideScrim;
    private TextView sideTitle;
    private long sleepAtMs;
    private int sleepMinutes;
    private TextView subtitleView;
    private SubtitleView subtitles;
    private SurfaceView surface;
    private TextView titleView;
    private TextView toolAspect;
    private TextView toolAudio;
    private TextView toolEpisodes;
    private TextView toolLive;
    private TextView toolLock;
    private TextView toolQuality;
    private TextView toolRestart;
    private TextView toolSleep;
    private TextView toolSpeed;
    private TextView toolSubtitles;
    private View topBar;
    private ImageButton unlockButton;
    private boolean userSeeking;
    private float videoAspect;
    private AspectRatioFrameLayout videoFrame;
    private static final String[] ASPECT_MODES = {"fit", "fill", "zoom", "16:9", "4:3"};
    private static final String[] ASPECT_LABELS = {"Sığdır", "Doldur", "Yakınlaştır", "16:9", "4:3"};
    private static final String[] ASPECT_HINTS = {"Görüntünün tamamı görünür", "Ekranı doldurur, görüntü esner", "Ekranı doldurur, kenarlar kırpılır", "Geniş ekran oranına zorlar", "Klasik TV oranına zorlar"};
    private static final float[] SPEEDS = {0.5f, 0.75f, 1.0f, 1.25f, 1.5f, 2.0f};
    private static final int[] SLEEP_MINUTES = {0, 15, 30, 45, 60, 90, 120};
    private static final float[] SUBTITLE_SCALES = {0.8f, 1.0f, 1.3f, 1.6f};
    private static final String[] SUBTITLE_SCALE_LABELS = {"Küçük", "Normal", "Büyük", "Çok büyük"};
    private static final Locale TURKISH = Locale.forLanguageTag("tr-TR");
    private static WeakReference<PlayerActivity> current = new WeakReference<>(null);
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService background = Executors.newSingleThreadExecutor();
    private final Map<String, SessionStat> sessions = new LinkedHashMap();
    private final SimpleDateFormat clockFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
    private final RowAdapter sideAdapter = new RowAdapter();
    private final Set<Integer> swallowedKeys = new HashSet();
    private final StringBuilder numberBuffer = new StringBuilder();
    private List<PlayerItem> items = Collections.emptyList();
    private PlayerConfig config = new PlayerConfig();
    private String catchupTitle = "";
    private float speed = 1.0f;
    private float subtitleScale = 1.0f;
    private long resumePositionMs = C.TIME_UNSET;
    private int lastChannelIndex = -1;
    private int pendingZapIndex = -1;
    private int sideMode = 0;
    private List<Runnable> sideActions = Collections.emptyList();
    private String videoDecoder = "";
    private float brightness = -1.0f;
    private float volume = -1.0f;
    private long gestureSeekBase = C.TIME_UNSET;
    private long pendingSeekMs = C.TIME_UNSET;
    private final Runnable hideControlsRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda44
        @Override // java.lang.Runnable
        public final void run() {
            this.f$0.hideControls();
        }
    };
    private final Runnable hideHintRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda47
        @Override // java.lang.Runnable
        public final void run() {
            this.f$0.lambda$new$0();
        }
    };
    private final Runnable hideGestureRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda48
        @Override // java.lang.Runnable
        public final void run() {
            this.f$0.lambda$new$1();
        }
    };
    private final Runnable hideUnlockRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda49
        @Override // java.lang.Runnable
        public final void run() {
            this.f$0.lambda$new$2();
        }
    };
    private final Runnable zapRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda50
        @Override // java.lang.Runnable
        public final void run() {
            this.f$0.lambda$new$3();
        }
    };
    private final Runnable numberRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda51
        @Override // java.lang.Runnable
        public final void run() throws NumberFormatException {
            this.f$0.commitNumber();
        }
    };
    private final Runnable sleepRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda1
        @Override // java.lang.Runnable
        public final void run() {
            this.f$0.onSleepTimer();
        }
    };
    private final Runnable nextRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda2
        @Override // java.lang.Runnable
        public final void run() {
            this.f$0.nextCountdownTick();
        }
    };
    private final Runnable seekRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda3
        @Override // java.lang.Runnable
        public final void run() {
            this.f$0.commitPendingSeek();
        }
    };
    private final Runnable tickRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity.1
        @Override // java.lang.Runnable
        public void run() {
            PlayerActivity.this.tick();
            PlayerActivity.this.handler.postDelayed(this, 1000L);
        }
    };
    private final Player.Listener playerListener = new Player.Listener() { // from class: com.zendit.play.PlayerActivity.4
        @Override // androidx.media3.common.Player.Listener
        public void onIsPlayingChanged(boolean isPlaying) {
            PlayerActivity.this.flushWatchTime();
            PlayerActivity.this.updatePlayButton();
            if (isPlaying) {
                PlayerActivity.this.scheduleHide();
            } else if (PlayerActivity.this.player != null && !PlayerActivity.this.player.getPlayWhenReady() && PlayerActivity.this.player.getPlaybackState() == 3) {
                PlayerActivity.this.showControls(false);
                PlayerActivity.this.handler.removeCallbacks(PlayerActivity.this.hideControlsRunnable);
            }
        }

        @Override // androidx.media3.common.Player.Listener
        public void onPlaybackStateChanged(int state) {
            PlayerActivity.this.buffering.setVisibility(state == 2 ? 0 : 8);
            if (state == 3) {
                PlayerActivity.this.liveRetries = 0;
                PlayerActivity.this.hideError();
            } else if (state == 4) {
                PlayerActivity.this.onEnded();
            }
            PlayerActivity.this.updatePlayButton();
            PlayerActivity.this.updateProgress();
        }

        @Override // androidx.media3.common.Player.Listener
        public void onPlayerError(PlaybackException error) {
            PlayerActivity.this.buffering.setVisibility(8);
            if (PlayerActivity.this.catchupItem != null) {
                PlayerActivity.this.exitCatchup("Bu program arşivden açılamadı, canlı yayına dönüldü");
            } else if (PlayerActivity.this.live() && PlayerActivity.this.liveRetries < 3) {
                PlayerActivity.this.retryLive(error);
            } else {
                PlayerActivity.this.showError(error);
            }
        }

        @Override // androidx.media3.common.Player.Listener
        public void onVideoSizeChanged(VideoSize size) {
            PlayerActivity.this.videoAspect = (size.width == 0 || size.height == 0) ? 0.0f : (size.width * size.pixelWidthHeightRatio) / size.height;
            PlayerActivity.this.applyAspect();
            PlayerActivity.this.updatePipParams();
        }

        @Override // androidx.media3.common.Player.Listener
        public void onCues(CueGroup cueGroup) {
            PlayerActivity.this.subtitles.setCues(cueGroup.cues);
        }

        @Override // androidx.media3.common.Player.Listener
        public void onTracksChanged(Tracks tracks) {
            PlayerActivity.this.updateToolLabels();
        }
    };
    private final AnalyticsListener analyticsListener = new AnalyticsListener() { // from class: com.zendit.play.PlayerActivity.5
        @Override // androidx.media3.exoplayer.analytics.AnalyticsListener
        public void onVideoDecoderInitialized(AnalyticsListener.EventTime eventTime, String decoderName, long initializedTimestampMs, long initializationDurationMs) {
            PlayerActivity.this.videoDecoder = decoderName;
        }
    };

    private static final class SessionStat {
        boolean completed;
        long durationMs;
        final String id;
        long positionMs;
        long watchedMs;

        SessionStat(String id) {
            this.id = id;
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$new$0() {
        this.hint.setVisibility(8);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$new$1() {
        this.gesturePanel.setVisibility(8);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$new$2() {
        this.unlockButton.setVisibility(8);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$new$3() {
        if (this.pendingZapIndex >= 0) {
            int target = this.pendingZapIndex;
            this.pendingZapIndex = -1;
            playItem(target, 0L, false);
        }
    }

    @Override // androidx.fragment.app.FragmentActivity, androidx.activity.ComponentActivity, androidx.core.app.ComponentActivity, android.app.Activity
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        PlayerActivity previous = current.get();
        if (previous != null && previous != this) {
            previous.finish();
        }
        current = new WeakReference<>(this);
        UiModeManager uiMode = (UiModeManager) getSystemService("uimode");
        boolean z = true;
        this.isTv = uiMode != null && uiMode.getCurrentModeType() == 4;
        this.audioManager = (AudioManager) getSystemService(MimeTypes.BASE_TYPE_AUDIO);
        this.epg = EpgStore.get(this);
        readSession();
        if (this.items.isEmpty()) {
            finish();
            return;
        }
        setContentView(R.layout.zendit_player);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(z) { // from class: com.zendit.play.PlayerActivity.2
            @Override // androidx.activity.OnBackPressedCallback
            public void handleOnBackPressed() {
                PlayerActivity.this.onBackAction();
            }
        });
        bindViews();
        setupWindow();
        setupControls();
        this.aspectIndex = Math.max(0, Arrays.asList(ASPECT_MODES).indexOf(this.config.aspectMode));
        this.subtitleScale = this.config.subtitleScale > 0.0f ? this.config.subtitleScale : 1.0f;
        applyAspect();
        applySubtitleStyle();
        updateMeta();
    }

    @Override // androidx.appcompat.app.AppCompatActivity, androidx.fragment.app.FragmentActivity, android.app.Activity
    protected void onStart() {
        super.onStart();
        if (this.items.isEmpty()) {
            return;
        }
        startPlayer();
        this.handler.removeCallbacks(this.tickRunnable);
        this.handler.post(this.tickRunnable);
    }

    @Override // androidx.appcompat.app.AppCompatActivity, androidx.fragment.app.FragmentActivity, android.app.Activity
    protected void onStop() {
        super.onStop();
        this.handler.removeCallbacks(this.tickRunnable);
        releasePlayer();
    }

    @Override // androidx.appcompat.app.AppCompatActivity, androidx.fragment.app.FragmentActivity, android.app.Activity
    protected void onDestroy() {
        super.onDestroy();
        this.handler.removeCallbacksAndMessages(null);
        this.background.shutdownNow();
        if (current.get() == this) {
            current.clear();
        }
    }

    @Override // android.app.Activity
    public void finish() {
        if (!this.resultSent) {
            this.resultSent = true;
            Intent data = new Intent();
            data.putExtra(EXTRA_RESULT, buildResult().toString());
            setResult(-1, data);
        }
        super.finish();
    }

    private void readSession() {
        String legacyUrl = getIntent().getStringExtra(EXTRA_URL);
        if (legacyUrl != null && !legacyUrl.isEmpty()) {
            String title = getIntent().getStringExtra(EXTRA_TITLE);
            boolean live = getIntent().getBooleanExtra(EXTRA_LIVE, false);
            String str = EXTRA_LIVE;
            String str2 = title == null ? "" : title;
            if (!live) {
                str = "movie";
            }
            this.items = Collections.singletonList(new PlayerItem(legacyUrl, legacyUrl, str2, "", str, 0, "", "", 0L));
            this.index = 0;
            return;
        }
        this.items = new ArrayList(PlayerSession.items());
        this.index = PlayerSession.startIndex();
        this.config = PlayerSession.config();
    }

    private void bindViews() {
        this.root = findViewById(R.id.zp_root);
        this.videoFrame = (AspectRatioFrameLayout) findViewById(R.id.zp_video_frame);
        this.surface = (SurfaceView) findViewById(R.id.zp_surface);
        this.subtitles = (SubtitleView) findViewById(R.id.zp_subtitles);
        this.buffering = (ProgressBar) findViewById(R.id.zp_buffering);
        this.gesturePanel = findViewById(R.id.zp_gesture_panel);
        this.gestureIcon = (ImageView) findViewById(R.id.zp_gesture_icon);
        this.gestureText = (TextView) findViewById(R.id.zp_gesture_text);
        this.gestureLevel = (ProgressBar) findViewById(R.id.zp_gesture_level);
        this.hint = (TextView) findViewById(R.id.zp_hint);
        this.numberView = (TextView) findViewById(R.id.zp_number);
        this.infoView = (TextView) findViewById(R.id.zp_info);
        this.controls = findViewById(R.id.zp_controls);
        this.topBar = findViewById(R.id.zp_top_bar);
        this.bottomBar = findViewById(R.id.zp_bottom_bar);
        this.titleView = (TextView) findViewById(R.id.zp_title);
        this.subtitleView = (TextView) findViewById(R.id.zp_subtitle);
        this.clockView = (TextView) findViewById(R.id.zp_clock);
        this.listButton = (ImageButton) findViewById(R.id.zp_list);
        this.infoButton = (ImageButton) findViewById(R.id.zp_info_button);
        this.pipButton = (ImageButton) findViewById(R.id.zp_pip);
        this.leftButton = (ImageButton) findViewById(R.id.zp_left);
        this.playButton = (ImageButton) findViewById(R.id.zp_play);
        this.rightButton = (ImageButton) findViewById(R.id.zp_right);
        this.epgRow = findViewById(R.id.zp_epg_row);
        this.liveBadge = (TextView) findViewById(R.id.zp_live_badge);
        this.nowView = (TextView) findViewById(R.id.zp_now);
        this.nextView = (TextView) findViewById(R.id.zp_next);
        this.nowLeftView = (TextView) findViewById(R.id.zp_now_left);
        this.nowDescView = (TextView) findViewById(R.id.zp_now_desc);
        this.nextTimeView = (TextView) findViewById(R.id.zp_next_time);
        this.nextRow = findViewById(R.id.zp_next_row);
        this.seekRow = findViewById(R.id.zp_seek_row);
        this.positionView = (TextView) findViewById(R.id.zp_position);
        this.seekBar = (SeekBar) findViewById(R.id.zp_seek);
        this.epgProgress = (ProgressBar) findViewById(R.id.zp_epg_progress);
        this.durationView = (TextView) findViewById(R.id.zp_duration);
        this.toolAudio = (TextView) findViewById(R.id.zp_tool_audio);
        this.toolSubtitles = (TextView) findViewById(R.id.zp_tool_subtitles);
        this.toolQuality = (TextView) findViewById(R.id.zp_tool_quality);
        this.toolAspect = (TextView) findViewById(R.id.zp_tool_aspect);
        this.toolSpeed = (TextView) findViewById(R.id.zp_tool_speed);
        this.toolEpisodes = (TextView) findViewById(R.id.zp_tool_episodes);
        this.toolRestart = (TextView) findViewById(R.id.zp_tool_restart);
        this.toolLive = (TextView) findViewById(R.id.zp_tool_live);
        this.toolSleep = (TextView) findViewById(R.id.zp_tool_sleep);
        this.toolLock = (TextView) findViewById(R.id.zp_tool_lock);
        this.unlockButton = (ImageButton) findViewById(R.id.zp_unlock);
        this.nextCard = findViewById(R.id.zp_next_card);
        this.nextLabel = (TextView) findViewById(R.id.zp_next_label);
        this.nextTitle = (TextView) findViewById(R.id.zp_next_title);
        this.nextPlay = (TextView) findViewById(R.id.zp_next_play);
        this.errorPanel = findViewById(R.id.zp_error);
        this.errorTitle = (TextView) findViewById(R.id.zp_error_title);
        this.errorDetail = (TextView) findViewById(R.id.zp_error_detail);
        this.errorRetry = (TextView) findViewById(R.id.zp_error_retry);
        this.sideScrim = findViewById(R.id.zp_side_scrim);
        this.sidePanel = findViewById(R.id.zp_side_panel);
        this.sideTitle = (TextView) findViewById(R.id.zp_side_title);
        this.sideList = (RecyclerView) findViewById(R.id.zp_side_list);
    }

    private void setupWindow() {
        int i;
        getWindow().addFlags(128);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            if (Build.VERSION.SDK_INT >= 30) {
                i = 3;
            } else {
                i = 1;
            }
            lp.layoutInDisplayCutoutMode = i;
            getWindow().setAttributes(lp);
        }
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.hide(WindowInsetsCompat.Type.systemBars());
        bars.setSystemBarsBehavior(2);
        ViewCompat.setOnApplyWindowInsetsListener(this.root, new OnApplyWindowInsetsListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda43
            @Override // androidx.core.view.OnApplyWindowInsetsListener
            public final WindowInsetsCompat onApplyWindowInsets(View view, WindowInsetsCompat windowInsetsCompat) {
                return this.f$0.lambda$setupWindow$4(view, windowInsetsCompat);
            }
        });
        final View center = findViewById(R.id.zp_center);
        View.OnLayoutChangeListener recenter = new View.OnLayoutChangeListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda45
            @Override // android.view.View.OnLayoutChangeListener
            public final void onLayoutChange(View view, int i2, int i3, int i4, int i5, int i6, int i7, int i8, int i9) {
                this.f$0.lambda$setupWindow$5(center, view, i2, i3, i4, i5, i6, i7, i8, i9);
            }
        };
        this.topBar.addOnLayoutChangeListener(recenter);
        this.bottomBar.addOnLayoutChangeListener(recenter);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ WindowInsetsCompat lambda$setupWindow$4(View v, WindowInsetsCompat insets) {
        Insets safe = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
        this.topBar.setPadding(dp(16) + safe.left, dp(16) + safe.top, dp(16) + safe.right, 0);
        this.bottomBar.setPadding(dp(20) + safe.left, 0, dp(20) + safe.right, dp(18) + safe.bottom);
        this.sidePanel.setPadding(safe.left, dp(20) + safe.top, safe.right, safe.bottom);
        return insets;
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupWindow$5(View center, View v, int l, int t, int r, int b, int ol, int ot, int or, int ob) {
        int free = this.bottomBar.getTop() - this.topBar.getBottom();
        if (free <= 0 || center.getHeight() == 0) {
            return;
        }
        float middle = this.topBar.getBottom() + (free / 2.0f);
        center.setTranslationY(middle - (center.getTop() + (center.getHeight() / 2.0f)));
    }

    @Override // android.app.Activity, android.view.Window.Callback
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            bars.hide(WindowInsetsCompat.Type.systemBars());
        }
    }

    private void setupControls() {
        findViewById(R.id.zp_touch).setOnTouchListener(new PlayerGestures(this, this));
        findViewById(R.id.zp_back).setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda5
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$6(view);
            }
        });
        this.playButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda17
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$7(view);
            }
        });
        this.leftButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda24
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$8(view);
            }
        });
        this.rightButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda25
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$9(view);
            }
        });
        this.listButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda26
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$10(view);
            }
        });
        this.infoButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda27
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$11(view);
            }
        });
        this.pipButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda28
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$12(view);
            }
        });
        this.toolAudio.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda29
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$13(view);
            }
        });
        this.toolSubtitles.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda30
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$14(view);
            }
        });
        this.toolQuality.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda31
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$15(view);
            }
        });
        this.toolAspect.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda6
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$16(view);
            }
        });
        this.toolSpeed.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda7
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$17(view);
            }
        });
        this.toolEpisodes.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda8
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$18(view);
            }
        });
        this.toolRestart.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda9
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$19(view);
            }
        });
        this.toolLive.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda10
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$20(view);
            }
        });
        this.toolSleep.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda12
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$21(view);
            }
        });
        this.toolLock.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda13
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$22(view);
            }
        });
        findViewById(R.id.zp_tool_external).setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda14
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$23(view);
            }
        });
        this.unlockButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda15
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$24(view);
            }
        });
        this.seekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() { // from class: com.zendit.play.PlayerActivity.3
            @Override // android.widget.SeekBar.OnSeekBarChangeListener
            public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                if (!fromUser || PlayerActivity.this.player == null || PlayerActivity.this.live()) {
                    return;
                }
                long duration = PlayerActivity.this.player.getDuration();
                if (duration <= 0) {
                    return;
                }
                PlayerActivity.this.userSeeking = true;
                PlayerActivity.this.pendingSeekMs = (progress * duration) / 1000;
                PlayerActivity.this.positionView.setText(PlayerActivity.formatTime(PlayerActivity.this.pendingSeekMs));
                PlayerActivity.this.handler.removeCallbacks(PlayerActivity.this.seekRunnable);
                PlayerActivity.this.handler.postDelayed(PlayerActivity.this.seekRunnable, 600L);
                PlayerActivity.this.bump();
            }

            @Override // android.widget.SeekBar.OnSeekBarChangeListener
            public void onStartTrackingTouch(SeekBar bar) {
                PlayerActivity.this.userSeeking = true;
                PlayerActivity.this.handler.removeCallbacks(PlayerActivity.this.hideControlsRunnable);
            }

            @Override // android.widget.SeekBar.OnSeekBarChangeListener
            public void onStopTrackingTouch(SeekBar bar) {
                PlayerActivity.this.handler.removeCallbacks(PlayerActivity.this.seekRunnable);
                PlayerActivity.this.commitPendingSeek();
            }
        });
        this.errorRetry.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda16
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$25(view);
            }
        });
        findViewById(R.id.zp_error_external).setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda18
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$26(view);
            }
        });
        findViewById(R.id.zp_error_close).setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda19
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$27(view);
            }
        });
        this.nextPlay.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda20
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$28(view);
            }
        });
        findViewById(R.id.zp_next_cancel).setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda21
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$29(view);
            }
        });
        this.sideScrim.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda23
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                this.f$0.lambda$setupControls$30(view);
            }
        });
        this.sideList.setLayoutManager(new LinearLayoutManager(this));
        this.sideList.setAdapter(this.sideAdapter);
        this.sideList.setItemAnimator(null);
        this.pipButton.setVisibility(supportsPip() ? 0 : 8);
        this.toolLock.setVisibility(this.isTv ? 8 : 0);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$6(View v) {
        finish();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$7(View v) {
        togglePlay();
        bump();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$8(View v) {
        if (live()) {
            zap(-1);
        } else {
            seekBy(-10000L);
        }
        bump();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$9(View v) {
        if (live()) {
            zap(1);
        } else {
            seekBy(10000L);
        }
        bump();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$10(View v) {
        if (this.items.get(this.index).isLive()) {
            openChannelList(this.listButton);
        } else {
            openEpisodeList(this.listButton);
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$11(View v) {
        toggleInfo();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$12(View v) {
        enterPip();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$13(View v) {
        openTrackOptions(1, this.toolAudio);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$14(View v) {
        openTrackOptions(3, this.toolSubtitles);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$15(View v) {
        openTrackOptions(2, this.toolQuality);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$16(View v) {
        openAspectOptions();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$17(View v) {
        openSpeedOptions();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$18(View v) {
        openEpisodeList(this.toolEpisodes);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$19(View v) {
        if (live()) {
            if (this.liveShow != null) {
                startCatchup(this.liveShow);
            }
        } else if (this.player != null) {
            this.player.seekTo(0L);
            this.player.play();
            showHint("Baştan başlatıldı", 1500L);
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$20(View v) {
        exitCatchup("Canlı yayına dönüldü");
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$21(View v) {
        openSleepOptions();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$22(View v) {
        lock();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$23(View v) {
        openExternal();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$24(View v) {
        unlock();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$25(View v) {
        retry();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$26(View v) {
        openExternal();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$27(View v) {
        finish();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$28(View v) {
        playNext();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$29(View v) {
        cancelNextCountdown();
        showControls(true);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$setupControls$30(View v) {
        closeSide();
    }

    private void startPlayer() {
        if (this.player != null) {
            return;
        }
        this.player = StreamPlayers.create(this, this.config);
        this.player.addListener(this.playerListener);
        this.player.addAnalyticsListener(this.analyticsListener);
        this.player.setVideoSurfaceView(this.surface);
        this.player.setPlaybackParameters(new PlaybackParameters(this.speed));
        PlayerItem item = this.items.get(this.index);
        long start = this.resumePositionMs != C.TIME_UNSET ? this.resumePositionMs : item.startPositionMs;
        boolean resumedAfterStop = this.resumePositionMs != C.TIME_UNSET;
        this.resumePositionMs = C.TIME_UNSET;
        loadItem(start);
        if (!resumedAfterStop && start > 5000 && !item.isLive()) {
            showHint("Kaldığın yerden devam ediliyor · " + formatTime(start), 3500L);
        }
        showControls(false);
    }

    private void releasePlayer() {
        if (this.player == null) {
            return;
        }
        saveProgress();
        flushWatchTime();
        this.resumePositionMs = live() ? C.TIME_UNSET : this.player.getCurrentPosition();
        this.player.release();
        this.player = null;
        this.playingSince = 0L;
        this.buffering.setVisibility(8);
    }

    private void loadItem(long startMs) {
        if (this.player == null) {
            return;
        }
        PlayerItem item = current();
        hideError();
        this.liveRetries = 0;
        this.videoAspect = 0.0f;
        applyAspect();
        this.subtitles.setCues(Collections.emptyList());
        this.player.setMediaSource(StreamPlayers.mediaSource(this, item), startMs > 0 ? startMs : C.TIME_UNSET);
        this.player.prepare();
        this.player.setPlayWhenReady(true);
        sessionFor(this.items.get(this.index));
        updateMeta();
        fetchShortEpgIfNeeded(this.items.get(this.index));
    }

    private PlayerItem current() {
        return this.catchupItem != null ? this.catchupItem : this.items.get(this.index);
    }

    private void startCatchup(EpgStore.Programme show) {
        PlayerItem channel = this.items.get(this.index);
        long now = System.currentTimeMillis();
        if (this.player == null || !channel.archiveCovers(show.start, now)) {
            showHint("Bu program arşivde yok", 2000L);
            return;
        }
        String url = CatchupUrl.build(channel.catchup, channel.catchupTz, show.start, show.stop, now);
        flushWatchTime();
        this.catchupItem = new PlayerItem("catchup|" + channel.id + "|" + show.start, url, channel.title, channel.subtitle, "catchup", channel.number, channel.userAgent, "", 0L);
        this.catchupStart = show.start;
        this.catchupStop = show.stop;
        this.catchupTitle = show.title;
        loadItem(0L);
        showHint("Program baştan oynatılıyor\n" + show.title, 2500L);
        showControls(true);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void exitCatchup(String message) {
        if (this.catchupItem == null) {
            return;
        }
        flushWatchTime();
        this.catchupItem = null;
        loadItem(C.TIME_UNSET);
        showHint(message, 2500L);
    }

    private void playItem(int newIndex, long startMs, boolean announce) {
        if (this.player == null || newIndex < 0 || newIndex >= this.items.size()) {
            return;
        }
        cancelNextCountdown();
        saveProgress();
        flushWatchTime();
        if (newIndex != this.index && this.items.get(this.index).isLive()) {
            this.lastChannelIndex = this.index;
        }
        this.catchupItem = null;
        this.index = newIndex;
        loadItem(startMs);
        if (announce) {
            showHint(itemLabel(this.items.get(this.index)), 2500L);
        }
    }

    private void togglePlay() {
        if (this.player == null) {
            return;
        }
        if (this.player.getPlaybackState() == 4) {
            this.player.seekTo(0L);
            this.player.play();
        } else if (this.player.getPlayWhenReady()) {
            this.player.pause();
        } else {
            if (live()) {
                this.player.seekToDefaultPosition();
            }
            this.player.play();
        }
        updatePlayButton();
    }

    private void retry() {
        hideError();
        this.liveRetries = 0;
        if (this.player == null) {
            return;
        }
        if (live()) {
            this.player.seekToDefaultPosition();
        }
        this.player.prepare();
        this.player.play();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void retryLive(PlaybackException error) {
        this.liveRetries++;
        long delayMs = (error == null || error.errorCode != 1002) ? 2000L : 0L;
        showHint("Bağlantı koptu, yeniden bağlanılıyor…", 2500L);
        this.handler.postDelayed(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda33
            @Override // java.lang.Runnable
            public final void run() {
                this.f$0.lambda$retryLive$31();
            }
        }, delayMs);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$retryLive$31() {
        if (this.player != null) {
            this.player.seekToDefaultPosition();
            this.player.prepare();
            this.player.play();
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void onEnded() {
        if (this.catchupItem != null) {
            exitCatchup("Program bitti, canlı yayına dönüldü");
            return;
        }
        PlayerItem item = this.items.get(this.index);
        if (item.isLive()) {
            if (this.liveRetries < 3) {
                retryLive(null);
                return;
            }
            return;
        }
        SessionStat stat = sessionFor(item);
        stat.completed = true;
        saveProgress();
        if (this.config.autoPlayNext && this.index + 1 < this.items.size()) {
            startNextCountdown();
        } else {
            finish();
        }
    }

    private SessionStat sessionFor(PlayerItem item) {
        SessionStat stat = this.sessions.get(item.id);
        if (stat == null) {
            SessionStat stat2 = new SessionStat(item.id);
            this.sessions.put(item.id, stat2);
            return stat2;
        }
        return stat;
    }

    private void saveProgress() {
        if (this.player == null || this.items.isEmpty()) {
            return;
        }
        PlayerItem item = this.items.get(this.index);
        if (item.isLive()) {
            return;
        }
        SessionStat stat = sessionFor(item);
        stat.positionMs = this.player.getCurrentPosition();
        long duration = this.player.getDuration();
        if (duration != C.TIME_UNSET && duration > 0) {
            stat.durationMs = duration;
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void flushWatchTime() {
        if (this.items.isEmpty()) {
            return;
        }
        long now = SystemClock.elapsedRealtime();
        long j = 0;
        if (this.playingSince > 0) {
            sessionFor(this.items.get(this.index)).watchedMs += now - this.playingSince;
        }
        if (this.player != null && this.player.isPlaying()) {
            j = now;
        }
        this.playingSince = j;
    }

    private JSONObject buildResult() throws JSONException {
        saveProgress();
        flushWatchTime();
        JSONObject jSONObject = new JSONObject();
        try {
            jSONObject.put("lastIndex", this.index);
            jSONObject.put("lastId", this.items.isEmpty() ? "" : this.items.get(this.index).id);
            jSONObject.put("aspectMode", ASPECT_MODES[this.aspectIndex]);
            jSONObject.put("subtitleScale", this.subtitleScale);
            JSONArray list = new JSONArray();
            for (SessionStat s : this.sessions.values()) {
                JSONObject o = new JSONObject();
                o.put(TtmlNode.ATTR_ID, s.id);
                o.put("watchedMs", s.watchedMs);
                o.put("positionMs", s.positionMs);
                o.put("durationMs", s.durationMs);
                o.put("completed", s.completed);
                list.put(o);
            }
            jSONObject.put("sessions", list);
        } catch (JSONException e) {
        }
        return jSONObject;
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void showControls(boolean focusPlay) {
        if (this.inPip || this.items.isEmpty()) {
            return;
        }
        if (this.locked) {
            showUnlockButton();
            return;
        }
        if (!this.controlsVisible) {
            this.controlsVisible = true;
            this.controls.animate().cancel();
            this.controls.setAlpha(0.0f);
            this.controls.setVisibility(0);
            this.controls.animate().alpha(1.0f).setDuration(150L).start();
            updateProgress();
            updateLiveEpg();
            updateToolLabels();
        }
        if (focusPlay || (this.isTv && this.controls.findFocus() == null)) {
            this.playButton.requestFocus();
        }
        scheduleHide();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void hideControls() {
        if (!this.controlsVisible) {
            return;
        }
        if (this.userSeeking) {
            scheduleHide();
            return;
        }
        this.controlsVisible = false;
        this.handler.removeCallbacks(this.hideControlsRunnable);
        this.controls.animate().cancel();
        this.controls.animate().alpha(0.0f).setDuration(200L).withEndAction(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda22
            @Override // java.lang.Runnable
            public final void run() {
                this.f$0.lambda$hideControls$32();
            }
        }).start();
        this.root.requestFocus();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$hideControls$32() {
        if (!this.controlsVisible) {
            this.controls.setVisibility(8);
        }
    }

    private void hideControlsNow() {
        this.controlsVisible = false;
        this.handler.removeCallbacks(this.hideControlsRunnable);
        this.controls.animate().cancel();
        this.controls.setVisibility(8);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void scheduleHide() {
        this.handler.removeCallbacks(this.hideControlsRunnable);
        if (this.player != null && this.player.getPlayWhenReady() && this.sideMode == 0 && this.errorPanel.getVisibility() != 0) {
            this.handler.postDelayed(this.hideControlsRunnable, HIDE_DELAY_MS);
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void bump() {
        if (this.controlsVisible) {
            scheduleHide();
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void updatePlayButton() {
        boolean playing = (this.player == null || !this.player.getPlayWhenReady() || this.player.getPlaybackState() == 4) ? false : true;
        this.playButton.setImageResource(playing ? R.drawable.zp_ic_pause : R.drawable.zp_ic_play);
        this.playButton.setContentDescription(playing ? "Duraklat" : "Oynat");
    }

    private void updateMeta() {
        PlayerItem item = this.items.get(this.index);
        boolean catchup = this.catchupItem != null;
        boolean live = item.isLive() && !catchup;
        boolean multiple = this.items.size() > 1;
        this.titleView.setText((!item.isLive() || item.number <= 0) ? item.title : item.number + "   " + item.title);
        this.subtitleView.setText(catchup ? "Baştan izleniyor  ·  " + clock(this.catchupStart) + " – " + clock(this.catchupStop) : item.subtitle);
        this.subtitleView.setVisibility((!item.subtitle.isEmpty() || item.isLive()) ? 0 : 8);
        this.leftButton.setImageResource(live ? R.drawable.zp_ic_skip_previous : R.drawable.zp_ic_replay);
        this.rightButton.setImageResource(live ? R.drawable.zp_ic_skip_next : R.drawable.zp_ic_forward);
        this.leftButton.setContentDescription(live ? "Önceki kanal" : "10 saniye geri");
        this.rightButton.setContentDescription(live ? "Sonraki kanal" : "10 saniye ileri");
        int sideButtons = (!live || multiple) ? 0 : 4;
        this.leftButton.setVisibility(sideButtons);
        this.rightButton.setVisibility(sideButtons);
        this.listButton.setVisibility(multiple ? 0 : 8);
        this.listButton.setContentDescription(item.isLive() ? "Kanal listesi" : "Bölümler");
        this.liveBadge.setVisibility((live || catchup) ? 0 : 8);
        this.liveBadge.setText(catchup ? "BAŞTAN" : "CANLI");
        this.liveBadge.setBackgroundResource(catchup ? R.drawable.zp_next_badge : R.drawable.zp_live_badge);
        this.epgRow.setVisibility((live || catchup) ? 0 : 8);
        this.seekRow.setVisibility(live ? 8 : 0);
        this.seekBar.setVisibility(live ? 8 : 0);
        this.epgProgress.setVisibility(live ? 0 : 8);
        this.toolSpeed.setVisibility(live ? 8 : 0);
        this.toolRestart.setText(live ? "Baştan izle" : "Baştan başlat");
        this.toolRestart.setVisibility((!live || canRestartLive()) ? 0 : 8);
        this.toolLive.setVisibility(catchup ? 0 : 8);
        this.toolEpisodes.setVisibility((item.isLive() || catchup || !multiple) ? 8 : 0);
        if (catchup) {
            this.nowView.setText(this.catchupTitle);
            this.nowLeftView.setVisibility(8);
            this.nowDescView.setVisibility(8);
            this.nextRow.setVisibility(8);
        }
        updateToolLabels();
        updateLiveEpg();
        updateProgress();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void updateToolLabels() {
        this.toolAspect.setText(ASPECT_LABELS[this.aspectIndex]);
        this.toolSpeed.setText("Hız " + speedLabel(this.speed));
        this.toolSpeed.setActivated(this.speed != 1.0f);
        if (this.sleepAtMs > 0) {
            long minutes = Math.max(1L, ((this.sleepAtMs - SystemClock.elapsedRealtime()) + 59999) / 60000);
            this.toolSleep.setText("Uyku " + minutes + " dk");
        } else {
            this.toolSleep.setText("Uyku");
        }
        this.toolSleep.setActivated(this.sleepAtMs > 0);
        if (this.player == null) {
            return;
        }
        Tracks tracks = this.player.getCurrentTracks();
        int audio = countTracks(tracks, 1);
        int text = countTracks(tracks, 3);
        int video = countTracks(tracks, 2);
        this.toolAudio.setText(audio > 1 ? "Ses (" + audio + ")" : "Ses");
        this.toolSubtitles.setText(text > 0 ? "Altyazı (" + text + ")" : "Altyazı");
        this.toolSubtitles.setActivated(isTextSelected(tracks));
        this.toolQuality.setVisibility(video <= 1 ? 8 : 0);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void tick() {
        this.clockView.setText(this.clockFormat.format(new Date()));
        if (this.controlsVisible) {
            updateProgress();
            if (live()) {
                updateLiveEpg();
            }
            if (this.sleepAtMs > 0) {
                updateToolLabels();
            }
        }
        if (this.infoVisible) {
            updateInfo();
        }
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void updateProgress() {
        if (this.player == null || this.items.isEmpty() || live()) {
            return;
        }
        long position = this.player.getCurrentPosition();
        long duration = this.player.getDuration();
        if (duration == C.TIME_UNSET || duration <= 0) {
            this.positionView.setText(formatTime(position));
            this.durationView.setText("--:--");
            return;
        }
        if (!this.userSeeking) {
            this.positionView.setText(formatTime(position));
            this.seekBar.setProgress((int) ((position * 1000) / duration));
        }
        this.seekBar.setSecondaryProgress((int) ((this.player.getBufferedPosition() * 1000) / duration));
        this.seekBar.setKeyProgressIncrement(Math.max(1, (int) (10000000 / duration)));
        this.durationView.setText(formatTime(duration));
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void updateLiveEpg() {
        if (!this.items.isEmpty()) {
            PlayerItem item = this.items.get(this.index);
            if (!item.isLive() || this.catchupItem != null) {
                return;
            }
            long now = System.currentTimeMillis();
            EpgStore.Programme currentShow = null;
            EpgStore.Programme nextShow = null;
            for (EpgStore.Programme p : this.epg.range(item.id, now, 43200000 + now, 3)) {
                if (p.start <= now && now < p.stop) {
                    currentShow = p;
                } else if (p.start >= now && nextShow == null) {
                    nextShow = p;
                }
            }
            this.liveShow = currentShow;
            this.toolRestart.setVisibility(canRestartLive() ? 0 : 8);
            if (currentShow != null) {
                this.nowView.setText(currentShow.title);
                long minutesLeft = Math.max(1L, ((currentShow.stop - now) + 59999) / 60000);
                this.nowLeftView.setText(remaining(minutesLeft));
                this.nowLeftView.setVisibility(0);
                String desc = currentShow.desc == null ? "" : currentShow.desc.trim();
                this.nowDescView.setText(desc);
                boolean roomy = getResources().getConfiguration().screenHeightDp >= 480;
                this.nowDescView.setVisibility((desc.isEmpty() || !roomy) ? 8 : 0);
                String times = clock(currentShow.start) + " – " + clock(currentShow.stop);
                this.subtitleView.setText(item.subtitle.isEmpty() ? times : times + "  ·  " + item.subtitle);
                this.seekRow.setVisibility(0);
                this.positionView.setText(clock(currentShow.start));
                this.durationView.setText(clock(currentShow.stop));
                this.epgProgress.setProgress((int) (((now - currentShow.start) * 1000) / Math.max(1L, currentShow.stop - currentShow.start)));
            } else {
                this.nowView.setText("Program bilgisi yok");
                this.nowLeftView.setVisibility(8);
                this.nowDescView.setVisibility(8);
                this.subtitleView.setText(item.subtitle);
                this.seekRow.setVisibility(8);
            }
            if (nextShow != null) {
                this.nextTimeView.setText(clock(nextShow.start));
                this.nextView.setText(nextShow.title);
                this.nextRow.setVisibility(0);
                return;
            }
            this.nextRow.setVisibility(8);
        }
    }

    private boolean canRestartLive() {
        if (!live() || this.liveShow == null) {
            return false;
        }
        return this.items.get(this.index).archiveCovers(this.liveShow.start, System.currentTimeMillis());
    }

    private static String remaining(long minutes) {
        if (minutes < 60) {
            return minutes + " dk kaldı";
        }
        return (minutes % 60 == 0 ? new StringBuilder().append(minutes / 60).append(" sa kaldı") : new StringBuilder().append(minutes / 60).append(" sa ").append(minutes % 60).append(" dk kaldı")).toString();
    }

    private void fetchShortEpgIfNeeded(final PlayerItem item) {
        if (!item.isLive() || item.shortEpgUrl.isEmpty()) {
            return;
        }
        long now = System.currentTimeMillis();
        if (!this.epg.range(item.id, now, 1 + now, 1).isEmpty()) {
            return;
        }
        this.background.execute(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda46
            @Override // java.lang.Runnable
            public final void run() throws IOException {
                this.f$0.lambda$fetchShortEpgIfNeeded$33(item);
            }
        });
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$fetchShortEpgIfNeeded$33(PlayerItem item) throws IOException {
        this.epg.fetchShortEpg(item.id, item.shortEpgUrl);
        runOnUiThread(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda11
            @Override // java.lang.Runnable
            public final void run() {
                this.f$0.updateLiveEpg();
            }
        });
    }

    private String itemLabel(PlayerItem item) {
        String label = (!item.isLive() || item.number <= 0) ? item.title : item.number + "  " + item.title;
        if (item.isLive()) {
            long now = System.currentTimeMillis();
            List<EpgStore.Programme> list = this.epg.range(item.id, now, 1 + now, 1);
            if (!list.isEmpty() && !list.get(0).title.isEmpty()) {
                return label + "\n" + list.get(0).title;
            }
            return label;
        }
        if (!item.subtitle.isEmpty()) {
            return label + "\n" + item.subtitle;
        }
        return label;
    }

    /* JADX INFO: Access modifiers changed from: private */
    public boolean live() {
        return !this.items.isEmpty() && this.items.get(this.index).isLive() && this.catchupItem == null;
    }

    private void zap(int delta) {
        if (this.items.size() < 2) {
            return;
        }
        int base = this.pendingZapIndex >= 0 ? this.pendingZapIndex : this.index;
        int target = (((base + delta) % this.items.size()) + this.items.size()) % this.items.size();
        this.pendingZapIndex = target;
        showHint(itemLabel(this.items.get(target)), 2000L);
        this.handler.removeCallbacks(this.zapRunnable);
        this.handler.postDelayed(this.zapRunnable, ZAP_DELAY_MS);
    }

    private void onDigit(int digit) {
        if (this.numberBuffer.length() >= 5) {
            this.numberBuffer.setLength(0);
        }
        this.numberBuffer.append(digit);
        this.numberView.setText(this.numberBuffer);
        this.numberView.setVisibility(0);
        this.handler.removeCallbacks(this.numberRunnable);
        this.handler.postDelayed(this.numberRunnable, NUMBER_DELAY_MS);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void commitNumber() throws NumberFormatException {
        this.numberView.setVisibility(8);
        if (this.numberBuffer.length() == 0) {
            return;
        }
        try {
            int number = Integer.parseInt(this.numberBuffer.toString());
            this.numberBuffer.setLength(0);
            for (int i = 0; i < this.items.size(); i++) {
                if (this.items.get(i).number == number) {
                    if (i != this.index) {
                        playItem(i, 0L, true);
                        return;
                    }
                    return;
                }
            }
            showHint("Kanal " + number + " bu listede yok", 2000L);
        } catch (NumberFormatException e) {
            this.numberBuffer.setLength(0);
        }
    }

    private void seekBy(long deltaMs) {
        if (this.player == null || live()) {
            return;
        }
        long duration = this.player.getDuration();
        long base = this.pendingSeekMs != C.TIME_UNSET ? this.pendingSeekMs : this.player.getCurrentPosition();
        long target = Math.max(0L, base + deltaMs);
        if (duration > 0) {
            target = Math.min(target, duration);
        }
        this.pendingSeekMs = target;
        String text = (deltaMs >= 0 ? "+" : "−") + (Math.abs(deltaMs) / 1000) + " sn\n" + formatTime(target) + (duration > 0 ? " / " + formatTime(duration) : "");
        showGesture(deltaMs >= 0 ? R.drawable.zp_ic_fast_forward : R.drawable.zp_ic_fast_rewind, text, duration > 0 ? (int) ((100 * target) / duration) : -1);
        this.handler.removeCallbacks(this.seekRunnable);
        this.handler.postDelayed(this.seekRunnable, 450L);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void commitPendingSeek() {
        if (this.player != null && this.pendingSeekMs != C.TIME_UNSET) {
            this.player.seekTo(this.pendingSeekMs);
        }
        this.pendingSeekMs = C.TIME_UNSET;
        this.userSeeking = false;
        hideGestureSoon();
        bump();
    }

    private long keySeekStep(KeyEvent event) {
        int repeat = event.getRepeatCount();
        if (repeat == 0) {
            return 10000L;
        }
        return Math.min(60000L, ((repeat / 4) + 1) * 10000);
    }

    private void openSide(int mode, String title, List<RowAdapter.Row> rows, int focusIndex, boolean leftSide, RowAdapter.OnPick pick, View from) {
        if (rows.isEmpty()) {
            return;
        }
        this.returnFocus = from;
        this.sideMode = mode;
        hideControlsNow();
        this.sideTitle.setText(title);
        this.sideAdapter.submit(rows, pick);
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) this.sidePanel.getLayoutParams();
        int width = this.root.getWidth() > 0 ? this.root.getWidth() : getResources().getDisplayMetrics().widthPixels;
        int height = this.root.getHeight() > 0 ? this.root.getHeight() : getResources().getDisplayMetrics().heightPixels;
        lp.width = Math.min(dp(leftSide ? 440 : 400), (int) (width * (width > height ? 0.46f : 0.9f)));
        lp.gravity = leftSide ? GravityCompat.START : GravityCompat.END;
        this.sidePanel.setLayoutParams(lp);
        this.sideScrim.setVisibility(0);
        this.sidePanel.setVisibility(0);
        this.sidePanel.setAlpha(0.0f);
        View view = this.sidePanel;
        int iDp = dp(40);
        if (leftSide) {
            iDp = -iDp;
        }
        view.setTranslationX(iDp);
        this.sidePanel.animate().alpha(1.0f).translationX(0.0f).setDuration(160L).start();
        final int target = Math.max(0, Math.min(focusIndex, rows.size() - 1));
        LinearLayoutManager layout = (LinearLayoutManager) this.sideList.getLayoutManager();
        if (layout != null) {
            layout.scrollToPositionWithOffset(target, dp(96));
        }
        this.sideList.post(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda0
            @Override // java.lang.Runnable
            public final void run() {
                this.f$0.lambda$openSide$34(target);
            }
        });
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$openSide$34(int target) {
        RecyclerView.ViewHolder holder = this.sideList.findViewHolderForAdapterPosition(target);
        if (holder != null) {
            holder.itemView.requestFocus();
        } else {
            this.sideList.requestFocus();
        }
    }

    private void closeSide() {
        if (this.sideMode == 0) {
            return;
        }
        this.sideMode = 0;
        this.sidePanel.animate().cancel();
        this.sidePanel.setVisibility(8);
        this.sideScrim.setVisibility(8);
        View back = this.returnFocus;
        this.returnFocus = null;
        if (back != null) {
            showControls(false);
            back.requestFocus();
        } else {
            this.root.requestFocus();
        }
    }

    private void openOptions(String title, List<RowAdapter.Row> rows, List<Runnable> actions, View from) {
        int focus;
        this.sideActions = actions;
        int i = 0;
        while (true) {
            if (i >= rows.size()) {
                focus = 0;
                break;
            } else if (!rows.get(i).checked) {
                i++;
            } else {
                int focus2 = i;
                focus = focus2;
                break;
            }
        }
        openSide(3, title, rows, focus, false, new RowAdapter.OnPick() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda37
            @Override // com.zendit.play.RowAdapter.OnPick
            public final void onPick(int i2) {
                this.f$0.lambda$openOptions$35(i2);
            }
        }, from);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$openOptions$35(int position) {
        Runnable action = position < this.sideActions.size() ? this.sideActions.get(position) : null;
        if (action == null) {
            return;
        }
        closeSide();
        action.run();
    }

    private void openChannelList(View from) {
        int i;
        if (this.items.size() < 2) {
            return;
        }
        long now = System.currentTimeMillis();
        List<RowAdapter.Row> rows = new ArrayList<>(this.items.size());
        int i2 = 0;
        while (i2 < this.items.size()) {
            PlayerItem item = this.items.get(i2);
            RowAdapter.Row row = new RowAdapter.Row();
            row.number = String.valueOf(item.number > 0 ? item.number : i2 + 1);
            row.title = item.title;
            row.current = i2 == this.index;
            List<EpgStore.Programme> list = this.epg.range(item.id, now, now + 1, 1);
            long now2 = now;
            if (!list.isEmpty()) {
                EpgStore.Programme p = list.get(0);
                row.subtitle = clock(p.start) + "  " + p.title;
                i = i2;
                row.progress = (int) (((now2 - p.start) * 100) / Math.max(1L, p.stop - p.start));
            } else {
                i = i2;
                row.subtitle = item.subtitle;
            }
            rows.add(row);
            i2 = i + 1;
            now = now2;
        }
        openSide(1, "Kanallar · " + this.items.size(), rows, this.index, true, new RowAdapter.OnPick() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda39
            @Override // com.zendit.play.RowAdapter.OnPick
            public final void onPick(int i3) {
                this.f$0.lambda$openChannelList$36(i3);
            }
        }, from);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$openChannelList$36(int position) {
        closeSide();
        if (position != this.index) {
            playItem(position, 0L, true);
        }
    }

    private void openEpisodeList(View from) {
        if (this.items.size() < 2) {
            return;
        }
        List<RowAdapter.Row> rows = new ArrayList<>(this.items.size());
        int i = 0;
        while (i < this.items.size()) {
            PlayerItem item = this.items.get(i);
            boolean z = false;
            RowAdapter.Row row = RowAdapter.Row.option(item.title, item.subtitle, false);
            row.current = i == this.index;
            if (i == this.index) {
                z = true;
            }
            row.checked = z;
            rows.add(row);
            i++;
        }
        openSide(2, "Bölümler", rows, this.index, false, new RowAdapter.OnPick() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda38
            @Override // com.zendit.play.RowAdapter.OnPick
            public final void onPick(int i2) {
                this.f$0.lambda$openEpisodeList$37(i2);
            }
        }, from);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$openEpisodeList$37(int position) {
        closeSide();
        if (position != this.index) {
            playItem(position, this.items.get(position).startPositionMs, true);
        }
    }

    private void openTrackOptions(final int type, View from) {
        boolean z;
        Runnable runnable;
        if (this.player == null) {
            return;
        }
        final TrackSelectionParameters params = this.player.getTrackSelectionParameters();
        boolean disabled = params.disabledTrackTypes.contains(Integer.valueOf(type));
        boolean overridden = hasOverride(params, type);
        List<RowAdapter.Row> rows = new ArrayList<>();
        List<Runnable> actions = new ArrayList<>();
        int i = 2;
        if (type == 3) {
            rows.add(RowAdapter.Row.option("Kapalı", null, disabled || !isTextSelected(this.player.getCurrentTracks())));
            actions.add(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda32
                @Override // java.lang.Runnable
                public final void run() {
                    this.f$0.lambda$openTrackOptions$38(params, type);
                }
            });
        } else if (type == 2) {
            rows.add(RowAdapter.Row.option("Otomatik", "Bağlantı hızına göre değişir", !overridden));
            actions.add(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda34
                @Override // java.lang.Runnable
                public final void run() {
                    this.f$0.lambda$openTrackOptions$39(params, type);
                }
            });
        }
        int count = 0;
        UnmodifiableIterator<Tracks.Group> it = this.player.getCurrentTracks().getGroups().iterator();
        while (it.hasNext()) {
            Tracks.Group group = it.next();
            if (group.getType() == type) {
                TrackGroup trackGroup = group.getMediaTrackGroup();
                int i2 = 0;
                while (i2 < group.length) {
                    Format format = group.getTrackFormat(i2);
                    int count2 = count + 1;
                    boolean supported = group.isTrackSupported(i2);
                    final String label = trackLabel(format, type, count2);
                    boolean selected = !disabled && group.isTrackSelected(i2) && (type != i || overridden);
                    RowAdapter.Row row = RowAdapter.Row.option(label, trackDetail(format, type, supported), selected);
                    row.enabled = supported;
                    rows.add(row);
                    Tracks.Group group2 = group;
                    final TrackGroup trackGroup2 = trackGroup;
                    final int trackIndex = i2;
                    actions.add(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda35
                        @Override // java.lang.Runnable
                        public final void run() {
                            this.f$0.lambda$openTrackOptions$40(params, type, trackGroup2, trackIndex, label);
                        }
                    });
                    i2++;
                    trackGroup = trackGroup2;
                    group = group2;
                    count = count2;
                    i = 2;
                }
                i = 2;
            }
        }
        if (count != 0) {
            z = false;
            runnable = null;
        } else {
            String what = type == 1 ? "ses dili" : type == 3 ? "altyazı" : "kalite seçeneği";
            z = false;
            runnable = null;
            RowAdapter.Row empty = RowAdapter.Row.option("Bu yayında seçilebilir " + what + " yok", null, false);
            empty.enabled = false;
            rows.add(empty);
            actions.add(null);
        }
        if (type == 3) {
            rows.add(RowAdapter.Row.header("Yazı boyutu"));
            actions.add(runnable);
            for (int s = 0; s < SUBTITLE_SCALES.length; s++) {
                final float scale = SUBTITLE_SCALES[s];
                final String label2 = SUBTITLE_SCALE_LABELS[s];
                rows.add(RowAdapter.Row.option(label2, null, Math.abs(this.subtitleScale - scale) < 0.01f ? true : z));
                actions.add(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda36
                    @Override // java.lang.Runnable
                    public final void run() {
                        this.f$0.lambda$openTrackOptions$41(scale, label2);
                    }
                });
            }
        }
        String title = type == 1 ? "Ses dili" : type == 3 ? "Altyazı" : "Görüntü kalitesi";
        openOptions(title, rows, actions, from);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$openTrackOptions$38(TrackSelectionParameters params, int type) {
        applyParams(params.buildUpon().clearOverridesOfType(type).setTrackTypeDisabled(type, true).build(), "Altyazı kapalı");
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$openTrackOptions$39(TrackSelectionParameters params, int type) {
        applyParams(params.buildUpon().clearOverridesOfType(type).build(), "Kalite: Otomatik");
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$openTrackOptions$40(TrackSelectionParameters params, int type, TrackGroup trackGroup, int trackIndex, String label) {
        applyParams(params.buildUpon().setTrackTypeDisabled(type, false).setOverrideForType(new TrackSelectionOverride(trackGroup, trackIndex)).build(), label);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$openTrackOptions$41(float scale, String label) {
        this.subtitleScale = scale;
        applySubtitleStyle();
        showHint("Altyazı boyutu: " + label, 1500L);
    }

    private void applyParams(TrackSelectionParameters params, String message) {
        if (this.player == null) {
            return;
        }
        this.player.setTrackSelectionParameters(params);
        showHint(message, 1500L);
        updateToolLabels();
    }

    private void openAspectOptions() {
        List<RowAdapter.Row> rows = new ArrayList<>();
        List<Runnable> actions = new ArrayList<>();
        int i = 0;
        while (i < ASPECT_MODES.length) {
            rows.add(RowAdapter.Row.option(ASPECT_LABELS[i], ASPECT_HINTS[i], i == this.aspectIndex));
            final int mode = i;
            actions.add(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda42
                @Override // java.lang.Runnable
                public final void run() {
                    this.f$0.lambda$openAspectOptions$42(mode);
                }
            });
            i++;
        }
        openOptions("Görüntü oranı", rows, actions, this.toolAspect);
    }

    private void openSpeedOptions() {
        List<RowAdapter.Row> rows = new ArrayList<>();
        List<Runnable> actions = new ArrayList<>();
        float[] fArr = SPEEDS;
        int length = fArr.length;
        for (int i = 0; i < length; i++) {
            final float s = fArr[i];
            rows.add(RowAdapter.Row.option(speedLabel(s) + (s == 1.0f ? "  (Normal)" : ""), null, Math.abs(this.speed - s) < 0.01f));
            actions.add(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda41
                @Override // java.lang.Runnable
                public final void run() {
                    this.f$0.lambda$openSpeedOptions$43(s);
                }
            });
        }
        openOptions("Oynatma hızı", rows, actions, this.toolSpeed);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public /* synthetic */ void lambda$openSpeedOptions$43(float s) {
        this.speed = s;
        if (this.player != null) {
            this.player.setPlaybackParameters(new PlaybackParameters(s));
        }
        updateToolLabels();
        showHint("Oynatma hızı: " + speedLabel(s), 1500L);
    }

    private void openSleepOptions() {
        List<RowAdapter.Row> rows = new ArrayList<>();
        List<Runnable> actions = new ArrayList<>();
        int[] iArr = SLEEP_MINUTES;
        int length = iArr.length;
        for (int i = 0; i < length; i++) {
            final int minutes = iArr[i];
            boolean checked = true;
            long j = this.sleepAtMs;
            if (minutes != 0 ? j <= 0 || this.sleepMinutes != minutes : j != 0) {
                checked = false;
            }
            rows.add(RowAdapter.Row.option(minutes == 0 ? "Kapalı" : minutes + " dakika", null, checked));
            actions.add(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda40
                @Override // java.lang.Runnable
                public final void run() {
                    this.f$0.lambda$openSleepOptions$44(minutes);
                }
            });
        }
        openOptions("Uyku zamanlayıcısı", rows, actions, this.toolSleep);
    }

    /* JADX INFO: Access modifiers changed from: private */
    /* renamed from: setAspect, reason: merged with bridge method [inline-methods] */
    public void lambda$openAspectOptions$42(int mode) {
        this.aspectIndex = mode;
        applyAspect();
        updateToolLabels();
        showHint("Görüntü: " + ASPECT_LABELS[mode], 1500L);
    }

    /* JADX INFO: Access modifiers changed from: private */
    /* JADX WARN: Can't fix incorrect switch cases order, some code will duplicate */
    /* JADX WARN: Removed duplicated region for block: B:17:0x0038  */
    /*
        Code decompiled incorrectly, please refer to instructions dump.
        To view partially-correct add '--show-bad-code' argument
    */
    public void applyAspect() {
        /*
            r4 = this;
            java.lang.String[] r0 = com.zendit.play.PlayerActivity.ASPECT_MODES
            int r1 = r4.aspectIndex
            r0 = r0[r1]
            int r1 = r0.hashCode()
            r2 = 3
            r3 = 0
            switch(r1) {
                case 51821: goto L2e;
                case 1513508: goto L24;
                case 3143043: goto L1a;
                case 3744723: goto L10;
                default: goto Lf;
            }
        Lf:
            goto L38
        L10:
            java.lang.String r1 = "zoom"
            boolean r0 = r0.equals(r1)
            if (r0 == 0) goto Lf
            r0 = 1
            goto L39
        L1a:
            java.lang.String r1 = "fill"
            boolean r0 = r0.equals(r1)
            if (r0 == 0) goto Lf
            r0 = r3
            goto L39
        L24:
            java.lang.String r1 = "16:9"
            boolean r0 = r0.equals(r1)
            if (r0 == 0) goto Lf
            r0 = 2
            goto L39
        L2e:
            java.lang.String r1 = "4:3"
            boolean r0 = r0.equals(r1)
            if (r0 == 0) goto Lf
            r0 = r2
            goto L39
        L38:
            r0 = -1
        L39:
            switch(r0) {
                case 0: goto L73;
                case 1: goto L65;
                case 2: goto L57;
                case 3: goto L49;
                default: goto L3c;
            }
        L3c:
            androidx.media3.ui.AspectRatioFrameLayout r0 = r4.videoFrame
            r0.setResizeMode(r3)
            androidx.media3.ui.AspectRatioFrameLayout r0 = r4.videoFrame
            float r1 = r4.videoAspect
            r0.setAspectRatio(r1)
            goto L80
        L49:
            androidx.media3.ui.AspectRatioFrameLayout r0 = r4.videoFrame
            r0.setResizeMode(r3)
            androidx.media3.ui.AspectRatioFrameLayout r0 = r4.videoFrame
            r1 = 1068149419(0x3faaaaab, float:1.3333334)
            r0.setAspectRatio(r1)
            goto L80
        L57:
            androidx.media3.ui.AspectRatioFrameLayout r0 = r4.videoFrame
            r0.setResizeMode(r3)
            androidx.media3.ui.AspectRatioFrameLayout r0 = r4.videoFrame
            r1 = 1071877689(0x3fe38e39, float:1.7777778)
            r0.setAspectRatio(r1)
            goto L80
        L65:
            androidx.media3.ui.AspectRatioFrameLayout r0 = r4.videoFrame
            r1 = 4
            r0.setResizeMode(r1)
            androidx.media3.ui.AspectRatioFrameLayout r0 = r4.videoFrame
            float r1 = r4.videoAspect
            r0.setAspectRatio(r1)
            goto L80
        L73:
            androidx.media3.ui.AspectRatioFrameLayout r0 = r4.videoFrame
            r0.setResizeMode(r2)
            androidx.media3.ui.AspectRatioFrameLayout r0 = r4.videoFrame
            float r1 = r4.videoAspect
            r0.setAspectRatio(r1)
        L80:
            return
        */
        throw new UnsupportedOperationException("Method not decompiled: com.zendit.play.PlayerActivity.applyAspect():void");
    }

    private void applySubtitleStyle() {
        this.subtitles.setStyle(new CaptionStyleCompat(-1, 0, 0, 1, ViewCompat.MEASURED_STATE_MASK, Typeface.DEFAULT_BOLD));
        this.subtitles.setApplyEmbeddedFontSizes(false);
        this.subtitles.setBottomPaddingFraction(0.08f);
        this.subtitles.setFractionalTextSize(this.subtitleScale * 0.0533f);
    }

    private void showHint(String text, long durationMs) {
        if (this.inPip) {
            return;
        }
        this.hint.setText(text);
        this.hint.setVisibility(0);
        this.handler.removeCallbacks(this.hideHintRunnable);
        if (durationMs > 0) {
            this.handler.postDelayed(this.hideHintRunnable, durationMs);
        }
    }

    private void showGesture(int icon, String text, int level) {
        if (this.controlsVisible) {
            hideControlsNow();
        }
        this.gestureIcon.setImageResource(icon);
        this.gestureText.setText(text);
        this.gestureLevel.setVisibility(level >= 0 ? 0 : 8);
        this.gestureLevel.setProgress(Math.max(0, level));
        this.gesturePanel.setVisibility(0);
        this.handler.removeCallbacks(this.hideGestureRunnable);
    }

    private void hideGestureSoon() {
        this.handler.removeCallbacks(this.hideGestureRunnable);
        this.handler.postDelayed(this.hideGestureRunnable, 700L);
    }

    private void toggleInfo() {
        this.infoVisible = !this.infoVisible;
        this.infoView.setVisibility(this.infoVisible ? 0 : 8);
        this.infoButton.setActivated(this.infoVisible);
        if (this.infoVisible) {
            updateInfo();
        }
        bump();
    }

    private void updateInfo() {
        if (this.player == null) {
            return;
        }
        StringBuilder sb = new StringBuilder();
        Format video = this.player.getVideoFormat();
        if (video != null) {
            sb.append("Video      ").append(video.width).append(Typography.times).append(video.height);
            if (video.frameRate > 0.0f) {
                sb.append(" · ").append(Math.round(video.frameRate)).append(" fps");
            }
            String codec = videoCodec(video.sampleMimeType);
            if (codec != null) {
                sb.append(" · ").append(codec);
            }
            sb.append('\n');
            if (video.bitrate > 0) {
                sb.append("Bit hızı   ").append(mbps(video.bitrate)).append('\n');
            }
        }
        Format audio = this.player.getAudioFormat();
        if (audio != null) {
            sb.append("Ses        ");
            String codec2 = audioCodec(audio.sampleMimeType);
            sb.append(codec2 != null ? codec2 : "Ses");
            if (audio.channelCount > 0) {
                sb.append(" · ").append(channelLabel(audio.channelCount));
            }
            if (audio.sampleRate > 0) {
                sb.append(" · ").append(audio.sampleRate / 1000).append(" kHz");
            }
            String language = languageName(audio.language);
            if (language != null) {
                sb.append(" · ").append(language);
            }
            sb.append('\n');
        }
        long bandwidth = DefaultBandwidthMeter.getSingletonInstance(this).getBitrateEstimate();
        if (bandwidth > 0) {
            sb.append("Bağlantı   ").append(mbps(bandwidth)).append('\n');
        }
        sb.append("Arabellek  ").append(String.format(TURKISH, "%.1f sn", Float.valueOf(this.player.getTotalBufferedDuration() / 1000.0f))).append('\n');
        DecoderCounters counters = this.player.getVideoDecoderCounters();
        if (counters != null) {
            counters.ensureUpdated();
            sb.append("Atlanan kare ").append(counters.droppedBufferCount).append('\n');
        }
        if (!this.videoDecoder.isEmpty()) {
            sb.append("Çözücü     ").append(this.videoDecoder).append('\n');
        }
        sb.append("Sunucu     ").append(host(this.items.get(this.index).url));
        this.infoView.setText(sb.toString());
    }

    private void lock() {
        this.locked = true;
        closeSide();
        hideControlsNow();
        showHint("Ekran kilitlendi. Açmak için kilit simgesine dokunun.", 2500L);
        showUnlockButton();
    }

    private void unlock() {
        this.locked = false;
        this.unlockButton.setVisibility(8);
        showControls(true);
    }

    private void showUnlockButton() {
        this.unlockButton.setVisibility(0);
        this.handler.removeCallbacks(this.hideUnlockRunnable);
        this.handler.postDelayed(this.hideUnlockRunnable, C.DEFAULT_MAX_SEEK_TO_PREVIOUS_POSITION_MS);
    }

    /* JADX INFO: Access modifiers changed from: private */
    /* renamed from: setSleepTimer, reason: merged with bridge method [inline-methods] */
    public void lambda$openSleepOptions$44(int minutes) {
        this.handler.removeCallbacks(this.sleepRunnable);
        this.sleepMinutes = minutes;
        if (minutes == 0) {
            this.sleepAtMs = 0L;
            showHint("Uyku zamanlayıcısı kapatıldı", 1500L);
        } else {
            this.sleepAtMs = SystemClock.elapsedRealtime() + (minutes * 60000);
            this.handler.postDelayed(this.sleepRunnable, minutes * 60000);
            showHint("Oynatma " + minutes + " dakika sonra duracak", 2000L);
        }
        updateToolLabels();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void onSleepTimer() {
        this.sleepAtMs = 0L;
        if (this.player != null) {
            this.player.pause();
        }
        showHint("Uyku zamanlayıcısı doldu, oynatıcı kapanıyor", 0L);
        this.handler.postDelayed(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda4
            @Override // java.lang.Runnable
            public final void run() {
                this.f$0.finish();
            }
        }, 5000L);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void showError(PlaybackException error) {
        String[] message = describeError(error);
        this.errorTitle.setText(message[0]);
        this.errorDetail.setText(message[1]);
        this.errorPanel.setVisibility(0);
        hideControlsNow();
        this.errorRetry.requestFocus();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void hideError() {
        this.errorPanel.setVisibility(8);
    }

    private static String[] describeError(PlaybackException error) {
        Throwable cause = error.getCause();
        if (cause instanceof HttpDataSource.InvalidResponseCodeException) {
            int code = ((HttpDataSource.InvalidResponseCodeException) cause).responseCode;
            if (code == 401 || code == 403) {
                return new String[]{"Sunucu yayını reddetti (HTTP " + code + ")", "Hesabın süresi dolmuş ya da aynı anda izin verilen bağlantı sayısı aşılmış olabilir. Başka bir cihazda izleniyorsa kapatıp tekrar deneyin."};
            }
            if (code == 404) {
                return new String[]{"Yayın bulunamadı (HTTP 404)", "Kanal kaldırılmış veya adresi değişmiş olabilir. Ana ekrandan listeyi yenileyin."};
            }
            return new String[]{"Sunucu hatası (HTTP " + code + ")", "Sağlayıcı geçici olarak yanıt vermiyor. Biraz sonra tekrar deneyin."};
        }
        switch (error.errorCode) {
            case 1002:
                return new String[]{"Canlı yayının gerisinde kalındı", "Tekrar dene ile canlı yayına dönebilirsiniz."};
            case PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED /* 2001 */:
            case PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT /* 2002 */:
                return new String[]{"Sunucuya bağlanılamadı", "İnternet bağlantınızı kontrol edin. Sorun sürerse sağlayıcıya şu an ulaşılamıyor olabilir."};
            case PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED /* 3001 */:
            case PlaybackException.ERROR_CODE_PARSING_MANIFEST_MALFORMED /* 3002 */:
            case PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED /* 3003 */:
            case PlaybackException.ERROR_CODE_PARSING_MANIFEST_UNSUPPORTED /* 3004 */:
                return new String[]{"Yayın biçimi okunamadı", "Ayarlar'dan canlı yayın biçimini (MPEG-TS / HLS) değiştirmeyi veya harici oynatıcıyı deneyin."};
            case PlaybackException.ERROR_CODE_DECODER_INIT_FAILED /* 4001 */:
            case PlaybackException.ERROR_CODE_DECODER_QUERY_FAILED /* 4002 */:
            case PlaybackException.ERROR_CODE_DECODING_FAILED /* 4003 */:
            case PlaybackException.ERROR_CODE_DECODING_FORMAT_EXCEEDS_CAPABILITIES /* 4004 */:
            case PlaybackException.ERROR_CODE_DECODING_FORMAT_UNSUPPORTED /* 4005 */:
                return new String[]{"Cihaz bu yayını çözemedi", "Ayarlar'dan donanım hızlandırmayı kapatmayı veya harici oynatıcıyı deneyin."};
            default:
                return new String[]{"Yayın açılamadı", "Hata kodu: " + error.getErrorCodeName()};
        }
    }

    private void startNextCountdown() {
        PlayerItem next = this.items.get(this.index + 1);
        this.nextTitle.setText(next.subtitle.isEmpty() ? next.title : next.title + "\n" + next.subtitle);
        this.nextCountdown = 10;
        this.nextLabel.setText("Sonraki bölüm " + this.nextCountdown + " sn içinde");
        hideControlsNow();
        this.nextCard.setVisibility(0);
        this.nextPlay.requestFocus();
        this.handler.removeCallbacks(this.nextRunnable);
        this.handler.postDelayed(this.nextRunnable, 1000L);
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void nextCountdownTick() {
        this.nextCountdown--;
        if (this.nextCountdown <= 0) {
            playNext();
        } else {
            this.nextLabel.setText("Sonraki bölüm " + this.nextCountdown + " sn içinde");
            this.handler.postDelayed(this.nextRunnable, 1000L);
        }
    }

    private void playNext() {
        cancelNextCountdown();
        if (this.index + 1 < this.items.size()) {
            playItem(this.index + 1, this.items.get(this.index + 1).startPositionMs, true);
        }
    }

    private void cancelNextCountdown() {
        this.handler.removeCallbacks(this.nextRunnable);
        this.nextCard.setVisibility(8);
    }

    private void openExternal() {
        PlayerItem item = this.items.get(this.index);
        Intent intent = new Intent("android.intent.action.VIEW");
        intent.setDataAndType(Uri.parse(item.url), "video/*");
        intent.putExtra(EXTRA_TITLE, item.title);
        try {
            startActivity(Intent.createChooser(intent, "Harici oynatıcıda aç"));
            if (this.player != null) {
                this.player.stop();
            }
            finish();
        } catch (ActivityNotFoundException e) {
            showHint("Cihazda başka bir video oynatıcı bulunamadı", 2500L);
        }
    }

    private boolean supportsPip() {
        return !this.isTv && Build.VERSION.SDK_INT >= 26 && getPackageManager().hasSystemFeature("android.software.picture_in_picture");
    }

    private void enterPip() {
        if (!supportsPip() || Build.VERSION.SDK_INT < 26) {
            return;
        }
        closeSide();
        hideControlsNow();
        try {
            enterPictureInPictureMode(pipParams());
        } catch (IllegalArgumentException | IllegalStateException e) {
            showHint("Küçük pencere açılamadı", 2000L);
        }
    }

    private PictureInPictureParams pipParams() {
        float aspect = this.videoAspect > 0.0f ? this.videoAspect : 1.7777778f;
        return new PictureInPictureParams.Builder().setAspectRatio(new Rational(Math.round(1000.0f * Math.max(0.42f, Math.min(2.38f, aspect))), 1000)).build();
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void updatePipParams() {
        if (supportsPip() && Build.VERSION.SDK_INT >= 26) {
            try {
                setPictureInPictureParams(pipParams());
            } catch (IllegalArgumentException e) {
            } catch (IllegalStateException e2) {
            }
        }
    }

    @Override // androidx.activity.ComponentActivity, android.app.Activity
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        this.inPip = isInPictureInPictureMode;
        if (this.inPip) {
            closeSide();
            hideControlsNow();
            this.hint.setVisibility(8);
            this.gesturePanel.setVisibility(8);
            this.infoView.setVisibility(8);
            this.infoVisible = false;
            return;
        }
        if (getLifecycle().getState() == Lifecycle.State.CREATED) {
            finish();
        }
    }

    @Override // androidx.appcompat.app.AppCompatActivity, androidx.core.app.ComponentActivity, android.app.Activity, android.view.Window.Callback
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (this.items.isEmpty()) {
            return super.dispatchKeyEvent(event);
        }
        int code = event.getKeyCode();
        if (event.getAction() == 1) {
            if (this.swallowedKeys.remove(Integer.valueOf(code))) {
                return true;
            }
            return super.dispatchKeyEvent(event);
        }
        if (event.getAction() == 0 && handleKeyDown(event)) {
            this.swallowedKeys.add(Integer.valueOf(code));
            return true;
        }
        bump();
        return super.dispatchKeyEvent(event);
    }

    private boolean handleKeyDown(KeyEvent event) throws NumberFormatException {
        int code = event.getKeyCode();
        boolean live = live();
        switch (code) {
            case 79:
            case 85:
                togglePlay();
                showControls(false);
                break;
            case 82:
                if (this.sideMode == 0) {
                    showControls(false);
                    this.toolAudio.requestFocus();
                    break;
                }
                break;
            case 86:
                finish();
                break;
            case 87:
            case 92:
            case 166:
                if (live) {
                    zap(1);
                    break;
                } else if (this.index + 1 < this.items.size()) {
                    playItem(this.index + 1, this.items.get(this.index + 1).startPositionMs, true);
                    break;
                }
                break;
            case 88:
            case 93:
            case 167:
                if (live) {
                    zap(-1);
                    break;
                } else if (this.index > 0) {
                    playItem(this.index - 1, this.items.get(this.index - 1).startPositionMs, true);
                    break;
                }
                break;
            case TsExtractor.TS_STREAM_TYPE_DVBSUBS /* 89 */:
                seekBy(-30000L);
                break;
            case 90:
                seekBy(DashMediaSource.DEFAULT_FALLBACK_TARGET_LIVE_OFFSET_MS);
                break;
            case 126:
                if (this.player != null) {
                    this.player.play();
                    break;
                }
                break;
            case WorkQueueKt.MASK /* 127 */:
                if (this.player != null) {
                    this.player.pause();
                    break;
                }
                break;
            case 165:
                toggleInfo();
                break;
            case TsExtractor.TS_STREAM_TYPE_AC4 /* 172 */:
                if (live) {
                    openChannelList(null);
                    break;
                }
                break;
            case 175:
                openTrackOptions(3, null);
                break;
            case 222:
                openTrackOptions(1, null);
                break;
            case 229:
                if (live && this.lastChannelIndex >= 0 && this.lastChannelIndex < this.items.size()) {
                    playItem(this.lastChannelIndex, 0L, true);
                    break;
                }
                break;
            case 255:
                lambda$openAspectOptions$42((this.aspectIndex + 1) % ASPECT_MODES.length);
                break;
            default:
                if (!this.locked && this.sideMode == 0 && this.nextCard.getVisibility() != 0 && this.errorPanel.getVisibility() != 0) {
                    int digit = digitOf(code);
                    if (live && digit >= 0) {
                        onDigit(digit);
                        break;
                    } else if (this.numberBuffer.length() > 0 && isSelectKey(code)) {
                        this.handler.removeCallbacks(this.numberRunnable);
                        commitNumber();
                        break;
                    } else if (!this.controlsVisible) {
                        switch (code) {
                            case 19:
                                if (live) {
                                    zap(1);
                                    break;
                                } else {
                                    showControls(true);
                                    break;
                                }
                            case 20:
                                if (live) {
                                    zap(-1);
                                    break;
                                } else {
                                    showControls(true);
                                    break;
                                }
                            case 21:
                                if (live) {
                                    openChannelList(null);
                                    break;
                                } else {
                                    seekBy(-keySeekStep(event));
                                    break;
                                }
                            case 22:
                                if (live) {
                                    showControls(true);
                                    break;
                                } else {
                                    seekBy(keySeekStep(event));
                                    break;
                                }
                            case 23:
                            case 66:
                            case 160:
                                showControls(true);
                                break;
                        }
                    }
                }
                break;
        }
        return true;
    }

    /* JADX INFO: Access modifiers changed from: private */
    public void onBackAction() {
        if (this.locked) {
            showUnlockButton();
            return;
        }
        if (this.sideMode != 0) {
            closeSide();
            return;
        }
        if (this.nextCard.getVisibility() == 0) {
            cancelNextCountdown();
            showControls(true);
        } else if (this.controlsVisible && this.errorPanel.getVisibility() != 0) {
            hideControls();
        } else {
            finish();
        }
    }

    private static int digitOf(int code) {
        if (code >= 7 && code <= 16) {
            return code - 7;
        }
        if (code >= 144 && code <= 153) {
            return code - 144;
        }
        return -1;
    }

    private static boolean isSelectKey(int code) {
        return code == 23 || code == 66 || code == 160;
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public void onSingleTap() {
        if (this.locked) {
            showUnlockButton();
            return;
        }
        if (this.sideMode != 0) {
            closeSide();
        } else if (this.controlsVisible) {
            hideControls();
        } else {
            showControls(false);
        }
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public void onDoubleTap(int zone) {
        if (zone == 0) {
            togglePlay();
            showControls(false);
        } else if (!live()) {
            seekBy(zone * 10000);
        }
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public boolean onLongPressStart() {
        if (this.player == null || live() || !this.player.isPlaying()) {
            return false;
        }
        this.player.setPlaybackParameters(new PlaybackParameters(2.0f));
        showHint("2x hızlı oynatılıyor", 0L);
        return true;
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public void onLongPressEnd() {
        if (this.player != null) {
            this.player.setPlaybackParameters(new PlaybackParameters(this.speed));
        }
        this.hint.setVisibility(8);
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public boolean canSeek() {
        return (this.player == null || live() || this.player.getDuration() <= 0) ? false : true;
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public long seekRangeMs() {
        long duration = this.player != null ? this.player.getDuration() : 0L;
        return Math.max(60000L, Math.min(duration, 300000L));
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public void onSeekPreview(long deltaMs) {
        if (this.player == null) {
            return;
        }
        if (this.gestureSeekBase == C.TIME_UNSET) {
            this.gestureSeekBase = this.player.getCurrentPosition();
        }
        long duration = this.player.getDuration();
        long target = Math.max(0L, Math.min(duration, this.gestureSeekBase + deltaMs));
        long change = target - this.gestureSeekBase;
        showGesture(change >= 0 ? R.drawable.zp_ic_fast_forward : R.drawable.zp_ic_fast_rewind, (change >= 0 ? "+" : "−") + formatTime(Math.abs(change)) + "\n" + formatTime(target) + " / " + formatTime(duration), (int) ((100 * target) / Math.max(1L, duration)));
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public void onSeekCommit(long deltaMs) {
        if (this.player != null && this.gestureSeekBase != C.TIME_UNSET && deltaMs != 0) {
            this.player.seekTo(Math.max(0L, Math.min(this.player.getDuration(), this.gestureSeekBase + deltaMs)));
        }
        this.gestureSeekBase = C.TIME_UNSET;
        hideGestureSoon();
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public void onBrightnessDelta(float delta) {
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        if (this.brightness < 0.0f) {
            this.brightness = lp.screenBrightness >= 0.0f ? lp.screenBrightness : systemBrightness();
        }
        this.brightness = Math.max(0.01f, Math.min(1.0f, this.brightness + delta));
        lp.screenBrightness = this.brightness;
        getWindow().setAttributes(lp);
        int percent = Math.round(this.brightness * 100.0f);
        showGesture(R.drawable.zp_ic_brightness, "Parlaklık %" + percent, percent);
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public void onVolumeDelta(float delta) {
        if (this.audioManager == null) {
            return;
        }
        int max = Math.max(1, this.audioManager.getStreamMaxVolume(3));
        if (this.volume < 0.0f) {
            this.volume = this.audioManager.getStreamVolume(3) / max;
        }
        this.volume = Math.max(0.0f, Math.min(1.0f, this.volume + delta));
        try {
            this.audioManager.setStreamVolume(3, Math.round(this.volume * max), 0);
        } catch (SecurityException e) {
        }
        int percent = Math.round(this.volume * 100.0f);
        showGesture(percent == 0 ? R.drawable.zp_ic_volume_off : R.drawable.zp_ic_volume, "Ses %" + percent, percent);
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public void onVerticalEnd() {
        this.volume = -1.0f;
        hideGestureSoon();
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public void onPinch(float totalScale) {
        if (totalScale > 1.1f) {
            lambda$openAspectOptions$42(Arrays.asList(ASPECT_MODES).indexOf("zoom"));
        } else if (totalScale < 0.9f) {
            lambda$openAspectOptions$42(Arrays.asList(ASPECT_MODES).indexOf("fit"));
        }
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public boolean isLocked() {
        return this.locked;
    }

    private float systemBrightness() {
        try {
            return Math.max(0.05f, Settings.System.getInt(getContentResolver(), "screen_brightness") / 255.0f);
        } catch (Settings.SettingNotFoundException e) {
            return 0.5f;
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private String clock(long millis) {
        return this.clockFormat.format(new Date(millis));
    }

    static String formatTime(long ms) {
        long totalSeconds = Math.max(0L, ms) / 1000;
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;
        if (hours > 0) {
            return String.format(Locale.ROOT, "%d:%02d:%02d", Long.valueOf(hours), Long.valueOf(minutes), Long.valueOf(seconds));
        }
        return String.format(Locale.ROOT, "%02d:%02d", Long.valueOf(minutes), Long.valueOf(seconds));
    }

    private static String speedLabel(float s) {
        return (s == ((float) Math.round(s)) ? String.valueOf(Math.round(s)) : String.valueOf(s).replace('.', ',')) + "x";
    }

    private static String mbps(long bitsPerSecond) {
        return String.format(TURKISH, "%.1f Mbps", Float.valueOf(bitsPerSecond / 1000000.0f));
    }

    private static String host(String url) {
        try {
            String host = Uri.parse(url).getHost();
            return host == null ? "-" : host;
        } catch (RuntimeException e) {
            return "-";
        }
    }

    private static int countTracks(Tracks tracks, int type) {
        int count = 0;
        UnmodifiableIterator<Tracks.Group> it = tracks.getGroups().iterator();
        while (it.hasNext()) {
            Tracks.Group group = it.next();
            if (group.getType() == type) {
                count += group.length;
            }
        }
        return count;
    }

    private static boolean isTextSelected(Tracks tracks) {
        UnmodifiableIterator<Tracks.Group> it = tracks.getGroups().iterator();
        while (it.hasNext()) {
            Tracks.Group group = it.next();
            if (group.getType() == 3 && group.isSelected()) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasOverride(TrackSelectionParameters params, int type) {
        UnmodifiableIterator<TrackSelectionOverride> it = params.overrides.values().iterator();
        while (it.hasNext()) {
            TrackSelectionOverride override = it.next();
            if (override.getType() == type) {
                return true;
            }
        }
        return false;
    }

    private static String trackLabel(Format format, int type, int n) {
        if (type == 2) {
            return (format.height > 0 ? new StringBuilder().append(format.height).append(TtmlNode.TAG_P) : new StringBuilder().append("Kalite ").append(n)).toString();
        }
        String language = languageName(format.language);
        String label = (format.label == null || format.label.trim().isEmpty()) ? null : format.label.trim();
        if (label != null && language != null && !label.toLowerCase(TURKISH).contains(language.toLowerCase(TURKISH))) {
            return language + " · " + label;
        }
        if (label != null) {
            return label;
        }
        if (language != null) {
            return language;
        }
        return (type == 1 ? "Ses " : "Altyazı ") + n;
    }

    private static String trackDetail(Format format, int type, boolean supported) {
        List<String> parts = new ArrayList<>();
        if (type == 1) {
            if (format.channelCount > 0) {
                parts.add(channelLabel(format.channelCount));
            }
            String codec = audioCodec(format.sampleMimeType);
            if (codec != null) {
                parts.add(codec);
            }
            if (format.bitrate > 0) {
                parts.add((format.bitrate / 1000) + " kbps");
            }
        } else if (type == 3) {
            String codec2 = textCodec(format.sampleMimeType);
            if (codec2 != null) {
                parts.add(codec2);
            }
            if ((format.selectionFlags & 2) != 0) {
                parts.add("Zorunlu");
            }
        } else {
            if (format.width > 0) {
                parts.add(format.width + "×" + format.height);
            }
            if (format.bitrate > 0) {
                parts.add(mbps(format.bitrate));
            }
            if (format.frameRate > 0.0f) {
                parts.add(Math.round(format.frameRate) + " fps");
            }
        }
        if (!supported) {
            parts.add("Cihaz desteklemiyor");
        }
        return TextUtils.join(" · ", parts);
    }

    private static String languageName(String code) {
        if (code == null || code.isEmpty() || C.LANGUAGE_UNDETERMINED.equals(code)) {
            return null;
        }
        String normalized = Util.normalizeLanguageCode(code);
        String name = Locale.forLanguageTag(normalized).getDisplayLanguage(TURKISH);
        if (name.isEmpty() || name.equalsIgnoreCase(normalized)) {
            return code;
        }
        return name.substring(0, 1).toUpperCase(TURKISH) + name.substring(1);
    }

    private static String channelLabel(int channels) {
        switch (channels) {
            case 1:
                return "Mono";
            case 2:
                return "Stereo";
            case 6:
                return "5.1";
            case 8:
                return "7.1";
            default:
                return channels + " kanal";
        }
    }

    /* JADX WARN: Can't fix incorrect switch cases order, some code will duplicate */
    /* JADX WARN: Removed duplicated region for block: B:29:0x0052  */
    /*
        Code decompiled incorrectly, please refer to instructions dump.
        To view partially-correct add '--show-bad-code' argument
    */
    private static java.lang.String audioCodec(java.lang.String r2) {
        /*
            r0 = 0
            if (r2 != 0) goto L4
            return r0
        L4:
            int r1 = r2.hashCode()
            switch(r1) {
                case -1095064472: goto L48;
                case -53558318: goto L3e;
                case 187078296: goto L34;
                case 187078297: goto L2a;
                case 1504578661: goto L20;
                case 1504831518: goto L16;
                case 1504891608: goto Lc;
                default: goto Lb;
            }
        Lb:
            goto L52
        Lc:
            java.lang.String r1 = "audio/opus"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 6
            goto L53
        L16:
            java.lang.String r1 = "audio/mpeg"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 1
            goto L53
        L20:
            java.lang.String r1 = "audio/eac3"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 3
            goto L53
        L2a:
            java.lang.String r1 = "audio/ac4"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 4
            goto L53
        L34:
            java.lang.String r1 = "audio/ac3"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 2
            goto L53
        L3e:
            java.lang.String r1 = "audio/mp4a-latm"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 0
            goto L53
        L48:
            java.lang.String r1 = "audio/vnd.dts"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 5
            goto L53
        L52:
            r1 = -1
        L53:
            switch(r1) {
                case 0: goto L69;
                case 1: goto L66;
                case 2: goto L63;
                case 3: goto L60;
                case 4: goto L5d;
                case 5: goto L5a;
                case 6: goto L57;
                default: goto L56;
            }
        L56:
            return r0
        L57:
            java.lang.String r0 = "Opus"
            return r0
        L5a:
            java.lang.String r0 = "DTS"
            return r0
        L5d:
            java.lang.String r0 = "AC-4"
            return r0
        L60:
            java.lang.String r0 = "Dolby Digital+"
            return r0
        L63:
            java.lang.String r0 = "Dolby Digital"
            return r0
        L66:
            java.lang.String r0 = "MP3"
            return r0
        L69:
            java.lang.String r0 = "AAC"
            return r0
        */
        throw new UnsupportedOperationException("Method not decompiled: com.zendit.play.PlayerActivity.audioCodec(java.lang.String):java.lang.String");
    }

    /* JADX WARN: Can't fix incorrect switch cases order, some code will duplicate */
    /* JADX WARN: Removed duplicated region for block: B:32:0x005c  */
    /*
        Code decompiled incorrectly, please refer to instructions dump.
        To view partially-correct add '--show-bad-code' argument
    */
    private static java.lang.String textCodec(java.lang.String r2) {
        /*
            r0 = 0
            if (r2 != 0) goto L4
            return r0
        L4:
            int r1 = r2.hashCode()
            switch(r1) {
                case -1351681404: goto L52;
                case -1248334819: goto L48;
                case -1004728940: goto L3e;
                case 822864842: goto L34;
                case 1566015601: goto L2a;
                case 1566016562: goto L20;
                case 1668750253: goto L16;
                case 1693976202: goto Lc;
                default: goto Lb;
            }
        Lb:
            goto L5c
        Lc:
            java.lang.String r1 = "application/ttml+xml"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 4
            goto L5d
        L16:
            java.lang.String r1 = "application/x-subrip"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 1
            goto L5d
        L20:
            java.lang.String r1 = "application/cea-708"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 3
            goto L5d
        L2a:
            java.lang.String r1 = "application/cea-608"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 2
            goto L5d
        L34:
            java.lang.String r1 = "text/x-ssa"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 5
            goto L5d
        L3e:
            java.lang.String r1 = "text/vtt"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 0
            goto L5d
        L48:
            java.lang.String r1 = "application/pgs"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 7
            goto L5d
        L52:
            java.lang.String r1 = "application/dvbsubs"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 6
            goto L5d
        L5c:
            r1 = -1
        L5d:
            switch(r1) {
                case 0: goto L73;
                case 1: goto L70;
                case 2: goto L6d;
                case 3: goto L6d;
                case 4: goto L6a;
                case 5: goto L67;
                case 6: goto L64;
                case 7: goto L61;
                default: goto L60;
            }
        L60:
            return r0
        L61:
            java.lang.String r0 = "PGS"
            return r0
        L64:
            java.lang.String r0 = "DVB"
            return r0
        L67:
            java.lang.String r0 = "SSA"
            return r0
        L6a:
            java.lang.String r0 = "TTML"
            return r0
        L6d:
            java.lang.String r0 = "CC"
            return r0
        L70:
            java.lang.String r0 = "SRT"
            return r0
        L73:
            java.lang.String r0 = "WebVTT"
            return r0
        */
        throw new UnsupportedOperationException("Method not decompiled: com.zendit.play.PlayerActivity.textCodec(java.lang.String):java.lang.String");
    }

    /* JADX WARN: Can't fix incorrect switch cases order, some code will duplicate */
    /* JADX WARN: Removed duplicated region for block: B:23:0x003e  */
    /*
        Code decompiled incorrectly, please refer to instructions dump.
        To view partially-correct add '--show-bad-code' argument
    */
    private static java.lang.String videoCodec(java.lang.String r2) {
        /*
            r0 = 0
            if (r2 != 0) goto L4
            return r0
        L4:
            int r1 = r2.hashCode()
            switch(r1) {
                case -1662735862: goto L34;
                case -1662541442: goto L2a;
                case 5751993: goto L20;
                case 1331836730: goto L16;
                case 1599127257: goto Lc;
                default: goto Lb;
            }
        Lb:
            goto L3e
        Lc:
            java.lang.String r1 = "video/x-vnd.on2.vp9"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 4
            goto L3f
        L16:
            java.lang.String r1 = "video/avc"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 0
            goto L3f
        L20:
            java.lang.String r1 = "video/mpeg2"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 2
            goto L3f
        L2a:
            java.lang.String r1 = "video/hevc"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 1
            goto L3f
        L34:
            java.lang.String r1 = "video/av01"
            boolean r1 = r2.equals(r1)
            if (r1 == 0) goto Lb
            r1 = 3
            goto L3f
        L3e:
            r1 = -1
        L3f:
            switch(r1) {
                case 0: goto L4f;
                case 1: goto L4c;
                case 2: goto L49;
                case 3: goto L46;
                case 4: goto L43;
                default: goto L42;
            }
        L42:
            return r0
        L43:
            java.lang.String r0 = "VP9"
            return r0
        L46:
            java.lang.String r0 = "AV1"
            return r0
        L49:
            java.lang.String r0 = "MPEG-2"
            return r0
        L4c:
            java.lang.String r0 = "H.265"
            return r0
        L4f:
            java.lang.String r0 = "H.264"
            return r0
        */
        throw new UnsupportedOperationException("Method not decompiled: com.zendit.play.PlayerActivity.videoCodec(java.lang.String):java.lang.String");
    }
}
