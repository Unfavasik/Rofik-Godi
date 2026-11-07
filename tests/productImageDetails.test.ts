import { describe, expect, it } from 'vitest';
import { extractImageAttributes } from '../src/lib/productImageDetails';

describe('product photo material and stitch suggestions', () => {
  it('recognizes material, quilting, and contrast stitching from descriptive captions', () => {
    expect(
      extractImageAttributes(
        'A black faux leather seat cover with perforated panels, diamond-quilted centers and contrast stitching.',
      ),
    ).toEqual({
      materials: ['Leather-like upholstery (visual estimate)', 'Perforated upholstery'],
      stitchPatterns: ['Diamond quilting', 'Contrast stitching'],
    });
  });

  it('recognizes mesh and channel stitching from descriptive captions', () => {
    expect(
      extractImageAttributes(
        'A black seat cover with breathable mesh, horizontal channels, and visible seams.',
      ),
    ).toEqual({
      materials: ['Mesh fabric'],
      stitchPatterns: ['Channel stitching'],
    });
  });

  it('fills both fields with a cautious review note when details are not visible', () => {
    expect(extractImageAttributes('A car accessory shown on a white background.')).toEqual({
      materials: ['Material unclear from photo — confirm before listing'],
      stitchPatterns: ['Stitch pattern unclear from photo — confirm before listing'],
    });
  });
});
