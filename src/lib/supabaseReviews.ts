import { supabase } from './supabase';

export interface ProductReviewRecord {
  id: string;
  product_id: string;
  order_id: string;
  customer_id: string;
  author_name: string;
  rating: number;
  review_text: string | null;
  is_verified_purchase: boolean;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  product_name?: string;
}

export type ReviewFilterMode = 'most-recent' | 'highest-rating' | 'verified-only';

export const REVIEW_FILTER_OPTIONS: ReadonlyArray<{ id: ReviewFilterMode; label: string }> = [
  { id: 'most-recent', label: 'Most Recent' },
  { id: 'highest-rating', label: 'Highest Rating' },
  { id: 'verified-only', label: 'Verified Purchases Only' },
];

export function isVerifiedProductReview(
  review: Pick<ProductReviewRecord, 'is_verified_purchase' | 'product_id' | 'order_id'>,
  productId?: string,
  verifiedOrderIds?: ReadonlySet<string>,
): boolean {
  const matchesProduct = !productId || !review.product_id || review.product_id === productId;
  if (!matchesProduct) return false;
  if (review.is_verified_purchase) return true;
  return Boolean(verifiedOrderIds && review.order_id && verifiedOrderIds.has(review.order_id));
}

export function filterAndSortReviews(
  reviews: readonly ProductReviewRecord[],
  mode: ReviewFilterMode,
  productId?: string,
  verifiedOrderIds?: ReadonlySet<string>,
): ProductReviewRecord[] {
  const base =
    mode === 'verified-only'
      ? reviews.filter((review) =>
          isVerifiedProductReview(review, productId || review.product_id, verifiedOrderIds),
        )
      : [...reviews];

  return base.sort((a, b) => {
    if (mode === 'highest-rating' && b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    const timeA = Date.parse(a.created_at) || 0;
    const timeB = Date.parse(b.created_at) || 0;
    return timeB - timeA;
  });
}

export interface ProductRatingSummary {
  product_id: string;
  average_rating: number;
  review_count: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
}

export interface ReviewEligibleOrder {
  id: string;
  order_number: string;
  status: string;
  order_items: { product_id: string | null }[];
}

const emptySummary = (productId: string): ProductRatingSummary => ({
  product_id: productId,
  average_rating: 0,
  review_count: 0,
  five_star_count: 0,
  four_star_count: 0,
  three_star_count: 0,
  two_star_count: 0,
  one_star_count: 0,
});

export async function getProductRatingSummary(productId: string): Promise<ProductRatingSummary> {
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(productId)) return emptySummary(productId);
  const { data, error } = await supabase
    .from('product_rating_summary')
    .select('product_id,average_rating,review_count,five_star_count,four_star_count,three_star_count,two_star_count,one_star_count')
    .eq('product_id', productId)
    .maybeSingle();
  if (error || !data) return emptySummary(productId);
  return {
    product_id: data.product_id,
    average_rating: Number(data.average_rating || 0),
    review_count: Number(data.review_count || 0),
    five_star_count: Number(data.five_star_count || 0),
    four_star_count: Number(data.four_star_count || 0),
    three_star_count: Number(data.three_star_count || 0),
    two_star_count: Number(data.two_star_count || 0),
    one_star_count: Number(data.one_star_count || 0),
  };
}

export async function listPublishedReviews(productId?: string, limit = 20): Promise<ProductReviewRecord[]> {
  if (!supabase) return [];
  let query = supabase
    .from('reviews')
    .select('id,product_id,order_id,customer_id,author_name,rating,review_text,is_verified_purchase,is_published,created_at,products(name)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (productId) query = query.eq('product_id', productId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row) => {
    const product = row.products as unknown as { name?: string } | null;
    return { ...row, product_name: product?.name || undefined } as ProductReviewRecord;
  });
}

export async function listMyProductReviews(expectedUserId?: string): Promise<ProductReviewRecord[]> {
  if (!supabase) return [];
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user || (expectedUserId && auth.user.id !== expectedUserId)) return [];
  const { data, error } = await supabase
    .from('reviews')
    .select('id,product_id,order_id,customer_id,author_name,rating,review_text,is_verified_purchase,is_published,created_at,updated_at')
    .eq('customer_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  return error || !data ? [] : data as ProductReviewRecord[];
}

export async function getMyReviewContext(productId: string, expectedUserId?: string) {
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(productId)) return { orders: [] as ReviewEligibleOrder[], reviews: [] as ProductReviewRecord[] };
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user || (expectedUserId && auth.user.id !== expectedUserId)) {
    return { orders: [] as ReviewEligibleOrder[], reviews: [] as ProductReviewRecord[] };
  }
  const [ordersResult, reviewsResult] = await Promise.all([
    supabase.from('orders')
      .select('id,order_number,status,order_items(product_id)')
      .eq('user_id', auth.user.id)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('reviews')
      .select('id,product_id,order_id,customer_id,author_name,rating,review_text,is_verified_purchase,is_published,created_at,updated_at')
      .eq('customer_id', auth.user.id)
      .eq('product_id', productId)
      .limit(100),
  ]);
  const orders = (ordersResult.error ? [] : ordersResult.data || []) as unknown as ReviewEligibleOrder[];
  return {
    orders: orders.filter((order) => order.order_items?.some((item) => item.product_id === productId)),
    reviews: reviewsResult.error || !reviewsResult.data ? [] : reviewsResult.data as ProductReviewRecord[],
  };
}

export async function createProductReview(input: { productId: string; orderId: string; rating: number; reviewText: string }) {
  if (!supabase) return { error: new Error('Review service is not configured') };
  const { error } = await supabase.rpc('create_product_review', {
    p_product_id: input.productId,
    p_order_id: input.orderId,
    p_rating: input.rating,
    p_review_text: input.reviewText.trim() || null,
  });
  return { error };
}

export async function updateProductReview(input: { reviewId: string; rating: number; reviewText: string }) {
  if (!supabase) return { error: new Error('Review service is not configured') };
  const { error } = await supabase.rpc('update_product_review', {
    p_review_id: input.reviewId,
    p_rating: input.rating,
    p_review_text: input.reviewText.trim() || null,
  });
  return { error };
}

export async function listAdminProductReviews(): Promise<ProductReviewRecord[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('reviews')
    .select('id,product_id,order_id,customer_id,author_name,rating,review_text,is_verified_purchase,is_published,created_at,products(name)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error || !data) return null;
  return data.map((row) => {
    const product = row.products as unknown as { name?: string } | null;
    return { ...row, product_name: product?.name || 'Product' } as ProductReviewRecord;
  });
}

export async function setProductReviewPublished(reviewId: string, isPublished: boolean) {
  if (!supabase) return { error: new Error('Review service is not configured') };
  const { error } = await supabase.rpc('admin_set_review_published', { p_review_id: reviewId, p_is_published: isPublished });
  return { error };
}

export async function deleteProductReview(reviewId: string) {
  if (!supabase) return { error: new Error('Review service is not configured') };
  const { error } = await supabase.rpc('admin_delete_review', { p_review_id: reviewId });
  return { error };
}
