import { describe, expect, it } from 'vitest';
import {
  getBannerScheduleState,
  isBannerCurrentlyActive,
  mapStorefrontBannerRows,
} from '../src/lib/supabaseBanners';

describe('storefront banner RPC mapping', () => {
  it('maps only the public banner fields returned by the RPC', () => {
    expect(
      mapStorefrontBannerRows([
        {
          id: 'banner-1',
          title: 'Monsoon offers',
          subtitle: 'Shop the new collection',
          image_url: 'https://example.com/banner.webp',
          link_url: '/shop',
          button_label: 'Shop now',
        },
      ]),
    ).toEqual([
      {
        id: 'banner-1',
        title: 'Monsoon offers',
        subtitle: 'Shop the new collection',
        imageUrl: 'https://example.com/banner.webp',
        linkUrl: '/shop',
        buttonLabel: 'Shop now',
      },
    ]);
  });

  it('uses safe defaults for optional fields and removes rows without a title', () => {
    expect(
      mapStorefrontBannerRows([{ title: '  Featured  ' }, { title: '   ' }, null, 'bad row']),
    ).toEqual([
      {
        id: 'store-banner-1',
        title: 'Featured',
        subtitle: '',
        imageUrl: '',
        linkUrl: '/home',
        buttonLabel: 'Shop now',
      },
    ]);
  });

  it('returns an empty list for non-array RPC responses', () => {
    expect(mapStorefrontBannerRows(null)).toEqual([]);
    expect(mapStorefrontBannerRows({ title: 'not a row set' })).toEqual([]);
  });

  it('evaluates banner schedule states and filters out scheduled or expired banners', () => {
    const now = new Date('2026-11-12T10:00:00.000Z');

    expect(
      getBannerScheduleState(
        { active: true, startsAt: '2026-11-12T12:00:00.000Z' },
        now,
      ),
    ).toBe('scheduled');

    expect(
      getBannerScheduleState(
        { active: true, endsAt: '2026-11-12T08:00:00.000Z' },
        now,
      ),
    ).toBe('expired');

    expect(
      getBannerScheduleState(
        {
          active: true,
          startsAt: '2026-11-12T08:00:00.000Z',
          endsAt: '2026-11-12T12:00:00.000Z',
        },
        now,
      ),
    ).toBe('live');

    expect(
      isBannerCurrentlyActive(
        {
          active: false,
          startsAt: '2026-11-12T08:00:00.000Z',
          endsAt: '2026-11-12T12:00:00.000Z',
        },
        now,
      ),
    ).toBe(false);

    const filtered = mapStorefrontBannerRows(
      [
        {
          id: 'live-banner',
          title: 'Festival Offer',
          starts_at: '2026-11-12T08:00:00.000Z',
          ends_at: '2026-11-12T14:00:00.000Z',
        },
        {
          id: 'future-banner',
          title: 'Upcoming Drop',
          starts_at: '2026-11-13T00:00:00.000Z',
        },
        {
          id: 'past-banner',
          title: 'Expired Sale',
          ends_at: '2026-11-11T23:59:59.000Z',
        },
      ],
      now,
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('live-banner');
  });
});
