package com.zendit.play;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // App-local plugins must be registered before super.onCreate().
        registerPlugin(NativePlayerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
