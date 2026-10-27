package com.rofikgodi.centre;

import android.graphics.Color;
import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    private static final String HOME_URL = "https://rofik-godi.pages.dev/";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Do not restore a WebView snapshot that may contain an abandoned bank/Razorpay page.
        super.onCreate(null);
        getBridge().getWebView().clearHistory();
        getBridge().getWebView().clearCache(false);
        getBridge().getWebView().loadUrl(HOME_URL);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        WindowInsetsControllerCompat insetsController = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(true);
        insetsController.setAppearanceLightNavigationBars(true);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (Intent.ACTION_MAIN.equals(intent.getAction())) {
            getBridge().getWebView().clearHistory();
            getBridge().getWebView().loadUrl(HOME_URL);
        }
    }
}
