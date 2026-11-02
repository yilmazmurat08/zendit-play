package com.zendit.play;

import android.content.Context;
import androidx.annotation.OptIn;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.common.util.Util;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import java.util.Locale;

/** ExoPlayer setup shared by the fullscreen player and the Live TV preview. */
@OptIn(markerClass = UnstableApi.class)
final class StreamPlayers {

    private StreamPlayers() {}

    static ExoPlayer create(Context context) {
        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
            .setUserAgent(Util.getUserAgent(context, "ZenditPlay"))
            // IPTV servers often redirect between http and https.
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15_000)
            .setReadTimeoutMs(20_000);
        return new ExoPlayer.Builder(context)
            .setMediaSourceFactory(new DefaultMediaSourceFactory(context).setDataSourceFactory(http))
            .build();
    }

    /** MPEG-TS, MP4 and MKV are detected from the stream itself; HLS / DASH are recognised from the URL. */
    static MediaItem mediaItem(String url) {
        MediaItem.Builder builder = new MediaItem.Builder().setUri(url);
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.contains("m3u8")) {
            builder.setMimeType(MimeTypes.APPLICATION_M3U8);
        } else if (lower.contains(".mpd")) {
            builder.setMimeType(MimeTypes.APPLICATION_MPD);
        }
        return builder.build();
    }
}
