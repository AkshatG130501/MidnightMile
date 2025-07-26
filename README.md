# Midnight Mile

**Security in every step.**

A React Native + Expo safety-focused navigation app that provides secure route mapping, AI companion support, and emergency assistance features.

## Features

### 🗺️ Safe Route Mapping

- Real-time safety overlays showing lighting, foot traffic, and crime data
- Multiple route options with safety scores
- Night-mode optimized interface

### 🤖 AI Companion

- Voice-activated AI companion for walking assistance
- Background noise monitoring for distress detection
- Periodic safety check-ins during walks

### 👥 Trusted Contacts

- Emergency contact management
- Automatic alerts and location sharing
- Auto check-in reminders at destinations

### 🏥 Safe Spots

- Nearby police stations, hospitals, and 24/7 stores
- Real-time information and direct calling
- GPS navigation to safe locations

### 🆘 Emergency Features

- One-touch SOS button
- Quick emergency contact calling
- Fake call simulation for safety

## Tech Stack

- **React Native** with **Expo** SDK 53
- **React Navigation** for navigation
- **React Native Maps** for mapping functionality
- **Expo Location** for GPS services
- **Expo Speech** for AI companion voice features
- **Expo AV** for audio monitoring

## Brand Identity

### Colors

- **Background**: Pure White (#FFFFFF)
- **Primary**: Deep Navy (#0C1E3C)
- **Secondary**: Slate Gray (#4A5568)
- **Accent**: Warm Beige (#F5EDE0)
- **Highlight**: Muted Teal (#3D828B)
- **Alert**: Safety Amber (#FFB100)
- **Accent**: Soft Coral (#E37B7B)

### Typography

- **Headlines**: Modern sans-serif (Satoshi, Outfit)
- **Body**: Neutral, readable (Inter, Noto Sans)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd midnightmile
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Google Maps API**

   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Enable the following APIs:
     - Maps JavaScript API
     - Directions API
     - Places API
     - Geocoding API
   - Create an API Key and restrict it appropriately
   - Update `src/config/GoogleMapsConfig.js` with your API key

   ```javascript
   export const GOOGLE_MAPS_CONFIG = {
     apiKey: "YOUR_ACTUAL_API_KEY_HERE",
     // ... rest of config
   };
   ```

4. **Start the development server**

   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - iOS: `npm run ios`
   - Android: `npm run android`
   - Web: `npm run web`

## Project Structure

```
src/
├── screens/           # Main app screens
│   ├── LandingScreen.js
│   ├── HomeScreen.js
│   ├── ContactsScreen.js
│   ├── SafeSpotsScreen.js
│   └── QuickHelpScreen.js
├── components/        # Reusable components
├── services/          # API and external service integrations
└── constants/
    └── theme.js       # Brand colors, fonts, and styling
```

## Key Screens

### 1. Landing/Login

- Clean, minimal interface with brand identity
- Authentication options (Email, Google, Apple)

### 2. Home (Map Interface)

- Full-screen map with night mode default
- Destination search and safe route calculation
- AI companion activation
- SOS emergency button

### 3. Trusted Contacts

- Emergency contact management
- Quick alert sending
- Contact relationship categorization

### 4. Safe Spots

- Nearby safety locations (police, medical, 24/7 stores)
- Real-time information and direct calling
- Category filtering and navigation

### 5. Quick Help

- Emergency contact shortcuts
- SOS activation
- Safety tips and resources
- Quick action buttons

## Permissions Required

### iOS

- Location (When in Use & Always)
- Microphone access for AI companion
- Contacts access for trusted contacts

### Android

- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- RECORD_AUDIO
- READ_CONTACTS
- CALL_PHONE

## Development

### Running the app

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

### Building for production

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Future Enhancements

- Integration with real crime data APIs
- Machine learning for route safety scoring
- Voice recognition for distress detection
- Integration with ride-sharing services
- Community safety reporting features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Safety Disclaimer

This app is designed to enhance personal safety but should not be considered a replacement for common sense safety practices or professional security services. Always trust your instincts and contact emergency services directly when in immediate danger.
