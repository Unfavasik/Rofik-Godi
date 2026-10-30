package com.rofikgodi.centre;

import android.graphics.Color;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity implements PaymentResultWithDataListener {
    private static final String HOME_URL = "https://rofik-godi.pages.dev/";
    public static final String EXTRA_NOTIFICATION_ROUTE = "com.rofikgodi.centre.notification_route";

    private String notificationLaunchUrl(Intent intent) {
        if (intent == null) return null;
        String route = intent.getStringExtra(EXTRA_NOTIFICATION_ROUTE);
        if (route == null || !route.startsWith("/") || route.startsWith("//") || route.contains("\\")) return null;
        Uri parsed = Uri.parse(route);
        if (parsed.isAbsolute() || parsed.getAuthority() != null) return null;
        String base = HOME_URL.endsWith("/") ? HOME_URL.substring(0, HOME_URL.length() - 1) : HOME_URL;
        return base + route;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Intent launchIntent = getIntent();
        boolean isOAuthCallback = launchIntent != null
            && launchIntent.getData() != null
            && "com.rofikgodi.centre".equals(launchIntent.getData().getScheme())
            && "auth".equals(launchIntent.getData().getHost())
            && "/callback".equals(launchIntent.getData().getPath());
        String notificationUrl = notificationLaunchUrl(launchIntent);
        registerPlugin(NativeRazorpayPlugin.class);
        // Do not restore a WebView snapshot that may contain an abandoned bank/Razorpay page.
        super.onCreate(null);
        if (!isOAuthCallback) {
            getBridge().getWebView().clearHistory();
            getBridge().getWebView().clearCache(false);
            getBridge().getWebView().loadUrl(notificationUrl == null ? HOME_URL : notificationUrl);
        }
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
        boolean isOAuthCallback = intent.getData() != null
            && "com.rofikgodi.centre".equals(intent.getData().getScheme())
            && "auth".equals(intent.getData().getHost())
            && "/callback".equals(intent.getData().getPath());
        String notificationUrl = notificationLaunchUrl(intent);
        if (notificationUrl != null) {
            getBridge().getWebView().clearHistory();
            getBridge().getWebView().loadUrl(notificationUrl);
            return;
        }
        if (Intent.ACTION_MAIN.equals(intent.getAction()) && !isOAuthCallback) {
            getBridge().getWebView().clearHistory();
            getBridge().getWebView().loadUrl(HOME_URL);
        }
    }

    @Override
    public void onPaymentSuccess(String paymentId, PaymentData paymentData) {
        NativeRazorpayPlugin.onNativePaymentSuccess(paymentId, paymentData);
    }

    @Override
    public void onPaymentError(int code, String description, PaymentData paymentData) {
        NativeRazorpayPlugin.onNativePaymentError(code, description, paymentData);
    }
}
