// Google Maps API Configuration
//
// To use Google Maps features, you need to:
// 1. Get a Google Maps API key from Google Cloud Console
// 2. Enable the following APIs:
//    - Maps JavaScript API
//    - Directions API
//    - Places API
//    - Geocoding API
// 3. Replace 'YOUR_GOOGLE_MAPS_API_KEY_HERE' with your actual API key
// 4. For production, consider using environment variables

export const GOOGLE_MAPS_CONFIG = {
  apiKey: "YOUR_GOOGLE_MAPS_API_KEY_HERE",

  // API endpoints
  endpoints: {
    directions: "https://maps.googleapis.com/maps/api/directions/json",
    geocoding: "https://maps.googleapis.com/maps/api/geocode/json",
    places: "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    placeDetails: "https://maps.googleapis.com/maps/api/place/details/json",
  },

  // Default settings
  defaults: {
    walkingRadius: 2000, // 2km radius for safe spots
    maxRoutes: 3, // Maximum number of route alternatives
    routeMode: "walking", // Default travel mode
  },

  // Place types for safe spots
  safeSpotTypes: {
    police: "police",
    hospital: "hospital",
    pharmacy: "pharmacy",
    fireStation: "fire_station",
    convenienceStore: "convenience_store",
    gasStation: "gas_station",
  },
};

// Instructions for setting up Google Maps API
export const SETUP_INSTRUCTIONS = `
## Setting up Google Maps API

1. **Create a Google Cloud Project**
   - Go to Google Cloud Console (console.cloud.google.com)
   - Create a new project or select existing one

2. **Enable Required APIs**
   - Maps JavaScript API
   - Directions API
   - Places API
   - Geocoding API

3. **Create API Key**
   - Go to Credentials section
   - Create API Key
   - Restrict the key to your package name/bundle ID

4. **Update Configuration**
   - Replace 'YOUR_GOOGLE_MAPS_API_KEY_HERE' in GoogleMapsService.js
   - For production, use environment variables

5. **Set up Billing**
   - Google Maps APIs require billing to be enabled
   - You get $200 free credit monthly

## Security Notes
- Never commit API keys to version control
- Use environment variables for production
- Restrict API key usage by IP/HTTP referrer
- Monitor API usage in Google Cloud Console
`;
