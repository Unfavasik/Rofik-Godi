package com.rofikgodi.centre;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.razorpay.Checkout;
import com.razorpay.PaymentData;

import org.json.JSONObject;

@CapacitorPlugin(name = "NativeRazorpay")
public class NativeRazorpayPlugin extends Plugin {
    private static NativeRazorpayPlugin activePlugin;
    private PluginCall pendingCall;
    private Checkout checkout;

    @PluginMethod
    public void openCheckout(PluginCall call) {
        if (pendingCall != null) {
            call.reject("Another payment is already in progress.");
            return;
        }

        String key = call.getString("key", "");
        String orderId = call.getString("orderId", "");
        Integer amount = call.getInt("amount", 0);
        String currency = call.getString("currency", "INR");
        if (key.isEmpty() || orderId.isEmpty() || amount <= 0) {
            call.reject("Razorpay checkout data is incomplete.");
            return;
        }

        pendingCall = call;
        activePlugin = this;
        try {
            checkout = new Checkout();
            checkout.setKeyID(key);
            checkout.setImage(com.rofikgodi.centre.R.mipmap.ic_launcher);

            JSONObject options = new JSONObject();
            options.put("key", key);
            options.put("amount", amount);
            options.put("currency", currency);
            options.put("name", call.getString("name", "Rofik Godi Centre"));
            options.put("description", call.getString("description", "Rofik Godi order"));
            options.put("order_id", orderId);
            options.put("theme.color", call.getString("themeColor", "#D9232D"));

            JSONObject prefill = new JSONObject();
            prefill.put("name", call.getString("name", ""));
            prefill.put("email", call.getString("email", ""));
            prefill.put("contact", call.getString("contact", ""));
            options.put("prefill", prefill);

            JSONObject retry = new JSONObject();
            retry.put("enabled", true);
            retry.put("max_count", 2);
            options.put("retry", retry);

            checkout.open(getActivity(), options);
        } catch (Exception exception) {
            pendingCall = null;
            checkout = null;
            call.reject(exception.getMessage() == null ? "Unable to open Razorpay checkout." : exception.getMessage());
        }
    }

    public static void onNativePaymentSuccess(String razorpayPaymentId, PaymentData paymentData) {
        if (activePlugin == null || activePlugin.pendingCall == null) return;
        NativeRazorpayPlugin plugin = activePlugin;
        JSObject result = new JSObject();
        result.put("razorpay_payment_id", razorpayPaymentId);
        result.put("razorpay_order_id", paymentData == null ? "" : paymentData.getOrderId());
        result.put("razorpay_signature", paymentData == null ? "" : paymentData.getSignature());
        plugin.pendingCall.resolve(result);
        plugin.clearPendingCall();
    }

    public static void onNativePaymentError(int code, String description, PaymentData paymentData) {
        if (activePlugin == null || activePlugin.pendingCall == null) return;
        activePlugin.pendingCall.reject(description == null || description.isEmpty() ? "Razorpay payment was not completed." : description);
        activePlugin.clearPendingCall();
    }

    private void clearPendingCall() {
        pendingCall = null;
        checkout = null;
        activePlugin = null;
    }

    @Override
    protected void handleOnDestroy() {
        if (pendingCall != null) {
            pendingCall.reject("Payment was interrupted because the app was closed.");
        }
        clearPendingCall();
        super.handleOnDestroy();
    }
}
