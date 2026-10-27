package com.rofikgodi.centre;

import android.graphics.Color;
import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity implements PaymentResultWithDataListener {
    private static final String HOME_URL = "https://rofik-godi.pages.dev/";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeRazorpayPlugin.class);
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

    @Override
    public void onPaymentSuccess(String paymentId, PaymentData paymentData) {
        NativeRazorpayPlugin.onNativePaymentSuccess(paymentId, paymentData);
    }

    @Override
    public void onPaymentError(int code, String description, PaymentData paymentData) {
        NativeRazorpayPlugin.onNativePaymentError(code, description, paymentData);
    }
}
