package com.rofikgodi.centre;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.text.TextUtils;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Receives data-only FCM messages and owns notification rendering on Android. */
public final class RofikMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "rofik-godi-styled-v1";
    private static final String CHANNEL_NAME = "Rofik Godi notifications";
    private static final int MAX_IMAGE_BYTES = 3 * 1024 * 1024;
    private static final Pattern ORDER_NUMBER = Pattern.compile("\\bRGC-[A-Z0-9]{8,32}\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern ORDER_SLUG = Pattern.compile("^[0-9a-f]{32}$", Pattern.CASE_INSENSITIVE);
    private static final Pattern ORDER_DETAIL_PATH = Pattern.compile("^/(?:my-orders|myorder|my-order)/order/[0-9a-f]{32}$", Pattern.CASE_INSENSITIVE);
    private static final Pattern LEGACY_PRODUCT_ARRIVAL_TITLE = Pattern.compile("^\\s*New arrival:\\s*(.+?)\\s*$", Pattern.CASE_INSENSITIVE);

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        String title = firstNonEmpty(data.get("title"),
            remoteMessage.getNotification() == null ? null : remoteMessage.getNotification().getTitle(),
            "Rofik Godi Centre");
        String body = firstNonEmpty(data.get("body"),
            remoteMessage.getNotification() == null ? null : remoteMessage.getNotification().getBody(),
            "You have a new update.");
        String notificationId = firstNonEmpty(data.get("notification_id"), remoteMessage.getMessageId(), UUID.randomUUID().toString());
        String kind = firstNonEmpty(data.get("kind"), "general");
        String type = inferType(data, title, body);
        String orderNumber = findOrderNumber(title + " " + body + " " + value(data.get("order_number")));

        ensureNotificationChannel();
        if (Build.VERSION.SDK_INT >= 33
            && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        String viewRoute = routeForView(data, kind, notificationId, orderNumber);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_rofik)
            // Android requires a monochrome small status icon; use the real launcher artwork
            // as the larger notification-card icon instead of duplicating the R glyph.
            .setLargeIcon(launcherIcon())
            .setColor(Color.rgb(217, 35, 45))
            .setContentTitle(title)
            .setContentText(body)
            .setSubText("Rofik Godi Centre")
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setCategory(categoryFor(type))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setContentIntent(actionIntent(viewRoute, notificationId, "open"));

        Bitmap productImage = downloadImage(value(data.get("image_url")));
        if (productImage != null) {
            builder.setStyle(new NotificationCompat.BigPictureStyle()
                .bigPicture(productImage)
                .bigLargeIcon(launcherIcon()));
        }

        boolean orderNotification = "order".equalsIgnoreCase(kind) || type.startsWith("order_") || "pickup_ready".equals(type);
        boolean accountSecurityNotification = "security".equalsIgnoreCase(kind) || "account_security".equals(type);
        boolean productNotification = "product".equalsIgnoreCase(kind) || type.contains("product") || type.contains("arrival");
        if (orderNotification) {
            String orderActionLabel = "pickup_ready".equals(type) ? "View Pickup QR" : "View My Order";
            builder.addAction(android.R.drawable.ic_menu_view, orderActionLabel,
                actionIntent(viewRoute, notificationId, "view_order"));
            if ("order_completed".equals(type) && orderNumber != null) {
                String againRoute = "/notifications?notification=" + Uri.encode(notificationId)
                    + "&order=" + Uri.encode(orderNumber) + "&buyAgain=1";
                builder.addAction(android.R.drawable.ic_menu_add, "Shop Again",
                    actionIntent(againRoute, notificationId, "shop_again"));
            } else if ("pickup_ready".equals(type)) {
                builder.addAction(android.R.drawable.ic_menu_directions, "Directions",
                    mapIntent(notificationId));
            }
        } else if (productNotification) {
            builder.addAction(android.R.drawable.ic_menu_view, "View Product",
                actionIntent(viewRoute, notificationId, "view_product"));
        } else if (accountSecurityNotification) {
            builder.addAction(android.R.drawable.ic_menu_view, "Review Activity",
                actionIntent(viewRoute, notificationId, "review_activity"));
        } else {
            builder.addAction(android.R.drawable.ic_menu_view, "Open",
                actionIntent(viewRoute, notificationId, "open"));
        }

        int stableId = notificationId.hashCode();
        try {
            NotificationManagerCompat.from(this).notify("rofik-" + notificationId, stableId, builder.build());
        } catch (SecurityException ignored) {
            // Notification permission may be revoked while a message is being delivered.
        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Order updates, offers and product announcements from Rofik Godi Centre");
        channel.enableLights(true);
        channel.setLightColor(Color.rgb(217, 35, 45));
        channel.enableVibration(true);
        Uri sound = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.rofik_notification);
        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        channel.setSound(sound, attributes);
        manager.createNotificationChannel(channel);
    }

    private PendingIntent actionIntent(String route, String notificationId, String action) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setAction("com.rofikgodi.centre.NOTIFICATION_" + action.toUpperCase(Locale.ROOT));
        intent.setData(Uri.parse("rofikgodi://notification/" + Uri.encode(notificationId) + "/" + action));
        intent.putExtra(MainActivity.EXTRA_NOTIFICATION_ROUTE, route);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, (notificationId + action).hashCode(), intent, flags);
    }

    private PendingIntent mapIntent(String notificationId) {
        String address = "ROFIK GODI CENTRE, Jalangi Road, Raninagar, Keshobnagar, Berhampore, West Bengal 742102";
        Uri uri = Uri.parse("https://www.google.com/maps/dir/?api=1&destination=" + Uri.encode(address) + "&travelmode=driving");
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, (notificationId + "directions").hashCode(), intent, flags);
    }

    private String routeForView(Map<String, String> data, String kind, String notificationId, String orderNumber) {
        String candidate = internalPath(data.get("action_url"));
        String type = inferType(data, value(data.get("title")), value(data.get("body")));
        boolean orderNotification = "order".equalsIgnoreCase(kind) || type.startsWith("order_") || "pickup_ready".equals(type);
        String orderSlug = value(data.get("order_slug"));
        if (!ORDER_SLUG.matcher(orderSlug).matches()) orderSlug = value(data.get("orderSlug"));
        if (orderNotification && ORDER_SLUG.matcher(orderSlug).matches()
            && !isSpecificOrderRoute(candidate)) {
            return "/my-order/order/" + orderSlug.toLowerCase(Locale.ROOT);
        }
        if (orderNotification && !isSpecificOrderRoute(candidate)) {
            String route = "/notifications";
            if (!TextUtils.isEmpty(notificationId)) route += "?notification=" + Uri.encode(notificationId);
            if (!TextUtils.isEmpty(orderNumber)) route += (route.contains("?") ? "&" : "?") + "order=" + Uri.encode(orderNumber);
            return route;
        }
        boolean productNotification = "product".equalsIgnoreCase(kind) || type.contains("product") || type.contains("arrival");
        if (productNotification && (candidate == null || "/shop".equalsIgnoreCase(candidate) || "/shop/".equalsIgnoreCase(candidate))) {
            String productRoute = legacyProductRoute(data);
            if (productRoute != null) return productRoute;
        }
        if (candidate != null) return candidate;
        if (!TextUtils.isEmpty(notificationId)) return "/notifications?notification=" + Uri.encode(notificationId);
        return "/notifications";
    }

    private boolean isSpecificOrderRoute(String route) {
        if (TextUtils.isEmpty(route)) return false;
        String path = route.split("[?#]", 2)[0];
        return ORDER_DETAIL_PATH.matcher(path).matches();
    }

    private String legacyProductRoute(Map<String, String> data) {
        String slug = value(data.get("product_slug")).trim();
        if (TextUtils.isEmpty(slug)) {
            Matcher matcher = LEGACY_PRODUCT_ARRIVAL_TITLE.matcher(value(data.get("title")));
            if (!matcher.matches()) return null;
            slug = matcher.group(1).trim();
        }
        slug = slug.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-+$", "");
        if (!slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*")) return null;
        return "/shop/products/" + Uri.encode(slug);
    }

    private String internalPath(String raw) {
        if (TextUtils.isEmpty(raw)) return null;
        Uri uri = Uri.parse(raw.trim());
        if (raw.startsWith("/") && !raw.startsWith("//") && uri.getAuthority() == null && !raw.contains("\\")) return raw;
        if ("https".equalsIgnoreCase(uri.getScheme()) && "rofik-godi.pages.dev".equalsIgnoreCase(uri.getHost())) {
            String path = uri.getEncodedPath();
            if (TextUtils.isEmpty(path)) path = "/";
            if (uri.getEncodedQuery() != null) path += "?" + uri.getEncodedQuery();
            if (uri.getEncodedFragment() != null) path += "#" + uri.getEncodedFragment();
            return path;
        }
        return null;
    }

    private String inferType(Map<String, String> data, String title, String body) {
        String explicit = value(data.get("type")).toLowerCase(Locale.ROOT);
        if (!explicit.isEmpty()) return explicit;
        String text = (value(data.get("kind")) + " " + title + " " + body).toLowerCase(Locale.ROOT);
        if ("security".equalsIgnoreCase(value(data.get("kind"))) || text.contains("security")) return "account_security";
        if (text.contains("completed") || text.contains("picked up") || text.contains("picked_up")) return "order_completed";
        if (text.contains("payment") || text.contains("paid")) return "payment_confirmed";
        if (text.contains("ready") || text.contains("pickup")) return "pickup_ready";
        if (text.contains("order")) return "order_update";
        if (text.contains("coupon") || text.contains("offer") || text.contains("promo")) return "offer";
        if (text.contains("arrival") || text.contains("product")) return "product_arrival";
        return "general";
    }

    private String categoryFor(String type) {
        if (type.startsWith("order_") || "payment_confirmed".equals(type) || "pickup_ready".equals(type)) return NotificationCompat.CATEGORY_STATUS;
        if ("offer".equals(type)) return "promo";
        if ("product_arrival".equals(type)) return "recommendation";
        return NotificationCompat.CATEGORY_STATUS;
    }

    private String findOrderNumber(String text) {
        Matcher matcher = ORDER_NUMBER.matcher(value(text));
        return matcher.find() ? matcher.group().toUpperCase(Locale.ROOT) : null;
    }

    private Bitmap launcherIcon() {
        Drawable drawable;
        try {
            drawable = getPackageManager().getApplicationIcon(getPackageName());
        } catch (PackageManager.NameNotFoundException ignored) {
            drawable = ContextCompat.getDrawable(this, R.mipmap.ic_launcher);
        }
        if (drawable == null) return null;
        int size = 96;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, size, size);
        drawable.draw(canvas);
        return bitmap;
    }

    private Bitmap downloadImage(String rawUrl) {
        if (TextUtils.isEmpty(rawUrl)) return null;
        HttpURLConnection connection = null;
        try {
            URL url = new URL(rawUrl);
            if (!"https".equalsIgnoreCase(url.getProtocol())) return null;
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(2500);
            connection.setReadTimeout(3000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("Accept", "image/*");
            if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) return null;
            try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];
                int total = 0;
                int read;
                while ((read = input.read(buffer)) != -1) {
                    total += read;
                    if (total > MAX_IMAGE_BYTES) return null;
                    output.write(buffer, 0, read);
                }
                byte[] bytes = output.toByteArray();
                BitmapFactory.Options bounds = new BitmapFactory.Options();
                bounds.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);
                int sample = 1;
                while (bounds.outWidth / sample > 1200 || bounds.outHeight / sample > 900) sample *= 2;
                BitmapFactory.Options options = new BitmapFactory.Options();
                options.inSampleSize = sample;
                return BitmapFactory.decodeByteArray(bytes, 0, bytes.length, options);
            }
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private String firstNonEmpty(String... values) {
        for (String value : values) if (!TextUtils.isEmpty(value)) return value;
        return "";
    }

    private String value(String value) {
        return value == null ? "" : value;
    }
}
