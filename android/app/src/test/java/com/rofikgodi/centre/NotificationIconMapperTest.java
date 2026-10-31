package com.rofikgodi.centre;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public final class NotificationIconMapperTest {
    @Test
    public void storePickupOrderReceivedIsNotMisclassifiedAsPickupReady() {
        String type = NotificationIconMapper.resolveType(
            "order",
            "pickup_ready",
            "Order received",
            "Your store-pickup order #RGC-9AD8F5B2F5 has been received."
        );

        assertEquals("order_received", type);
        assertEquals(R.drawable.ic_event_order, NotificationIconMapper.iconResourceForType(type));
    }

    @Test
    public void onlyAReadyForPickupEventGetsPickupQrClassification() {
        assertEquals("pickup_ready", NotificationIconMapper.resolveType(
            "order", "pickup_ready", "Ready for pickup", "Your order is ready for pickup."
        ));
        assertEquals("pickup_update", NotificationIconMapper.resolveType(
            "order", "pickup_ready", "Pickup order update", "There is an update to your pickup order."
        ));
    }

    @Test
    public void mapsTheRequestedEventTypesToDistinctArtwork() {
        assertEquals(R.drawable.ic_event_order, NotificationIconMapper.iconResourceForType("order_received"));
        assertEquals(R.drawable.ic_event_celebration, NotificationIconMapper.iconResourceForType("order_confirmed"));
        assertEquals(R.drawable.ic_event_payment, NotificationIconMapper.iconResourceForType("payment_confirmed"));
        assertEquals(R.drawable.ic_event_processing, NotificationIconMapper.iconResourceForType("order_processing"));
        assertEquals(R.drawable.ic_event_store, NotificationIconMapper.iconResourceForType("pickup_ready"));
        assertEquals(R.drawable.ic_event_celebration, NotificationIconMapper.iconResourceForType("order_completed"));
        assertEquals(R.drawable.ic_event_cancelled, NotificationIconMapper.iconResourceForType("order_cancelled"));
        assertEquals(R.drawable.ic_event_refund, NotificationIconMapper.iconResourceForType("refund_processed"));
        assertEquals(R.drawable.ic_event_support, NotificationIconMapper.iconResourceForType("support_reply"));
        assertEquals(R.drawable.ic_event_support, NotificationIconMapper.iconResourceForType("new_message"));
        assertEquals(R.drawable.ic_event_offer, NotificationIconMapper.iconResourceForType("offer"));
    }

    @Test
    public void fallsBackToGenericArtworkForUnknownEvents() {
        assertEquals(R.drawable.ic_event_general, NotificationIconMapper.iconResourceForType("unknown-event"));
    }
}
