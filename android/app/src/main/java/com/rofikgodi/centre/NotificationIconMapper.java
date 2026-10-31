package com.rofikgodi.centre;

import java.util.Locale;

/** Classifies existing FCM data locally and selects a bundled large notification icon. */
final class NotificationIconMapper {
    private NotificationIconMapper() {}

    static String resolveType(String kind, String explicitType, String title, String body) {
        String normalizedKind = lower(kind);
        String normalizedTitle = lower(title);
        String normalizedBody = lower(body);
        String text = (normalizedKind + " " + normalizedTitle + " " + normalizedBody).replace('_', ' ');
        String explicit = lower(explicitType).trim();
        boolean orderContext = "order".equals(normalizedKind) || text.contains("order");
        boolean mentionsPickup = text.contains("pickup") || text.contains("pick up");

        if ("security".equals(normalizedKind) || text.contains("security")) return "account_security";
        if (text.contains("refund")) return "refund_processed";
        if (text.contains("payment") || text.contains("paid")) return "payment_confirmed";
        if (text.contains("completed") || text.contains("picked up") || text.contains("pickedup")) return "order_completed";
        if (orderContext && text.contains("received")) return "order_received";
        if (orderContext && (text.contains("confirmed") || text.contains("confirmation"))) return "order_confirmed";
        if (orderContext && (text.contains("processing") || text.contains("preparing"))) return "order_processing";
        if (orderContext && (text.contains("cancelled") || text.contains("canceled"))) return "order_cancelled";
        if (text.contains("support") && (text.contains("reply") || text.contains("message"))) return "support_reply";
        if (text.contains("new message") || text.contains("message received")) return "new_message";

        if ("pickup_ready".equals(explicit)) {
            if (mentionsPickup && text.contains("ready")) return "pickup_ready";
            if (mentionsPickup) return "pickup_update";
            return "order_update";
        }
        if (!explicit.isEmpty() && !"general".equals(explicit) && !"order_update".equals(explicit)) return explicit;
        if (mentionsPickup && text.contains("ready")) return "pickup_ready";
        if (mentionsPickup) return "pickup_update";
        if (text.contains("coupon") || text.contains("offer") || text.contains("promo")) return "offer";
        if (text.contains("arrival") || text.contains("product")) return "product_arrival";
        if (orderContext) return "order_update";
        return explicit.isEmpty() ? "general" : explicit;
    }

    static int iconResourceForType(String type) {
        switch (lower(type).trim()) {
            case "order_received":
            case "order_update":
                return R.drawable.ic_event_order;
            case "order_confirmed":
            case "order_completed":
                return R.drawable.ic_event_celebration;
            case "payment_confirmed":
            case "payment_successful":
                return R.drawable.ic_event_payment;
            case "order_processing":
                return R.drawable.ic_event_processing;
            case "pickup_ready":
            case "pickup_update":
                return R.drawable.ic_event_store;
            case "order_cancelled":
                return R.drawable.ic_event_cancelled;
            case "refund_processed":
                return R.drawable.ic_event_refund;
            case "support_reply":
            case "new_message":
                return R.drawable.ic_event_support;
            case "offer":
            case "promotion":
            case "product_arrival":
                return R.drawable.ic_event_offer;
            default:
                return R.drawable.ic_event_general;
        }
    }

    private static String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
