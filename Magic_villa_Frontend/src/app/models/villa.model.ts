export interface Villa {
  id: number;
  name: string;
  occupancy: number;
  sqft: number;
  price: number;
  description?: string;
  imageUrl?: string;
  amenities?: string;
  propertyType?: string; // 'Villa' | 'HotelRoom' | 'Apartment'
}
