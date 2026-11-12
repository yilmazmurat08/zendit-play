package com.zendit.play;

import android.content.Context;
import android.os.Build;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Keeps the reason of the last crash on the device (no network, nothing leaves the phone unless the
 * viewer shares it). On the next start the app offers to show / share it, so problems seen only on
 * a real TV or phone can be fixed.
 */
final class CrashLog {
    private static final String FILE = "last-crash.txt";
    private static final int MAX_CHARS = 16000;
    private static boolean installed;

    private CrashLog() {
    }

    /** Records uncaught exceptions of any thread, then lets Android handle the crash as usual. */
    static synchronized void install(Context context) {
        if (installed) {
            return;
        }
        installed = true;
        final Context app = context.getApplicationContext();
        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            @Override
            public void uncaughtException(Thread thread, Throwable error) {
                try {
                    StringWriter trace = new StringWriter();
                    error.printStackTrace(new PrintWriter(trace));
                    write(app, "Çökme (" + thread.getName() + ")", trace.toString());
                } catch (Throwable ignored) {
                    // Never let the logger itself get in the way of the crash handling.
                }
                if (previous != null) {
                    previous.uncaughtException(thread, error);
                }
            }
        });
    }

    /** Records an event that closed or reset the app without an exception (e.g. the WebView renderer was killed). */
    static void note(Context context, String title, String details) {
        try {
            write(context.getApplicationContext(), title, details);
        } catch (Throwable ignored) {
        }
    }

    private static void write(Context context, String title, String details) throws Exception {
        String version = "";
        try {
            version = context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionName;
        } catch (Exception ignored) {
        }
        String text = title + "\n"
                + new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.ROOT).format(new Date()) + "\n"
                + "Uygulama " + version + " · " + Build.MANUFACTURER + " " + Build.MODEL
                + " · Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")\n\n"
                + details;
        if (text.length() > MAX_CHARS) {
            text = text.substring(0, MAX_CHARS);
        }
        try (FileOutputStream out = new FileOutputStream(new File(context.getFilesDir(), FILE))) {
            out.write(text.getBytes(StandardCharsets.UTF_8));
        }
    }

    /** The saved report, or null; reading removes it so it is offered only once. */
    static String take(Context context) {
        File file = new File(context.getFilesDir(), FILE);
        if (!file.exists()) {
            return null;
        }
        try (FileInputStream in = new FileInputStream(file)) {
            byte[] data = new byte[(int) Math.min(file.length(), MAX_CHARS * 4L)];
            int read = 0;
            while (read < data.length) {
                int n = in.read(data, read, data.length - read);
                if (n < 0) {
                    break;
                }
                read += n;
            }
            return new String(data, 0, read, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        } finally {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
        }
    }
}
