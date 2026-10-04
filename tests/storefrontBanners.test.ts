import { describe, expect, it } from 'vitest';
import { mapStorefrontBannerRows } from '../src/lib/supabaseBanners';

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
});
