export type VehicleCategory = 'bike' | 'toto' | 'cushion' | 'accessory' | 'scooter';

export interface VehicleCompatibility {
  type: VehicleCategory;
  brand: string;
  models: string[];
}

export interface Review {
  id: string;
  userName: string;
  userCity: string;
  rating: number;
  date: string;
  comment: string;
  vehicle: string;
  verifiedPurchase: boolean;
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
  deliveryFee: number;
  total: number;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  deliveryType: 'home_delivery' | 'workshop_pickup';
  paymentMethod: 'upi' | 'cod' | 'card';
  status: 'confirmed' | 'processing' | 'shipped' | 'delivered';
  createdAt: string;
  vehicleModel?: string;
}
