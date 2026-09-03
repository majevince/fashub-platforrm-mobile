/**
 * Matches the FabricInventory model as read/written by app/api/fabric-
 * inventory/**{route.ts} directly — the real inventory-management screen's
 * data model, distinct from the smaller FabricCardData snapshot used for
 * chat message cards (packages/types/src/message.ts).
 */
export interface FabricColorVariant {
  id?: string;
  label?: string;
  hex?: string;
  photos?: string[];
}

export interface FabricOwnerInfo {
  profileId?: string;
  userId: string;
  name: string;
  avatar?: string | null;
  role?: 'designer' | 'tailor';
}

export interface FabricInventoryItem {
  id: string;
  name: string;
  fabricType: string;
  description?: string | null;
  composition?: string | null;
  color: string;
  secondaryColor?: string | null;
  patternColorMix?: string | null;
  pattern?: string | null;
  weight?: string | null;
  texture?: string | null;
  stretch?: boolean;
  stretchType?: string | null;
  transparency?: string | null;
  durability?: string | null;
  usageCategories: string[];
  season?: string | null;
  quantity: number;
  unit: string;
  width?: number | null;
  costPerUnit: number;
  totalCost?: number | null;
  sellingPricePerUnit?: number | null;
  supplier?: string | null;
  supplierContact?: string | null;
  purchaseDate?: string | null;
  storageLocation?: string | null;
  rollNumber?: string | null;
  reserved: number;
  available: number;
  inStock: boolean;
  reorderLevel?: number | null;
  images: string[];
  colorVariants: FabricColorVariant[];
  tags: string[];
  notes?: string | null;
  createdAt: string;
  ownerInfo?: FabricOwnerInfo | null;
}

export type CreateFabricPayload = {
  userId: string;
  role: 'designer' | 'tailor';
  name: string;
  fabricType: string;
} & Partial<Omit<FabricInventoryItem, 'id' | 'createdAt' | 'ownerInfo' | 'available'>>;

export type UpdateFabricPayload = { userId: string } & Partial<Omit<FabricInventoryItem, 'id' | 'createdAt' | 'ownerInfo'>>;
