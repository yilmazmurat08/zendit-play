package com.zendit.play;

import android.content.Context;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.MediaItem;
import androidx.media3.common.TrackSelectionParameters;
import androidx.media3.common.util.Util;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.LoadControl;
import androidx.media3.exoplayer.mediacodec.MediaCodecInfo;
import androidx.media3.exoplayer.mediacodec.MediaCodecSelector;
import androidx.media3.exoplayer.mediacodec.MediaCodecUtil;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.exoplayer.source.MediaSource;
import androidx.media3.extractor.DefaultExtractorsFactory;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/* loaded from: classes7.dex */
final class StreamPlayers {
    private static final MediaCodecSelector SOFTWARE_FIRST = new MediaCodecSelector() { // from class: com.zendit.play.StreamPlayers$$ExternalSyntheticLambda0
        @Override // androidx.media3.exoplayer.mediacodec.MediaCodecSelector
        public final List<MediaCodecInfo> getDecoderInfos(String str, boolean z, boolean z2) throws MediaCodecUtil.DecoderQueryException {
            return StreamPlayers.lambda$static$1(str, z, z2);
        }
    };

    static /* synthetic */ List lambda$static$1(String mimeType, boolean requiresSecureDecoder, boolean requiresTunnelingDecoder) throws MediaCodecUtil.DecoderQueryException {
        List<MediaCodecInfo> infos = new ArrayList<>(MediaCodecSelector.DEFAULT.getDecoderInfos(mimeType, requiresSecureDecoder, requiresTunnelingDecoder));
        Collections.sort(infos, new Comparator() { // from class: com.zendit.play.StreamPlayers$$ExternalSyntheticLambda1
            @Override // java.util.Comparator
            public final int compare(Object obj, Object obj2) {
                return StreamPlayers.lambda$static$0((MediaCodecInfo) obj, (MediaCodecInfo) obj2);
            }
        });
        return infos;
    }

    static /* synthetic */ int lambda$static$0(MediaCodecInfo a, MediaCodecInfo b) {
        return Boolean.compare(b.softwareOnly, a.softwareOnly);
    }

    private StreamPlayers() {
    }

    static ExoPlayer create(Context context) {
        // Small live preview window: a short buffer starts faster and keeps memory low next to the WebView.
        return new ExoPlayer.Builder(context).setLoadControl(loadControl(context, "low")).setMediaSourceFactory(mediaSourceFactory(context, null)).build();
    }

    static ExoPlayer create(Context context, PlayerConfig config) {
        DefaultRenderersFactory renderers = new DefaultRenderersFactory(context).setEnableDecoderFallback(true);
        if (!config.hardwareAcceleration) {
            renderers.setMediaCodecSelector(SOFTWARE_FIRST);
        }
        ExoPlayer player = new ExoPlayer.Builder(context, renderers).setLoadControl(loadControl(context, config.bufferSize)).setMediaSourceFactory(mediaSourceFactory(context, null)).setAudioAttributes(new AudioAttributes.Builder().setUsage(1).setContentType(3).build(), true).setHandleAudioBecomingNoisy(true).build();
        TrackSelectionParameters.Builder params = player.getTrackSelectionParameters().buildUpon();
        if (isLanguageCode(config.audioLanguage)) {
            params.setPreferredAudioLanguage(config.audioLanguage);
        }
        if (isLanguageCode(config.subtitleLanguage)) {
            params.setPreferredTextLanguage(config.subtitleLanguage);
        } else {
            params.setTrackTypeDisabled(3, true);
        }
        player.setTrackSelectionParameters(params.build());
        return player;
    }

    static MediaSource mediaSource(Context context, PlayerItem item) {
        return mediaSourceFactory(context, item.userAgent).createMediaSource(mediaItem(item.url));
    }

    static MediaItem mediaItem(String url) {
        MediaItem.Builder builder = new MediaItem.Builder().setUri(url);
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.contains("m3u8")) {
            builder.setMimeType("application/x-mpegURL");
        } else if (lower.contains(".mpd")) {
            builder.setMimeType("application/dash+xml");
        }
        return builder.build();
    }

    private static DefaultMediaSourceFactory mediaSourceFactory(Context context, String userAgent) {
        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory().setUserAgent((userAgent == null || userAgent.isEmpty()) ? Util.getUserAgent(context, "ZenditPlay") : userAgent).setAllowCrossProtocolRedirects(true).setConnectTimeoutMs(15000).setReadTimeoutMs(20000);
        DefaultExtractorsFactory extractors = new DefaultExtractorsFactory().setTsExtractorFlags(1);
        return new DefaultMediaSourceFactory(new DefaultDataSource.Factory(context, http), extractors);
    }

    private static LoadControl loadControl(Context context, String bufferSize) {
        DefaultLoadControl.Builder builder = new DefaultLoadControl.Builder();
        if ("low".equals(bufferSize)) {
            builder.setBufferDurationsMs(3000, 15000, 1000, 2000);
        } else if ("high".equals(bufferSize)) {
            if (isSmallMemoryDevice(context)) {
                // 1 GB TV sticks: a two-minute buffer of a high-bitrate stream with no size cap runs the
                // process out of memory. Keep a longer buffer than "normal", but let ExoPlayer cap its size.
                builder.setBufferDurationsMs(30000, 60000, 2500, 5000);
            } else {
                builder.setBufferDurationsMs(60000, 120000, 2500, 5000).setPrioritizeTimeOverSizeThresholds(true);
            }
        }
        return builder.build();
    }

    private static boolean isSmallMemoryDevice(Context context) {
        try {
            android.app.ActivityManager am = (android.app.ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
            return am.isLowRamDevice() || am.getMemoryClass() <= 192;
        } catch (RuntimeException e) {
            return true;
        }
    }

    private static boolean isLanguageCode(String value) {
        return (value == null || value.isEmpty() || "auto".equals(value) || "none".equals(value)) ? false : true;
    }
}
