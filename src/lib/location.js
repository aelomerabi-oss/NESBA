import { Platform } from 'react-native';
import * as Location from 'expo-location';

function formatPlace({ city, district, subregion, region, country }) {
  const place = city || district || subregion || region;
  return [place, country].filter(Boolean).join(', ');
}

// expo-location cannot reverse-geocode on web, so use OpenStreetMap there.
async function reverseGeocodeWeb(latitude, longitude) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${latitude}&lon=${longitude}`,
    { headers: { 'Accept-Language': navigator.language || 'en' } }
  );

  if (!response.ok) {
    throw new Error('Could not look up your location.');
  }

  const { address = {} } = await response.json();

  return formatPlace({
    city: address.city || address.town || address.village,
    district: address.suburb,
    subregion: address.county,
    region: address.state,
    country: address.country,
  });
}

/**
 * Ask for permission and return the user's current place as text,
 * e.g. "Amsterdam, Netherlands".
 */
export async function getCurrentPlaceName() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error(
      'Location permission was denied. Allow location access in your settings, or type the place instead.'
    );
  }

  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  if (Platform.OS === 'web') {
    return reverseGeocodeWeb(coords.latitude, coords.longitude);
  }

  const [place] = await Location.reverseGeocodeAsync({
    latitude: coords.latitude,
    longitude: coords.longitude,
  });

  return place ? formatPlace(place) : '';
}
