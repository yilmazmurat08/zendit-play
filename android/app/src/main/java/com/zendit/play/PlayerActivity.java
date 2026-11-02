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
import androidx.core.view.OnApplyWindowInsetsListener;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.lifecycle.Lifecycle;
import androidx.media3.common.Format;
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
import androidx.media3.exoplayer.upstream.DefaultBandwidthMeter;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.CaptionStyleCompat;
import androidx.media3.ui.SubtitleView;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.common.collect.UnmodifiableIterator;
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
    private long resumePositionMs = -9223372036854775807L;
    private int lastChannelIndex = -1;
    private int pendingZapIndex = -1;
    private int sideMode = 0;
    private List<Runnable> sideActions = Collections.emptyList();
    private String videoDecoder = "";
    private float brightness = -1.0f;
    private float volume = -1.0f;
    private long gestureSeekBase = -9223372036854775807L;
    private long pendingSeekMs = -9223372036854775807L;
    private final Runnable hideControlsRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda44
        @Override // java.lang.Runnable
        public final void run() {
            PlayerActivity.$r8$lambda$jIk0DmonCdPBYhvhRPgTcR_shKE(PlayerActivity.this);
        }
    };
    private final Runnable hideHintRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda47
        @Override // java.lang.Runnable
        public final void run() {
            PlayerActivity.m443$r8$lambda$xbbA0SjBVMQPTQzNPNNuMpCkRw(PlayerActivity.this);
        }
    };
    private final Runnable hideGestureRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda48
        @Override // java.lang.Runnable
        public final void run() {
            PlayerActivity.$r8$lambda$j0kC_SuUihAltVKdRn41rk4suJM(PlayerActivity.this);
        }
    };
    private final Runnable hideUnlockRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda49
        @Override // java.lang.Runnable
        public final void run() {
            PlayerActivity.$r8$lambda$IumNkKfiKLIAPyNOkMOB4o1P95s(PlayerActivity.this);
        }
    };
    private final Runnable zapRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda50
        @Override // java.lang.Runnable
        public final void run() {
            PlayerActivity.m434$r8$lambda$Eo72BYIFa3QuF3ku23jpTFQOxQ(PlayerActivity.this);
        }
    };
    private final Runnable numberRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda51
        @Override // java.lang.Runnable
        public final void run() {
            PlayerActivity.$r8$lambda$r8ZJEwEkVR6yTRJ5sQF6FktwL60(PlayerActivity.this);
        }
    };
    private final Runnable sleepRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda1
        @Override // java.lang.Runnable
        public final void run() {
            PlayerActivity.$r8$lambda$UXqyhDB7WoMVMTQIMeJk0xgIBQI(PlayerActivity.this);
        }
    };
    private final Runnable nextRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda2
        @Override // java.lang.Runnable
        public final void run() {
            PlayerActivity.$r8$lambda$9_I2TCF4hlKNRvRuIIeiqIN32xM(PlayerActivity.this);
        }
    };
    private final Runnable seekRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda3
        @Override // java.lang.Runnable
        public final void run() {
            PlayerActivity.$r8$lambda$4jJJ8BbRZWDcgDOuI_a8t2XDZ4I(PlayerActivity.this);
        }
    };
    private final Runnable tickRunnable = new Runnable() { // from class: com.zendit.play.PlayerActivity.1
        @Override // java.lang.Runnable
        public void run() {
            PlayerActivity.m474$$Nest$mtick(PlayerActivity.this);
            PlayerActivity.m448$$Nest$fgethandler(PlayerActivity.this).postDelayed(this, 1000L);
        }
    };
    private final Player.Listener playerListener = new Player.Listener() { // from class: com.zendit.play.PlayerActivity.4
        @Override // androidx.media3.common.Player.Listener
        public void onIsPlayingChanged(boolean isPlaying) {
            PlayerActivity.m465$$Nest$mflushWatchTime(PlayerActivity.this);
            PlayerActivity.m476$$Nest$mupdatePlayButton(PlayerActivity.this);
            if (isPlaying) {
                PlayerActivity.m471$$Nest$mscheduleHide(PlayerActivity.this);
            } else if (PlayerActivity.m452$$Nest$fgetplayer(PlayerActivity.this) != null && !PlayerActivity.m452$$Nest$fgetplayer(PlayerActivity.this).getPlayWhenReady() && PlayerActivity.m452$$Nest$fgetplayer(PlayerActivity.this).getPlaybackState() == 3) {
                PlayerActivity.m472$$Nest$mshowControls(PlayerActivity.this, false);
                PlayerActivity.m448$$Nest$fgethandler(PlayerActivity.this).removeCallbacks(PlayerActivity.m449$$Nest$fgethideControlsRunnable(PlayerActivity.this));
            }
        }

        @Override // androidx.media3.common.Player.Listener
        public void onPlaybackStateChanged(int state) {
            PlayerActivity.m446$$Nest$fgetbuffering(PlayerActivity.this).setVisibility(state == 2 ? 0 : 8);
            if (state == 3) {
                PlayerActivity.m456$$Nest$fputliveRetries(PlayerActivity.this, 0);
                PlayerActivity.m466$$Nest$mhideError(PlayerActivity.this);
            } else if (state == 4) {
                PlayerActivity.m469$$Nest$monEnded(PlayerActivity.this);
            }
            PlayerActivity.m476$$Nest$mupdatePlayButton(PlayerActivity.this);
            PlayerActivity.m477$$Nest$mupdateProgress(PlayerActivity.this);
        }

        @Override // androidx.media3.common.Player.Listener
        public void onPlayerError(PlaybackException error) {
            PlayerActivity.m446$$Nest$fgetbuffering(PlayerActivity.this).setVisibility(8);
            if (PlayerActivity.m447$$Nest$fgetcatchupItem(PlayerActivity.this) != null) {
                PlayerActivity.m464$$Nest$mexitCatchup(PlayerActivity.this, "Bu program arşivden açılamadı, canlı yayına dönüldü");
            } else if (PlayerActivity.m467$$Nest$mlive(PlayerActivity.this) && PlayerActivity.m450$$Nest$fgetliveRetries(PlayerActivity.this) < 3) {
                PlayerActivity.m470$$Nest$mretryLive(PlayerActivity.this, error);
            } else {
                PlayerActivity.m473$$Nest$mshowError(PlayerActivity.this, error);
            }
        }

        @Override // androidx.media3.common.Player.Listener
        public void onVideoSizeChanged(VideoSize size) {
            PlayerActivity.m459$$Nest$fputvideoAspect(PlayerActivity.this, (size.width == 0 || size.height == 0) ? 0.0f : (size.width * size.pixelWidthHeightRatio) / size.height);
            PlayerActivity.m461$$Nest$mapplyAspect(PlayerActivity.this);
            PlayerActivity.m475$$Nest$mupdatePipParams(PlayerActivity.this);
        }

        @Override // androidx.media3.common.Player.Listener
        public void onCues(CueGroup cueGroup) {
            PlayerActivity.m455$$Nest$fgetsubtitles(PlayerActivity.this).setCues(cueGroup.cues);
        }

        @Override // androidx.media3.common.Player.Listener
        public void onTracksChanged(Tracks tracks) {
            PlayerActivity.m478$$Nest$mupdateToolLabels(PlayerActivity.this);
        }
    };
    private final AnalyticsListener analyticsListener = new AnalyticsListener() { // from class: com.zendit.play.PlayerActivity.5
        @Override // androidx.media3.exoplayer.analytics.AnalyticsListener
        public void onVideoDecoderInitialized(AnalyticsListener.EventTime eventTime, String decoderName, long initializedTimestampMs, long initializationDurationMs) {
            PlayerActivity.m460$$Nest$fputvideoDecoder(PlayerActivity.this, decoderName);
        }
    };

    /* renamed from: $r8$lambda$0E5Uc3YGPZaD6CvJoH-v-SkwKO8, reason: not valid java name */
    public static /* synthetic */ void m431$r8$lambda$0E5Uc3YGPZaD6CvJoHvSkwKO8(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$24(view);
    }

    public static /* synthetic */ void $r8$lambda$0k3DOR3SrjswC05cQHTy3KHTWZU(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$18(view);
    }

    public static /* synthetic */ void $r8$lambda$1Kq4tVnk8FLN6hI_utfGYp4EPrU(PlayerActivity playerActivity, int i) {
        playerActivity.lambda$openSide$34(i);
    }

    public static /* synthetic */ void $r8$lambda$1Oxjtw10yKAOBMNgmoMUGr1xftY(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$21(view);
    }

    /* renamed from: $r8$lambda$2WcVJTd-M2oM-1KmbRXULtCyjm8, reason: not valid java name */
    public static /* synthetic */ void m432$r8$lambda$2WcVJTdM2oM1KmbRXULtCyjm8(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$16(view);
    }

    public static /* synthetic */ void $r8$lambda$2ZoDcsAeDAhCdiDJ2nDpvtahHUA(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$11(view);
    }

    public static /* synthetic */ void $r8$lambda$3vougHueNYT1n2tevZXpqGgXJEA(PlayerActivity playerActivity) {
        playerActivity.updateLiveEpg();
    }

    public static /* synthetic */ void $r8$lambda$4jJJ8BbRZWDcgDOuI_a8t2XDZ4I(PlayerActivity playerActivity) {
        playerActivity.commitPendingSeek();
    }

    /* renamed from: $r8$lambda$4rVMdNRjruRacCe-ZH9Y3Vr8Cu0, reason: not valid java name */
    public static /* synthetic */ void m433$r8$lambda$4rVMdNRjruRacCeZH9Y3Vr8Cu0(PlayerActivity playerActivity, float f) {
        playerActivity.lambda$openSpeedOptions$43(f);
    }

    public static /* synthetic */ void $r8$lambda$6z5IaiecFd9tArJYxW1XRKN5d0o(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$8(view);
    }

    public static /* synthetic */ void $r8$lambda$8aBShgI8eVcjKtMtiUF_masBQmY(PlayerActivity playerActivity, TrackSelectionParameters trackSelectionParameters, int i) {
        playerActivity.lambda$openTrackOptions$39(trackSelectionParameters, i);
    }

    public static /* synthetic */ void $r8$lambda$9_I2TCF4hlKNRvRuIIeiqIN32xM(PlayerActivity playerActivity) {
        playerActivity.nextCountdownTick();
    }

    /* renamed from: $r8$lambda$Eo72BYIFa3QuF3ku23jpTFQO-xQ, reason: not valid java name */
    public static /* synthetic */ void m434$r8$lambda$Eo72BYIFa3QuF3ku23jpTFQOxQ(PlayerActivity playerActivity) {
        playerActivity.lambda$new$3();
    }

    /* renamed from: $r8$lambda$FLFcN_o-fIBOUcOHoVN3gruxnbA, reason: not valid java name */
    public static /* synthetic */ void m435$r8$lambda$FLFcN_ofIBOUcOHoVN3gruxnbA(PlayerActivity playerActivity, int i) {
        playerActivity.lambda$openSleepOptions$44(i);
    }

    public static /* synthetic */ void $r8$lambda$GZ7C4IR5AKn4yNFqj5PWsRNRQSk(PlayerActivity playerActivity, int i) {
        playerActivity.lambda$openOptions$35(i);
    }

    public static /* synthetic */ void $r8$lambda$IumNkKfiKLIAPyNOkMOB4o1P95s(PlayerActivity playerActivity) {
        playerActivity.lambda$new$2();
    }

    /* renamed from: $r8$lambda$L-BDA0NYBBmqtpftDssDgZ_Uli0, reason: not valid java name */
    public static /* synthetic */ void m436$r8$lambda$LBDA0NYBBmqtpftDssDgZ_Uli0(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$20(view);
    }

    public static /* synthetic */ void $r8$lambda$Mp6vOrbomdGqdruGntEOkYG8A88(PlayerActivity playerActivity, PlayerItem playerItem) {
        playerActivity.lambda$fetchShortEpgIfNeeded$33(playerItem);
    }

    public static /* synthetic */ void $r8$lambda$PCyrrWuCWpybMlZMdzl6mADkDvo(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$13(view);
    }

    public static /* synthetic */ WindowInsetsCompat $r8$lambda$QZszoEx56U7_GhZJ4Q4HxQog2pE(PlayerActivity playerActivity, View view, WindowInsetsCompat windowInsetsCompat) {
        return playerActivity.lambda$setupWindow$4(view, windowInsetsCompat);
    }

    public static /* synthetic */ void $r8$lambda$QrFIhfu8eloYYuh7pJP29T8WLPo(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$17(view);
    }

    public static /* synthetic */ void $r8$lambda$Ry4L5wUb5RFVpyyFXIhD_ThaRMY(PlayerActivity playerActivity, int i) {
        playerActivity.lambda$openEpisodeList$37(i);
    }

    /* renamed from: $r8$lambda$SyKe-JoGzuYiMnDsYxedgrN-LWI, reason: not valid java name */
    public static /* synthetic */ void m437$r8$lambda$SyKeJoGzuYiMnDsYxedgrNLWI(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$25(view);
    }

    public static /* synthetic */ void $r8$lambda$U9HfYK0V5rzFcUUkIv5PWoleHWE(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$15(view);
    }

    public static /* synthetic */ void $r8$lambda$UXqyhDB7WoMVMTQIMeJk0xgIBQI(PlayerActivity playerActivity) {
        playerActivity.onSleepTimer();
    }

    public static /* synthetic */ void $r8$lambda$UnJKXBJl_HDPgB0Ggs5EhkyqaeM(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$12(view);
    }

    public static /* synthetic */ void $r8$lambda$W1Z9iZacPaybekrR5zZu8TgjBJw(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$19(view);
    }

    public static /* synthetic */ void $r8$lambda$WSd5OZnJJ0_JIr2x8f8nZfLA4Hc(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$9(view);
    }

    public static /* synthetic */ void $r8$lambda$Z_g7nN6xATRJtqFLr6AZQ6dJsTQ(PlayerActivity playerActivity) {
        playerActivity.lambda$retryLive$31();
    }

    public static /* synthetic */ void $r8$lambda$ZiqaszIqGSTMYCl7oCvk8ce3rAk(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$29(view);
    }

    /* renamed from: $r8$lambda$_tgqGsFjGuriub6q-sRAAK-TO94, reason: not valid java name */
    public static /* synthetic */ void m438$r8$lambda$_tgqGsFjGuriub6qsRAAKTO94(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$22(view);
    }

    public static /* synthetic */ void $r8$lambda$a8in5JVn2xINI02ErjdXoCAjok4(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$26(view);
    }

    /* renamed from: $r8$lambda$cR19MjNscvrjhGM-BnVEC2EFTFo, reason: not valid java name */
    public static /* synthetic */ void m439$r8$lambda$cR19MjNscvrjhGMBnVEC2EFTFo(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$28(view);
    }

    public static /* synthetic */ void $r8$lambda$dm0jBd0YwA8t68SWn9FCVuD73Iw(PlayerActivity playerActivity) {
        playerActivity.lambda$hideControls$32();
    }

    public static /* synthetic */ void $r8$lambda$ff_W7PiTCPtJOMUAoBZRu0Q4ydw(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$27(view);
    }

    public static /* synthetic */ void $r8$lambda$gliQF_LlhYUmZTqHs9NrQlPmLT8(PlayerActivity playerActivity, View view, View view2, int i, int i2, int i3, int i4, int i5, int i6, int i7, int i8) {
        playerActivity.lambda$setupWindow$5(view, view2, i, i2, i3, i4, i5, i6, i7, i8);
    }

    public static /* synthetic */ void $r8$lambda$h2Uspx4MqDs1SybeM0qKDGeDnxM(PlayerActivity playerActivity, TrackSelectionParameters trackSelectionParameters, int i, TrackGroup trackGroup, int i2, String str) {
        playerActivity.lambda$openTrackOptions$40(trackSelectionParameters, i, trackGroup, i2, str);
    }

    /* renamed from: $r8$lambda$iHsPvnRnebzSoNNpq_Vq-35B968, reason: not valid java name */
    public static /* synthetic */ void m440$r8$lambda$iHsPvnRnebzSoNNpq_Vq35B968(PlayerActivity playerActivity, int i) {
        playerActivity.lambda$openChannelList$36(i);
    }

    public static /* synthetic */ void $r8$lambda$iRSMtPnpkj3pzPkIpLfaaiPjJKw(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$7(view);
    }

    public static /* synthetic */ void $r8$lambda$j0kC_SuUihAltVKdRn41rk4suJM(PlayerActivity playerActivity) {
        playerActivity.lambda$new$1();
    }

    public static /* synthetic */ void $r8$lambda$jIk0DmonCdPBYhvhRPgTcR_shKE(PlayerActivity playerActivity) {
        playerActivity.hideControls();
    }

    /* renamed from: $r8$lambda$k-ek1LeQZlgxkY6RKleMFObZrp0, reason: not valid java name */
    public static /* synthetic */ void m441$r8$lambda$kek1LeQZlgxkY6RKleMFObZrp0(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$6(view);
    }

    public static /* synthetic */ void $r8$lambda$m2rSw0hu36OExNRzzttrtWn28Vk(PlayerActivity playerActivity, float f, String str) {
        playerActivity.lambda$openTrackOptions$41(f, str);
    }

    public static /* synthetic */ void $r8$lambda$pC00j4TZlnkuz0xja1fenLWHd8Y(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$14(view);
    }

    public static /* synthetic */ void $r8$lambda$qu2v_r_FeDFZ0D58AG4l8ZDn1u8(PlayerActivity playerActivity, int i) {
        playerActivity.lambda$openAspectOptions$42(i);
    }

    public static /* synthetic */ void $r8$lambda$r8ZJEwEkVR6yTRJ5sQF6FktwL60(PlayerActivity playerActivity) {
        playerActivity.commitNumber();
    }

    public static /* synthetic */ void $r8$lambda$sQtYgq3AUXA3Hx1qVCLxSHom3nQ(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$10(view);
    }

    /* renamed from: $r8$lambda$tWbB_pby-WvqJFAJF6VhrN1tkfY, reason: not valid java name */
    public static /* synthetic */ void m442$r8$lambda$tWbB_pbyWvqJFAJF6VhrN1tkfY(PlayerActivity playerActivity, TrackSelectionParameters trackSelectionParameters, int i) {
        playerActivity.lambda$openTrackOptions$38(trackSelectionParameters, i);
    }

    /* renamed from: $r8$lambda$xbb-A0SjBVMQPTQzNPNNuMpCkRw, reason: not valid java name */
    public static /* synthetic */ void m443$r8$lambda$xbbA0SjBVMQPTQzNPNNuMpCkRw(PlayerActivity playerActivity) {
        playerActivity.lambda$new$0();
    }

    /* renamed from: $r8$lambda$yIp6rmLXI-jVl2p_3zQr8yVKI34, reason: not valid java name */
    public static /* synthetic */ void m444$r8$lambda$yIp6rmLXIjVl2p_3zQr8yVKI34(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$30(view);
    }

    /* renamed from: $r8$lambda$yQSFe8-DowngO8NYRQPlOqtbMcc, reason: not valid java name */
    public static /* synthetic */ void m445$r8$lambda$yQSFe8DowngO8NYRQPlOqtbMcc(PlayerActivity playerActivity, View view) {
        playerActivity.lambda$setupControls$23(view);
    }

    /* renamed from: -$$Nest$fgetbuffering, reason: not valid java name */
    static /* bridge */ /* synthetic */ ProgressBar m446$$Nest$fgetbuffering(PlayerActivity playerActivity) {
        return playerActivity.buffering;
    }

    /* renamed from: -$$Nest$fgetcatchupItem, reason: not valid java name */
    static /* bridge */ /* synthetic */ PlayerItem m447$$Nest$fgetcatchupItem(PlayerActivity playerActivity) {
        return playerActivity.catchupItem;
    }

    /* renamed from: -$$Nest$fgethandler, reason: not valid java name */
    static /* bridge */ /* synthetic */ Handler m448$$Nest$fgethandler(PlayerActivity playerActivity) {
        return playerActivity.handler;
    }

    /* renamed from: -$$Nest$fgethideControlsRunnable, reason: not valid java name */
    static /* bridge */ /* synthetic */ Runnable m449$$Nest$fgethideControlsRunnable(PlayerActivity playerActivity) {
        return playerActivity.hideControlsRunnable;
    }

    /* renamed from: -$$Nest$fgetliveRetries, reason: not valid java name */
    static /* bridge */ /* synthetic */ int m450$$Nest$fgetliveRetries(PlayerActivity playerActivity) {
        return playerActivity.liveRetries;
    }

    /* renamed from: -$$Nest$fgetpendingSeekMs, reason: not valid java name */
    static /* bridge */ /* synthetic */ long m451$$Nest$fgetpendingSeekMs(PlayerActivity playerActivity) {
        return playerActivity.pendingSeekMs;
    }

    /* renamed from: -$$Nest$fgetplayer, reason: not valid java name */
    static /* bridge */ /* synthetic */ ExoPlayer m452$$Nest$fgetplayer(PlayerActivity playerActivity) {
        return playerActivity.player;
    }

    /* renamed from: -$$Nest$fgetpositionView, reason: not valid java name */
    static /* bridge */ /* synthetic */ TextView m453$$Nest$fgetpositionView(PlayerActivity playerActivity) {
        return playerActivity.positionView;
    }

    /* renamed from: -$$Nest$fgetseekRunnable, reason: not valid java name */
    static /* bridge */ /* synthetic */ Runnable m454$$Nest$fgetseekRunnable(PlayerActivity playerActivity) {
        return playerActivity.seekRunnable;
    }

    /* renamed from: -$$Nest$fgetsubtitles, reason: not valid java name */
    static /* bridge */ /* synthetic */ SubtitleView m455$$Nest$fgetsubtitles(PlayerActivity playerActivity) {
        return playerActivity.subtitles;
    }

    /* renamed from: -$$Nest$fputliveRetries, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m456$$Nest$fputliveRetries(PlayerActivity playerActivity, int i) {
        playerActivity.liveRetries = i;
    }

    /* renamed from: -$$Nest$fputpendingSeekMs, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m457$$Nest$fputpendingSeekMs(PlayerActivity playerActivity, long j) {
        playerActivity.pendingSeekMs = j;
    }

    /* renamed from: -$$Nest$fputuserSeeking, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m458$$Nest$fputuserSeeking(PlayerActivity playerActivity, boolean z) {
        playerActivity.userSeeking = z;
    }

    /* renamed from: -$$Nest$fputvideoAspect, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m459$$Nest$fputvideoAspect(PlayerActivity playerActivity, float f) {
        playerActivity.videoAspect = f;
    }

    /* renamed from: -$$Nest$fputvideoDecoder, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m460$$Nest$fputvideoDecoder(PlayerActivity playerActivity, String str) {
        playerActivity.videoDecoder = str;
    }

    /* renamed from: -$$Nest$mapplyAspect, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m461$$Nest$mapplyAspect(PlayerActivity playerActivity) {
        playerActivity.applyAspect();
    }

    /* renamed from: -$$Nest$mbump, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m462$$Nest$mbump(PlayerActivity playerActivity) {
        playerActivity.bump();
    }

    /* renamed from: -$$Nest$mcommitPendingSeek, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m463$$Nest$mcommitPendingSeek(PlayerActivity playerActivity) {
        playerActivity.commitPendingSeek();
    }

    /* renamed from: -$$Nest$mexitCatchup, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m464$$Nest$mexitCatchup(PlayerActivity playerActivity, String str) {
        playerActivity.exitCatchup(str);
    }

    /* renamed from: -$$Nest$mflushWatchTime, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m465$$Nest$mflushWatchTime(PlayerActivity playerActivity) {
        playerActivity.flushWatchTime();
    }

    /* renamed from: -$$Nest$mhideError, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m466$$Nest$mhideError(PlayerActivity playerActivity) {
        playerActivity.hideError();
    }

    /* renamed from: -$$Nest$mlive, reason: not valid java name */
    static /* bridge */ /* synthetic */ boolean m467$$Nest$mlive(PlayerActivity playerActivity) {
        return playerActivity.live();
    }

    /* renamed from: -$$Nest$monBackAction, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m468$$Nest$monBackAction(PlayerActivity playerActivity) {
        playerActivity.onBackAction();
    }

    /* renamed from: -$$Nest$monEnded, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m469$$Nest$monEnded(PlayerActivity playerActivity) {
        playerActivity.onEnded();
    }

    /* renamed from: -$$Nest$mretryLive, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m470$$Nest$mretryLive(PlayerActivity playerActivity, PlaybackException playbackException) {
        playerActivity.retryLive(playbackException);
    }

    /* renamed from: -$$Nest$mscheduleHide, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m471$$Nest$mscheduleHide(PlayerActivity playerActivity) {
        playerActivity.scheduleHide();
    }

    /* renamed from: -$$Nest$mshowControls, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m472$$Nest$mshowControls(PlayerActivity playerActivity, boolean z) {
        playerActivity.showControls(z);
    }

    /* renamed from: -$$Nest$mshowError, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m473$$Nest$mshowError(PlayerActivity playerActivity, PlaybackException playbackException) {
        playerActivity.showError(playbackException);
    }

    /* renamed from: -$$Nest$mtick, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m474$$Nest$mtick(PlayerActivity playerActivity) {
        playerActivity.tick();
    }

    /* renamed from: -$$Nest$mupdatePipParams, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m475$$Nest$mupdatePipParams(PlayerActivity playerActivity) {
        playerActivity.updatePipParams();
    }

    /* renamed from: -$$Nest$mupdatePlayButton, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m476$$Nest$mupdatePlayButton(PlayerActivity playerActivity) {
        playerActivity.updatePlayButton();
    }

    /* renamed from: -$$Nest$mupdateProgress, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m477$$Nest$mupdateProgress(PlayerActivity playerActivity) {
        playerActivity.updateProgress();
    }

    /* renamed from: -$$Nest$mupdateToolLabels, reason: not valid java name */
    static /* bridge */ /* synthetic */ void m478$$Nest$mupdateToolLabels(PlayerActivity playerActivity) {
        playerActivity.updateToolLabels();
    }

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

    private /* synthetic */ void lambda$new$0() {
        this.hint.setVisibility(8);
    }

    private /* synthetic */ void lambda$new$1() {
        this.gesturePanel.setVisibility(8);
    }

    private /* synthetic */ void lambda$new$2() {
        this.unlockButton.setVisibility(8);
    }

    private /* synthetic */ void lambda$new$3() {
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
        this.audioManager = (AudioManager) getSystemService("audio");
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
                PlayerActivity.m468$$Nest$monBackAction(PlayerActivity.this);
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
            data.putExtra("result", buildResult().toString());
            setResult(-1, data);
        }
        super.finish();
    }

    private void readSession() {
        String legacyUrl = getIntent().getStringExtra("url");
        if (legacyUrl != null && !legacyUrl.isEmpty()) {
            String title = getIntent().getStringExtra("title");
            boolean live = getIntent().getBooleanExtra("live", false);
            this.items = Collections.singletonList(new PlayerItem(legacyUrl, legacyUrl, title == null ? "" : title, "", live ? "live" : "movie", 0, "", "", 0L));
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
                return PlayerActivity.$r8$lambda$QZszoEx56U7_GhZJ4Q4HxQog2pE(PlayerActivity.this, view, windowInsetsCompat);
            }
        });
        final View center = findViewById(R.id.zp_center);
        View.OnLayoutChangeListener recenter = new View.OnLayoutChangeListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda45
            @Override // android.view.View.OnLayoutChangeListener
            public final void onLayoutChange(View view, int i2, int i3, int i4, int i5, int i6, int i7, int i8, int i9) {
                PlayerActivity.$r8$lambda$gliQF_LlhYUmZTqHs9NrQlPmLT8(PlayerActivity.this, center, view, i2, i3, i4, i5, i6, i7, i8, i9);
            }
        };
        this.topBar.addOnLayoutChangeListener(recenter);
        this.bottomBar.addOnLayoutChangeListener(recenter);
    }

    private /* synthetic */ WindowInsetsCompat lambda$setupWindow$4(View v, WindowInsetsCompat insets) {
        Insets safe = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
        this.topBar.setPadding(dp(16) + safe.left, dp(16) + safe.top, dp(16) + safe.right, 0);
        this.bottomBar.setPadding(dp(20) + safe.left, 0, dp(20) + safe.right, dp(18) + safe.bottom);
        this.sidePanel.setPadding(safe.left, dp(20) + safe.top, safe.right, safe.bottom);
        return insets;
    }

    private /* synthetic */ void lambda$setupWindow$5(View center, View v, int l, int t, int r, int b, int ol, int ot, int or, int ob) {
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
                PlayerActivity.m441$r8$lambda$kek1LeQZlgxkY6RKleMFObZrp0(PlayerActivity.this, view);
            }
        });
        this.playButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda17
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$iRSMtPnpkj3pzPkIpLfaaiPjJKw(PlayerActivity.this, view);
            }
        });
        this.leftButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda24
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$6z5IaiecFd9tArJYxW1XRKN5d0o(PlayerActivity.this, view);
            }
        });
        this.rightButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda25
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$WSd5OZnJJ0_JIr2x8f8nZfLA4Hc(PlayerActivity.this, view);
            }
        });
        this.listButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda26
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$sQtYgq3AUXA3Hx1qVCLxSHom3nQ(PlayerActivity.this, view);
            }
        });
        this.infoButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda27
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$2ZoDcsAeDAhCdiDJ2nDpvtahHUA(PlayerActivity.this, view);
            }
        });
        this.pipButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda28
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$UnJKXBJl_HDPgB0Ggs5EhkyqaeM(PlayerActivity.this, view);
            }
        });
        this.toolAudio.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda29
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$PCyrrWuCWpybMlZMdzl6mADkDvo(PlayerActivity.this, view);
            }
        });
        this.toolSubtitles.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda30
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$pC00j4TZlnkuz0xja1fenLWHd8Y(PlayerActivity.this, view);
            }
        });
        this.toolQuality.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda31
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$U9HfYK0V5rzFcUUkIv5PWoleHWE(PlayerActivity.this, view);
            }
        });
        this.toolAspect.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda6
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.m432$r8$lambda$2WcVJTdM2oM1KmbRXULtCyjm8(PlayerActivity.this, view);
            }
        });
        this.toolSpeed.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda7
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$QrFIhfu8eloYYuh7pJP29T8WLPo(PlayerActivity.this, view);
            }
        });
        this.toolEpisodes.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda8
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$0k3DOR3SrjswC05cQHTy3KHTWZU(PlayerActivity.this, view);
            }
        });
        this.toolRestart.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda9
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$W1Z9iZacPaybekrR5zZu8TgjBJw(PlayerActivity.this, view);
            }
        });
        this.toolLive.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda10
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.m436$r8$lambda$LBDA0NYBBmqtpftDssDgZ_Uli0(PlayerActivity.this, view);
            }
        });
        this.toolSleep.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda12
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$1Oxjtw10yKAOBMNgmoMUGr1xftY(PlayerActivity.this, view);
            }
        });
        this.toolLock.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda13
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.m438$r8$lambda$_tgqGsFjGuriub6qsRAAKTO94(PlayerActivity.this, view);
            }
        });
        findViewById(R.id.zp_tool_external).setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda14
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.m445$r8$lambda$yQSFe8DowngO8NYRQPlOqtbMcc(PlayerActivity.this, view);
            }
        });
        this.unlockButton.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda15
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.m431$r8$lambda$0E5Uc3YGPZaD6CvJoHvSkwKO8(PlayerActivity.this, view);
            }
        });
        this.seekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() { // from class: com.zendit.play.PlayerActivity.3
            @Override // android.widget.SeekBar.OnSeekBarChangeListener
            public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                if (!fromUser || PlayerActivity.m452$$Nest$fgetplayer(PlayerActivity.this) == null || PlayerActivity.m467$$Nest$mlive(PlayerActivity.this)) {
                    return;
                }
                long duration = PlayerActivity.m452$$Nest$fgetplayer(PlayerActivity.this).getDuration();
                if (duration <= 0) {
                    return;
                }
                PlayerActivity.m458$$Nest$fputuserSeeking(PlayerActivity.this, true);
                PlayerActivity.m457$$Nest$fputpendingSeekMs(PlayerActivity.this, (progress * duration) / 1000);
                PlayerActivity.m453$$Nest$fgetpositionView(PlayerActivity.this).setText(PlayerActivity.formatTime(PlayerActivity.m451$$Nest$fgetpendingSeekMs(PlayerActivity.this)));
                PlayerActivity.m448$$Nest$fgethandler(PlayerActivity.this).removeCallbacks(PlayerActivity.m454$$Nest$fgetseekRunnable(PlayerActivity.this));
                PlayerActivity.m448$$Nest$fgethandler(PlayerActivity.this).postDelayed(PlayerActivity.m454$$Nest$fgetseekRunnable(PlayerActivity.this), 600L);
                PlayerActivity.m462$$Nest$mbump(PlayerActivity.this);
            }

            @Override // android.widget.SeekBar.OnSeekBarChangeListener
            public void onStartTrackingTouch(SeekBar bar) {
                PlayerActivity.m458$$Nest$fputuserSeeking(PlayerActivity.this, true);
                PlayerActivity.m448$$Nest$fgethandler(PlayerActivity.this).removeCallbacks(PlayerActivity.m449$$Nest$fgethideControlsRunnable(PlayerActivity.this));
            }

            @Override // android.widget.SeekBar.OnSeekBarChangeListener
            public void onStopTrackingTouch(SeekBar bar) {
                PlayerActivity.m448$$Nest$fgethandler(PlayerActivity.this).removeCallbacks(PlayerActivity.m454$$Nest$fgetseekRunnable(PlayerActivity.this));
                PlayerActivity.m463$$Nest$mcommitPendingSeek(PlayerActivity.this);
            }
        });
        this.errorRetry.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda16
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.m437$r8$lambda$SyKeJoGzuYiMnDsYxedgrNLWI(PlayerActivity.this, view);
            }
        });
        findViewById(R.id.zp_error_external).setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda18
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$a8in5JVn2xINI02ErjdXoCAjok4(PlayerActivity.this, view);
            }
        });
        findViewById(R.id.zp_error_close).setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda19
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$ff_W7PiTCPtJOMUAoBZRu0Q4ydw(PlayerActivity.this, view);
            }
        });
        this.nextPlay.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda20
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.m439$r8$lambda$cR19MjNscvrjhGMBnVEC2EFTFo(PlayerActivity.this, view);
            }
        });
        findViewById(R.id.zp_next_cancel).setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda21
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.$r8$lambda$ZiqaszIqGSTMYCl7oCvk8ce3rAk(PlayerActivity.this, view);
            }
        });
        this.sideScrim.setOnClickListener(new View.OnClickListener() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda23
            @Override // android.view.View.OnClickListener
            public final void onClick(View view) {
                PlayerActivity.m444$r8$lambda$yIp6rmLXIjVl2p_3zQr8yVKI34(PlayerActivity.this, view);
            }
        });
        this.sideList.setLayoutManager(new LinearLayoutManager(this));
        this.sideList.setAdapter(this.sideAdapter);
        this.sideList.setItemAnimator(null);
        this.pipButton.setVisibility(supportsPip() ? 0 : 8);
        this.toolLock.setVisibility(this.isTv ? 8 : 0);
    }

    private /* synthetic */ void lambda$setupControls$6(View v) {
        finish();
    }

    private /* synthetic */ void lambda$setupControls$7(View v) {
        togglePlay();
        bump();
    }

    private /* synthetic */ void lambda$setupControls$8(View v) {
        if (live()) {
            zap(-1);
        } else {
            seekBy(-10000L);
        }
        bump();
    }

    private /* synthetic */ void lambda$setupControls$9(View v) {
        if (live()) {
            zap(1);
        } else {
            seekBy(10000L);
        }
        bump();
    }

    private /* synthetic */ void lambda$setupControls$10(View v) {
        if (this.items.get(this.index).isLive()) {
            openChannelList(this.listButton);
        } else {
            openEpisodeList(this.listButton);
        }
    }

    private /* synthetic */ void lambda$setupControls$11(View v) {
        toggleInfo();
    }

    private /* synthetic */ void lambda$setupControls$12(View v) {
        enterPip();
    }

    private /* synthetic */ void lambda$setupControls$13(View v) {
        openTrackOptions(1, this.toolAudio);
    }

    private /* synthetic */ void lambda$setupControls$14(View v) {
        openTrackOptions(3, this.toolSubtitles);
    }

    private /* synthetic */ void lambda$setupControls$15(View v) {
        openTrackOptions(2, this.toolQuality);
    }

    private /* synthetic */ void lambda$setupControls$16(View v) {
        openAspectOptions();
    }

    private /* synthetic */ void lambda$setupControls$17(View v) {
        openSpeedOptions();
    }

    private /* synthetic */ void lambda$setupControls$18(View v) {
        openEpisodeList(this.toolEpisodes);
    }

    private /* synthetic */ void lambda$setupControls$19(View v) {
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

    private /* synthetic */ void lambda$setupControls$20(View v) {
        exitCatchup("Canlı yayına dönüldü");
    }

    private /* synthetic */ void lambda$setupControls$21(View v) {
        openSleepOptions();
    }

    private /* synthetic */ void lambda$setupControls$22(View v) {
        lock();
    }

    private /* synthetic */ void lambda$setupControls$23(View v) {
        openExternal();
    }

    private /* synthetic */ void lambda$setupControls$24(View v) {
        unlock();
    }

    private /* synthetic */ void lambda$setupControls$25(View v) {
        retry();
    }

    private /* synthetic */ void lambda$setupControls$26(View v) {
        openExternal();
    }

    private /* synthetic */ void lambda$setupControls$27(View v) {
        finish();
    }

    private /* synthetic */ void lambda$setupControls$28(View v) {
        playNext();
    }

    private /* synthetic */ void lambda$setupControls$29(View v) {
        cancelNextCountdown();
        showControls(true);
    }

    private /* synthetic */ void lambda$setupControls$30(View v) {
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
        long start = this.resumePositionMs != -9223372036854775807L ? this.resumePositionMs : item.startPositionMs;
        boolean resumedAfterStop = this.resumePositionMs != -9223372036854775807L;
        this.resumePositionMs = -9223372036854775807L;
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
        this.resumePositionMs = live() ? -9223372036854775807L : this.player.getCurrentPosition();
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
        this.player.setMediaSource(StreamPlayers.mediaSource(this, item), startMs > 0 ? startMs : -9223372036854775807L);
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

    private void exitCatchup(String message) {
        if (this.catchupItem == null) {
            return;
        }
        flushWatchTime();
        this.catchupItem = null;
        loadItem(-9223372036854775807L);
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

    private void retryLive(PlaybackException error) {
        this.liveRetries++;
        long delayMs = (error == null || error.errorCode != 1002) ? 2000L : 0L;
        showHint("Bağlantı koptu, yeniden bağlanılıyor…", 2500L);
        this.handler.postDelayed(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda33
            @Override // java.lang.Runnable
            public final void run() {
                PlayerActivity.$r8$lambda$Z_g7nN6xATRJtqFLr6AZQ6dJsTQ(PlayerActivity.this);
            }
        }, delayMs);
    }

    private /* synthetic */ void lambda$retryLive$31() {
        if (this.player != null) {
            this.player.seekToDefaultPosition();
            this.player.prepare();
            this.player.play();
        }
    }

    private void onEnded() {
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
        if (duration != -9223372036854775807L && duration > 0) {
            stat.durationMs = duration;
        }
    }

    private void flushWatchTime() {
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

    private JSONObject buildResult() {
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
                o.put("id", s.id);
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

    private void showControls(boolean focusPlay) {
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

    private void hideControls() {
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
                PlayerActivity.$r8$lambda$dm0jBd0YwA8t68SWn9FCVuD73Iw(PlayerActivity.this);
            }
        }).start();
        this.root.requestFocus();
    }

    private /* synthetic */ void lambda$hideControls$32() {
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

    private void scheduleHide() {
        this.handler.removeCallbacks(this.hideControlsRunnable);
        if (this.player != null && this.player.getPlayWhenReady() && this.sideMode == 0 && this.errorPanel.getVisibility() != 0) {
            this.handler.postDelayed(this.hideControlsRunnable, 4500L);
        }
    }

    private void bump() {
        if (this.controlsVisible) {
            scheduleHide();
        }
    }

    private void updatePlayButton() {
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

    private void updateToolLabels() {
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

    private void tick() {
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

    private void updateProgress() {
        if (this.player == null || this.items.isEmpty() || live()) {
            return;
        }
        long position = this.player.getCurrentPosition();
        long duration = this.player.getDuration();
        if (duration == -9223372036854775807L || duration <= 0) {
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

    private void updateLiveEpg() {
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
            public final void run() {
                PlayerActivity.$r8$lambda$Mp6vOrbomdGqdruGntEOkYG8A88(PlayerActivity.this, item);
            }
        });
    }

    private /* synthetic */ void lambda$fetchShortEpgIfNeeded$33(PlayerItem item) {
        this.epg.fetchShortEpg(item.id, item.shortEpgUrl);
        runOnUiThread(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda11
            @Override // java.lang.Runnable
            public final void run() {
                PlayerActivity.$r8$lambda$3vougHueNYT1n2tevZXpqGgXJEA(PlayerActivity.this);
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

    private boolean live() {
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
        this.handler.postDelayed(this.zapRunnable, 400L);
    }

    private void onDigit(int digit) {
        if (this.numberBuffer.length() >= 5) {
            this.numberBuffer.setLength(0);
        }
        this.numberBuffer.append(digit);
        this.numberView.setText(this.numberBuffer);
        this.numberView.setVisibility(0);
        this.handler.removeCallbacks(this.numberRunnable);
        this.handler.postDelayed(this.numberRunnable, 1800L);
    }

    private void commitNumber() {
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
        long base = this.pendingSeekMs != -9223372036854775807L ? this.pendingSeekMs : this.player.getCurrentPosition();
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

    private void commitPendingSeek() {
        if (this.player != null && this.pendingSeekMs != -9223372036854775807L) {
            this.player.seekTo(this.pendingSeekMs);
        }
        this.pendingSeekMs = -9223372036854775807L;
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
        lp.gravity = leftSide ? 8388611 : 8388613;
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
                PlayerActivity.$r8$lambda$1Kq4tVnk8FLN6hI_utfGYp4EPrU(PlayerActivity.this, target);
            }
        });
    }

    private /* synthetic */ void lambda$openSide$34(int target) {
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
                PlayerActivity.$r8$lambda$GZ7C4IR5AKn4yNFqj5PWsRNRQSk(PlayerActivity.this, i2);
            }
        }, from);
    }

    private /* synthetic */ void lambda$openOptions$35(int position) {
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
                PlayerActivity.m440$r8$lambda$iHsPvnRnebzSoNNpq_Vq35B968(PlayerActivity.this, i3);
            }
        }, from);
    }

    private /* synthetic */ void lambda$openChannelList$36(int position) {
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
                PlayerActivity.$r8$lambda$Ry4L5wUb5RFVpyyFXIhD_ThaRMY(PlayerActivity.this, i2);
            }
        }, from);
    }

    private /* synthetic */ void lambda$openEpisodeList$37(int position) {
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
                    PlayerActivity.m442$r8$lambda$tWbB_pbyWvqJFAJF6VhrN1tkfY(PlayerActivity.this, params, type);
                }
            });
        } else if (type == 2) {
            rows.add(RowAdapter.Row.option("Otomatik", "Bağlantı hızına göre değişir", !overridden));
            actions.add(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda34
                @Override // java.lang.Runnable
                public final void run() {
                    PlayerActivity.$r8$lambda$8aBShgI8eVcjKtMtiUF_masBQmY(PlayerActivity.this, params, type);
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
                            PlayerActivity.$r8$lambda$h2Uspx4MqDs1SybeM0qKDGeDnxM(PlayerActivity.this, params, type, trackGroup2, trackIndex, label);
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
                        PlayerActivity.$r8$lambda$m2rSw0hu36OExNRzzttrtWn28Vk(PlayerActivity.this, scale, label2);
                    }
                });
            }
        }
        String title = type == 1 ? "Ses dili" : type == 3 ? "Altyazı" : "Görüntü kalitesi";
        openOptions(title, rows, actions, from);
    }

    private /* synthetic */ void lambda$openTrackOptions$38(TrackSelectionParameters params, int type) {
        applyParams(params.buildUpon().clearOverridesOfType(type).setTrackTypeDisabled(type, true).build(), "Altyazı kapalı");
    }

    private /* synthetic */ void lambda$openTrackOptions$39(TrackSelectionParameters params, int type) {
        applyParams(params.buildUpon().clearOverridesOfType(type).build(), "Kalite: Otomatik");
    }

    private /* synthetic */ void lambda$openTrackOptions$40(TrackSelectionParameters params, int type, TrackGroup trackGroup, int trackIndex, String label) {
        applyParams(params.buildUpon().setTrackTypeDisabled(type, false).setOverrideForType(new TrackSelectionOverride(trackGroup, trackIndex)).build(), label);
    }

    private /* synthetic */ void lambda$openTrackOptions$41(float scale, String label) {
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
                    PlayerActivity.$r8$lambda$qu2v_r_FeDFZ0D58AG4l8ZDn1u8(PlayerActivity.this, mode);
                }
            });
            i++;
        }
        openOptions("Görüntü oranı", rows, actions, this.toolAspect);
    }

    private /* synthetic */ void lambda$openAspectOptions$42(int mode) {
        setAspect(mode);
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
                    PlayerActivity.m433$r8$lambda$4rVMdNRjruRacCeZH9Y3Vr8Cu0(PlayerActivity.this, s);
                }
            });
        }
        openOptions("Oynatma hızı", rows, actions, this.toolSpeed);
    }

    private /* synthetic */ void lambda$openSpeedOptions$43(float s) {
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
                    PlayerActivity.m435$r8$lambda$FLFcN_ofIBOUcOHoVN3gruxnbA(PlayerActivity.this, minutes);
                }
            });
        }
        openOptions("Uyku zamanlayıcısı", rows, actions, this.toolSleep);
    }

    private /* synthetic */ void lambda$openSleepOptions$44(int minutes) {
        setSleepTimer(minutes);
    }

    private void setAspect(int mode) {
        this.aspectIndex = mode;
        applyAspect();
        updateToolLabels();
        showHint("Görüntü: " + ASPECT_LABELS[mode], 1500L);
    }

    private void applyAspect() {
        switch (ASPECT_MODES[this.aspectIndex]) {
            case "fill":
                this.videoFrame.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FILL);
                this.videoFrame.setAspectRatio(this.videoAspect);
                break;
            case "zoom":
                this.videoFrame.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_ZOOM);
                this.videoFrame.setAspectRatio(this.videoAspect);
                break;
            case "16:9":
                this.videoFrame.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT);
                this.videoFrame.setAspectRatio(16f / 9f);
                break;
            case "4:3":
                this.videoFrame.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT);
                this.videoFrame.setAspectRatio(4f / 3f);
                break;
            default:
                this.videoFrame.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT);
                this.videoFrame.setAspectRatio(this.videoAspect);
                break;
        }
    }

    private void applySubtitleStyle() {
        this.subtitles.setStyle(new CaptionStyleCompat(-1, 0, 0, 1, -16777216, Typeface.DEFAULT_BOLD));
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
            sb.append("Video      ").append(video.width).append((char) 215).append(video.height);
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
        this.handler.postDelayed(this.hideUnlockRunnable, 3000L);
    }

    private void setSleepTimer(int minutes) {
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

    private void onSleepTimer() {
        this.sleepAtMs = 0L;
        if (this.player != null) {
            this.player.pause();
        }
        showHint("Uyku zamanlayıcısı doldu, oynatıcı kapanıyor", 0L);
        this.handler.postDelayed(new Runnable() { // from class: com.zendit.play.PlayerActivity$$ExternalSyntheticLambda4
            @Override // java.lang.Runnable
            public final void run() {
                PlayerActivity.this.finish();
            }
        }, 5000L);
    }

    private void showError(PlaybackException error) {
        String[] message = describeError(error);
        this.errorTitle.setText(message[0]);
        this.errorDetail.setText(message[1]);
        this.errorPanel.setVisibility(0);
        hideControlsNow();
        this.errorRetry.requestFocus();
    }

    private void hideError() {
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
            case 2001:
            case 2002:
                return new String[]{"Sunucuya bağlanılamadı", "İnternet bağlantınızı kontrol edin. Sorun sürerse sağlayıcıya şu an ulaşılamıyor olabilir."};
            case 3001:
            case 3002:
            case 3003:
            case 3004:
                return new String[]{"Yayın biçimi okunamadı", "Ayarlar'dan canlı yayın biçimini (MPEG-TS / HLS) değiştirmeyi veya harici oynatıcıyı deneyin."};
            case 4001:
            case 4002:
            case 4003:
            case 4004:
            case 4005:
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

    private void nextCountdownTick() {
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
        intent.putExtra("title", item.title);
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

    private void updatePipParams() {
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
        if (getLifecycle().getCurrentState() == Lifecycle.State.CREATED) {
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

    private boolean handleKeyDown(KeyEvent event) {
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
            case 89:
                seekBy(-30000L);
                break;
            case 90:
                seekBy(30000L);
                break;
            case 126:
                if (this.player != null) {
                    this.player.play();
                    break;
                }
                break;
            case 127:
                if (this.player != null) {
                    this.player.pause();
                    break;
                }
                break;
            case 165:
                toggleInfo();
                break;
            case 172:
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
                setAspect((this.aspectIndex + 1) % ASPECT_MODES.length);
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

    private void onBackAction() {
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
        if (this.gestureSeekBase == -9223372036854775807L) {
            this.gestureSeekBase = this.player.getCurrentPosition();
        }
        long duration = this.player.getDuration();
        long target = Math.max(0L, Math.min(duration, this.gestureSeekBase + deltaMs));
        long change = target - this.gestureSeekBase;
        showGesture(change >= 0 ? R.drawable.zp_ic_fast_forward : R.drawable.zp_ic_fast_rewind, (change >= 0 ? "+" : "−") + formatTime(Math.abs(change)) + "\n" + formatTime(target) + " / " + formatTime(duration), (int) ((100 * target) / Math.max(1L, duration)));
    }

    @Override // com.zendit.play.PlayerGestures.Callbacks
    public void onSeekCommit(long deltaMs) {
        if (this.player != null && this.gestureSeekBase != -9223372036854775807L && deltaMs != 0) {
            this.player.seekTo(Math.max(0L, Math.min(this.player.getDuration(), this.gestureSeekBase + deltaMs)));
        }
        this.gestureSeekBase = -9223372036854775807L;
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
            setAspect(Arrays.asList(ASPECT_MODES).indexOf("zoom"));
        } else if (totalScale < 0.9f) {
            setAspect(Arrays.asList(ASPECT_MODES).indexOf("fit"));
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
            return (format.height > 0 ? new StringBuilder().append(format.height).append("p") : new StringBuilder().append("Kalite ").append(n)).toString();
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
        if (code == null || code.isEmpty() || "und".equals(code)) {
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

    /** Readable audio codec name for the info panel; null when unknown. */
    private static String audioCodec(String mime) {
        if (mime == null) return null;
        switch (mime) {
            case "audio/mp4a-latm": return "AAC";
            case "audio/mpeg": return "MP3";
            case "audio/ac3": return "Dolby Digital";
            case "audio/eac3": return "Dolby Digital+";
            case "audio/ac4": return "AC-4";
            case "audio/vnd.dts": return "DTS";
            case "audio/opus": return "Opus";
            default: return null;
        }
    }

    /** Readable subtitle format name; null when unknown. */
    private static String textCodec(String mime) {
        if (mime == null) return null;
        switch (mime) {
            case "text/vtt": return "WebVTT";
            case "application/x-subrip": return "SRT";
            case "application/cea-608":
            case "application/cea-708": return "CC";
            case "application/ttml+xml": return "TTML";
            case "text/x-ssa": return "SSA";
            case "application/dvbsubs": return "DVB";
            case "application/pgs": return "PGS";
            default: return null;
        }
    }

    /** Readable video codec name; null when unknown. */
    private static String videoCodec(String mime) {
        if (mime == null) return null;
        switch (mime) {
            case "video/avc": return "H.264";
            case "video/hevc": return "H.265";
            case "video/mpeg2": return "MPEG-2";
            case "video/av01": return "AV1";
            case "video/x-vnd.on2.vp9": return "VP9";
            default: return null;
        }
    }
}
