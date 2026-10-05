export type VehicleCategory = 'bike' | 'toto' | 'cushion' | 'accessory' | 'scooter';

export interface VehicleCompatibility {
  type: VehicleCategory;
  brand: string;
  models: string[];
}

export interface Product {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'red' | 'green' | 'blue' | 'orange';
  slug: string;
  category: VehicleCategory;
  categoryLabel: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  image: string;
  additionalImages?: string[];
  description: string;
  features: string[];
  isBestseller?: boolean;
  isNew?: boolean;
  isWaterproof?: boolean;
  isCustomizable?: boolean;
  inStock: boolean;
  materials: string[];
  colors: { name: string; hex: string; bgClass: string }[];
  stitchPatterns: string[];
  compatibility: string[];
  thicknessOptions: { label: string; extraPrice: number }[];
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  quantity: number;
  selectedColor: { name: string; hex: string };
  selectedStitch?: string;
  selectedThickness?: { label: string; extraPrice: number };
  customEmbroideryText?: string;
  unitPrice: number;
}

export interface CustomSeatOrder {
  vehicleType: string;
  vehicleBrand: string;
  vehicleModel: string;
  baseFoam: 'standard' | 'high_density' | 'gel_infused';
  coverMaterial: 'rexine_leatherette' | 'carbon_fiber' | 'air_mesh' | 'quilted_velvet';
  stitchPattern: 'diamond' | 'ribbed' | 'racing_stripe' | 'plain';
  colorAccent: string;
  customText: string;
  estimatedPrice: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  isGuest: boolean;
  avatar?: string;
  vehicle?: string;
  joinedDate?: string;
}

export interface OrderDetails {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  customerName: string;
  phone: string;
  vehicleModel: string;
  note?: string;
  paymentMethod: 'pay_at_store' | 'pay_online';
  paymentStatus: 'pending' | 'paid' | 'failed';
  fulfillmentMethod: 'STORE_PICKUP';
  pickupStore: string;
  status: 'NEW' | 'CONFIRMED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  pickupToken?: string;
}

export interface CustomerOrderRecord {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  payment_method: string;
  payment_status: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  vehicle_model: string | null;
  fulfillment_method: string;
  pickup_store: string;
  pickup_note?: string | null;
  created_at: string;
  order_items: { product_id: string | null; product_name: string; color: string | null; quantity: number; unit_price: number; image_url?: string | null }[];
}

export interface CustomerNotificationRecord {
  id: string;
  kind: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
  expires_at: string;
}
