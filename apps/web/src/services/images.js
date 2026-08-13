import { API_BASE_URL } from '../config';

export const DEFAULT_IMAGE = `${API_BASE_URL}/images/cars/default/image_1.jpg`;
export const PLACEHOLDER_IMAGE = `${API_BASE_URL}/images/cars/placeholder.jpg`;

export const getVehicleImageFolder = (vehicle) => {
  const name =
    vehicle.title ||
    `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() ||
    'Unknown Vehicle';
  return name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '_')
    .replace(/\s+/g, '_');
};

/**
 * Builds the most likely image URL for a vehicle, with sane fallbacks.
 * Order: absolute image_url → absolute image → folder-based path → default image.
 */
export const constructImageUrl = (vehicle) => {
  if (vehicle.image_url && vehicle.image_url.startsWith('http')) return vehicle.image_url;
  if (vehicle.image && vehicle.image.startsWith('http')) return vehicle.image;
  const folderName = vehicle.image_folder || getVehicleImageFolder(vehicle);
  return `${API_BASE_URL}/images/cars/${folderName}/image_1.jpg`;
};

export const formatPrice = (price) =>
  price != null ? `${Number(price).toLocaleString()} MAD` : 'Price on request';

export const normalizeVehicleTitle = (vehicle) =>
  vehicle.title || `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() || 'Unknown Vehicle';
