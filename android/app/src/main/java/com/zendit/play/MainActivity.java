package com.zendit.play;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.OnApplyWindowInsetsListener;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/* loaded from: classes7.dex */
public class MainActivity extends BridgeActivity {
    @Override // com.getcapacitor.BridgeActivity, androidx.fragment.app.FragmentActivity, androidx.activity.ComponentActivity, androidx.core.app.ComponentActivity, android.app.Activity
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePlayerPlugin.class);
        registerPlugin(EpgPlugin.class);
        super.onCreate(savedInstanceState);
        getBridge().setWebViewClient(new AppWebViewClient(getBridge()));
        CookieManager.getInstance().setAcceptThirdPartyCookies(getBridge().getWebView(), true);
        enterFullscreen();
    }

    private static class AppWebViewClient extends BridgeWebViewClient {
        AppWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override // com.getcapacitor.BridgeWebViewClient, android.webkit.WebViewClient
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (!request.isForMainFrame()) {
                return false;
            }
            return super.shouldOverrideUrlLoading(view, request);
        }
    }

    private void enterFullscreen() {
        int i;
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = window.getAttributes();
            if (Build.VERSION.SDK_INT >= 30) {
                i = 3;
            } else {
                i = 1;
            }
            lp.layoutInDisplayCutoutMode = i;
            window.setAttributes(lp);
        }
        ViewCompat.setOnApplyWindowInsetsListener(window.getDecorView(), new OnApplyWindowInsetsListener() { // from class: com.zendit.play.MainActivity$$ExternalSyntheticLambda0
            @Override // androidx.core.view.OnApplyWindowInsetsListener
            public final WindowInsetsCompat onApplyWindowInsets(View view, WindowInsetsCompat windowInsetsCompat) {
                return MainActivity.lambda$enterFullscreen$0(view, windowInsetsCompat);
            }
        });
        hideSystemBars();
    }

    static /* synthetic */ WindowInsetsCompat lambda$enterFullscreen$0(View v, WindowInsetsCompat insets) {
        boolean keyboard = insets.isVisible(WindowInsetsCompat.Type.ime());
        v.setPadding(0, 0, 0, keyboard ? insets.getInsets(WindowInsetsCompat.Type.ime()).bottom : 0);
        return new WindowInsetsCompat.Builder(insets).setInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(), Insets.NONE).build();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setSystemBarsBehavior(2);
        bars.hide(WindowInsetsCompat.Type.systemBars());
    }

    @Override // android.app.Activity, android.view.Window.Callback
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBars();
        }
    }
}
