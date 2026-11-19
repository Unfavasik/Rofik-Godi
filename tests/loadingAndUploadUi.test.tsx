import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CustomerOrdersModal } from '../src/components/CustomerOrdersModal';
import { MyOrdersView } from '../src/components/MyOrdersView';
import { ConfirmDialog } from '../src/components/ConfirmDialog';
import { UploadProgressBar } from '../src/components/UploadProgressBar';
import { ProductReviewsSkeleton } from '../src/components/AccountPageSkeleton';
import { getUploadStageLabel, type UploadProgressState } from '../src/lib/useUploadProgress';

describe('Loading skeletons, spinners, and upload progress UI', () => {
  it('renders shimmer skeleton cards in CustomerOrdersModal list while loading', () => {
    const html = renderToStaticMarkup(
      <CustomerOrdersModal
        orders={[]}
        reviews={[]}
        loading={true}
        customerName="Test Customer"
        currentUserId="customer-id"
        onClose={() => {}}
        onReview={() => {}}
      />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('skeleton-shimmer');
    expect(html).not.toContain('Rofik Godi Centre');
  });

  it('renders CustomerOrderDetailsSkeleton in CustomerOrdersModal when opening a deep-linked order while loading', () => {
    const html = renderToStaticMarkup(
      <CustomerOrdersModal
        orders={[]}
        reviews={[]}
        loading={true}
        initialOrderSlug="0123456789abcdef0123456789abcdef"
        customerName="Test Customer"
        currentUserId="customer-id"
        onClose={() => {}}
        onReview={() => {}}
      />,
    );
    expect(html).toContain('data-testid="customer-order-details-skeleton"');
    expect(html).toContain('role="status"');
    expect(html).toContain('skeleton-shimmer');
    expect(html).not.toContain('Rofik Godi Centre');
  });

  it('renders structured shimmer cards in MyOrdersView while loading', () => {
    const html = renderToStaticMarkup(
      <MyOrdersView
        orders={[]}
        loading={true}
        products={[]}
        reviews={[]}
        customerName="Test Customer"
        onClose={() => {}}
        onShop={() => {}}
        onReview={() => {}}
      />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading orders…');
    expect(html).toContain('skeleton-shimmer');
  });

  it('renders ProductReviewsSkeleton shimmer cards', () => {
    const html = renderToStaticMarkup(<ProductReviewsSkeleton count={2} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading reviews…');
    expect(html).toContain('skeleton-shimmer');
  });

  it('renders a spinner and disables the confirm button in ConfirmDialog when confirmLoading is true', () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open={true}
        title="Cancel order?"
        message="Confirm cancellation"
        confirmLabel="Yes, cancel"
        confirmLoading={true}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(html).toContain('animate-spin');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Yes, cancel');
  });

  it('renders UploadProgressBar when active and returns empty markup when inactive', () => {
    const inactiveState: UploadProgressState = {
      active: false,
      progress: 0,
      stageLabel: '',
      fileName: '',
      completedCount: 0,
      totalCount: 0,
    };
    expect(renderToStaticMarkup(<UploadProgressBar state={inactiveState} />)).toBe('');

    const activeState: UploadProgressState = {
      active: true,
      progress: 72,
      stageLabel: 'Uploading seat photo…',
      fileName: 'seat-cover.webp',
      completedCount: 1,
      totalCount: 3,
    };
    const html = renderToStaticMarkup(<UploadProgressBar state={activeState} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="72"');
    expect(html).toContain('Uploading seat photo…');
    expect(html).toContain('2/3');
    expect(html).toContain('seat-cover.webp');
    expect(html).toContain('72%');
  });

  it('maps upload progress percentages to the expected stage labels', () => {
    expect(getUploadStageLabel(12, 'banner')).toBe('Preparing banner…');
    expect(getUploadStageLabel(45, 'banner')).toBe('Processing banner…');
    expect(getUploadStageLabel(75, 'banner')).toBe('Uploading banner…');
    expect(getUploadStageLabel(100, 'banner')).toBe('Uploaded banner');
  });
});
