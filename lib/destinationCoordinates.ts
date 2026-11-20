export type DestinationCoordinates = {
  latitude: number;
  longitude: number;
};

export function isDestinationCoordinates(value: unknown): value is DestinationCoordinates {
  if (!value || typeof value !== 'object') return false;
  const coordinates = value as Record<string, unknown>;
  return typeof coordinates.latitude === 'number' && Number.isFinite(coordinates.latitude)
    && coordinates.latitude >= -90 && coordinates.latitude <= 90
    && typeof coordinates.longitude === 'number' && Number.isFinite(coordinates.longitude)
    && coordinates.longitude >= -180 && coordinates.longitude <= 180;
}
