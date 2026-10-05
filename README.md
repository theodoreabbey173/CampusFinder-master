# CampusFinder 🎓📱

## 👨‍💻 Developer Information

**Developer**: Theodore Gyaqueh Abbey  
**Institution**: University of Ghana, Legon    
**Email**: theodoreabbey174@gmail.com   
**LinkedIn**: www.linkedin.com/in/theodore-abbey   
**GitHub**: theodoreabbey173    
**Program**: Computer Science  
**Academic Year**: 2026  

---

A mobile application designed to help students at University of Ghana Legon report, find, and communicate about lost & found items on campus.

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Firebase](https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black)
![Lucide](https://img.shields.io/badge/lucide--react--native-F56565?style=for-the-badge&logo=lucide&logoColor=white)

## 📋 About The Project

CampusFinder is a comprehensive lost and found solution specifically designed for university students. The app provides a secure platform where students can report lost items, browse found items, and communicate safely with other users to reunite items with their rightful owners.

### Key Features

- **Item Reporting System**: Easy-to-use forms for reporting both lost and found items with image upload
- **Visual Item Browse**: Browse items with images, live Lost/Found stats, search, and filters
- **Secure Communication**: Encrypted chat system for user safety
- **User Authentication**: Firebase-backed sign-up, login, and email verification
- **Inbox / Chat Management**: Centralised inbox to view and manage all active conversations
- **Account / Profile Tab**: View profile info, reported items count, and account settings
- **Dark Mode**: App-wide light/dark theme, toggled from the Account tab and remembered between launches
- **My Reported Items**: Manage your own reports — view details, mark as resolved, or delete
- **Privacy & Safety Settings**: Anonymous posting, password reset, account deletion, and safety guidelines
- **Help & Support**: Expandable FAQs plus one-tap Contact Support, Report a Problem, and Send Feedback
- **Location & Category Tagging**: Items are tagged with a campus location, a category, and the date lost/found
- **Push Notifications**: Stay updated on new items and messages
- **Real-time Updates**: Firebase-powered live data syncing
- **Icon-Based UI**: Consistent `lucide-react-native` iconography throughout — no emoji in the app UI

## 🏗️ App Architecture

The application follows three main user flows:

### 1. Sign Up & Onboarding Flow
- **SignUp Screen**: User registration with name, email, and password
- **Login Screen**: Existing user sign-in
- **Verification Screen**: 4-digit email verification code input
- **Welcome Screen**: App introduction and feature overview

> Firebase Auth state determines the initial route automatically:
> - Not signed in → Auth screens (SignUp / Login)
> - Signed in but email unverified → Verification screen
> - Signed in & verified → Full app

### 2. Main App (Bottom Tabs)
`MainTabs.js` hosts three tabs, each backed by a dedicated screen:
- **Browse** (`ListScreen`): Live Lost/Found stats, search, filter pills, and a floating **+ Report** button
- **Chats** (`InboxScreen`): Overview of all active chat conversations
- **You** (`ProfileScreen`): Account info, Dark mode toggle, and links to the account screens below

### 3. Lost & Found Reporting Flow
- **Details Screen**: Item information (status, category, location, date) and contact options. On your own report it shows **Mark as Resolved / Reopen** and **Delete Report** instead of chat
- **Report Item Screen**: Form to report lost or found items — name, description, category, location, date, and optional photo — with required-field validation
- **Confirmation Screen**: Report submission success confirmation with safety tips

### 4. Account & Safety Flow (from the You tab)
- **My Reported Items** (`MyReportedItems`): Live list of the signed-in user's reports showing image, name, description, date reported, and status (Open / Resolved). Includes a **Report Item** button, delete with confirmation, and loading / empty / error / success states
- **Privacy & Safety** (`PrivacyAndSafety`):
  - *Privacy*: "Show my name on reports" toggle (off = post as Anonymous), who can see your items, location & device permissions, how your data is used
  - *Safety*: Report a user or content, safety guidelines, account security (email verification status); blocked users is marked *Coming soon*
  - *Account & data*: Change password (Firebase reset email), request my data, delete account (password-confirmed)
- **Help & Support** (`HelpAndSupport`): Expandable FAQs, contact options that open a pre-filled support email, and safety information

### 5. Secure Communication Flow
- **Chat Screen**: Encrypted real-time messaging between users, launched from Browse or Chats

## 🛠️ Tools & Technologies Used

### Frontend Framework
- **React Native**: Cross-platform mobile development framework
- **Expo**: Development platform including image picker and push notifications

### Backend & Database
- **Firebase**: Authentication, real-time database, and cloud storage
- **firebase/auth**: `onIdTokenChanged` listener for live auth state management

### Navigation
- **@react-navigation/native**: Primary navigation library
- **@react-navigation/native-stack**: Stack-based navigation for auth and detail screens
- **@react-navigation/bottom-tabs**: Bottom tab navigation for the main app (Browse / Chats / You)

### Storage & Security
- **AsyncStorage**: Local persistent storage (`@react-native-async-storage/async-storage`) — login session, theme choice, and per-user privacy settings
- **CryptoJS**: Client-side message encryption

### Development Environment
- **JavaScript ES6+**: Modern JavaScript features and syntax
- **React Hooks**: `useState`, `useEffect` for state and lifecycle management
- **React Context**: `ThemeContext` provides the active light/dark palette app-wide
- **StyleSheet**: React Native's built-in styling system, built from the active theme

### Design & UI
- **Custom UI Components**: Handcrafted components for optimal user experience
- **lucide-react-native**: Consistent icon set used across every screen (no emoji in the UI)
- **Responsive Design**: Adaptive layouts for different screen sizes
- **expo-image-picker**: Native image selection for item reports

## 📱 Screenshots
The process is illustrated beginning on the left side of the diagram.
<div align="center" style="display: flex; justify-content: center; gap: 10px;">
<img src="./screens/screenshots/1.jpg" alt="SignUp Page" width="150px"/>
<img src="./screens/screenshots/2.jpg" alt="Verification Page" width="150px"/>
<img src="./screens/screenshots/3.jpg" alt="Welcome Page" width="150px"/>
<img src="./screens/screenshots/4.jpg" alt="Item List Page" width="150px"/>
<img src="./screens/screenshots/5.jpg" alt="Item Details Page " width="150px"/>
<img src="./screens/screenshots/6.jpg" alt="Chat Page" width="150px"/>
<img src="./screens/screenshots/7.jpg" alt="Confirmation Page" width="150px"/>
<img src="./screens/screenshots/8.jpg" alt="Report Item Page" width="150px"/>
<img src="./screens/screenshots/9.jpg" alt="Report Item Page" width="150px"/>
<img src="./screens/screenshots/10.jpg" alt="Report Item Page" width="150px"/>
<img src="./screens/screenshots/11.jpg" alt="Report Item Page" width="150px"/>
</div>


## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- Expo CLI
- Expo Go app on your mobile device
- A Firebase project (Authentication + Firestore/Realtime Database enabled)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/theodoreabbey173/CampusFinder.git
   cd CampusFinder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**  
   Create a `firebaseConfig.js` file in the project root and add your Firebase project credentials:
   ```js
   import { initializeApp } from 'firebase/app';
   import { getAuth } from 'firebase/auth';

   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   ```

4. **Set the support email**  
   Open `supportConfig.js` and replace `SUPPORT_EMAIL` with the inbox your team monitors. Help & Support and Privacy & Safety send emails there.
   ```js
   export const SUPPORT_EMAIL = 'your-support-inbox@example.com';
   ```

5. **Start the development server**
   ```bash
   npx expo start
   ```

6. **Run on device**
   - Scan the QR code with Expo Go app (Android)
   - Scan with Camera app (iOS)

## 📂 Project Structure

```
CampusFinder/
├── App.js                          # Theme provider, navigation setup & Firebase auth listener
├── firebaseConfig.js               # Firebase project configuration
├── cloudinaryConfig.js             # Cloudinary image-upload configuration
├── supportConfig.js                # Support email address
├── index.js                        # App entry point
├── assets/                         # App icons, splash screen, and images
├── backend/
│   ├── authService.js              # Sign up / login / verification / password reset / account deletion
│   ├── chatService.js              # Chat creation, messaging, subscriptions
│   ├── itemsService.js             # Item CRUD, per-user subscriptions, categories & status
│   ├── notificationService.js      # Push notification registration & badges
│   ├── settingsService.js          # Per-user privacy settings (AsyncStorage)
│   ├── storageService.js           # Cloudinary image uploads
│   └── supportService.js           # Opens pre-filled support emails
├── theme/
│   ├── colors.js                   # Light & dark colour palettes
│   └── ThemeContext.js             # ThemeProvider, useTheme, useThemedStyles
├── components/
│   ├── Accordion.js                # Expandable rows (FAQs, info panels)
│   ├── ScreenHeader.js             # Back button + title header
│   ├── SettingsList.js             # Section labels, rounded cards & rows
│   └── LucideIconExample.js        # Reference usage of lucide-react-native icons
├── screens/
│   ├── screenshots/                # App screenshots
│   ├── AuthScreen.js               # Log in / Sign up
│   ├── VerificationScreen.js       # Email verification
│   ├── WelcomeScreen.js            # App welcome & onboarding
│   ├── MainTabs.js                 # Bottom tab navigator (Browse / Chats / You)
│   ├── ListScreen.js               # Browse tab — item list, search, filters, + Report
│   ├── DetailsScreen.js            # Individual item details
│   ├── ReportItemScreen.js         # Report new items (with image picker)
│   ├── InboxScreen.js              # Chats tab — all active chat conversations
│   ├── ChatScreen.js               # Secure real-time messaging
│   ├── ProfileScreen.js            # You tab — account info, dark mode & settings links
│   ├── MyReportedItems.js          # Manage your own reports
│   ├── PrivacyAndSafety.js         # Privacy, safety & account settings
│   ├── HelpAndSupport.js           # FAQs, contact support & safety info
│   └── ConfirmationScreen.js       # Report submission success
├── firestore.rules                 # Firestore security rules
├── package.json
└── README.md
```

## 🌗 Theming (Light & Dark Mode)

Colours are centralised so every screen supports both themes:

- `theme/colors.js` defines `lightColors` and `darkColors` with the same token names (`background`, `surface`, `text`, `textMuted`, `border`, …).
- `ThemeProvider` (in `App.js`) loads the saved choice from AsyncStorage on launch and saves it whenever the Dark mode switch changes. It also themes React Navigation, the status bar, and native alerts.
- Screens build their styles from the active palette:

```js
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function MyScreen() {
  const { colors } = useTheme();              // for inline colours (icons, placeholders)
  const styles = useThemedStyles(createStyles);
  return <View style={styles.box} />;
}

const createStyles = (c) => StyleSheet.create({
  box: { backgroundColor: c.surface, borderColor: c.border },
});
```

New screens that follow this pattern support dark mode automatically.

## 🗂️ Item Data Model

Firestore `items` documents:

| Field | Description |
|---|---|
| `name`, `description`, `location` | Entered in the report form |
| `type` | `Lost` or `Found` |
| `category` | e.g. Electronics, Bags, Keys, ID & Cards (new) |
| `occurredAt` | Date the item was lost/found (new) |
| `status` | `Open` or `Resolved` (new) |
| `imageUrl` | Cloudinary URL or `null` |
| `reportedBy`, `reporterName` | Owner uid and display name (`Anonymous` if the user hides their name) |
| `createdAt` | Server timestamp |

Reports created before `category`, `occurredAt` and `status` existed still work: they are treated as `Open` and the missing fields are hidden.




## 🔐 Security Features

- **Firebase Authentication**: Secure email/password auth with email verification gate
- **Encrypted Communication**: Messages secured with CryptoJS before transmission
- **Privacy Protection**: User information is kept confidential; emails are never shown publicly
- **Anonymous Reporting**: Option to post new reports as "Anonymous"
- **Owner-only Changes**: Firestore rules let only the reporter edit or delete their item
- **Password Reset**: Firebase password-reset email from Privacy & Safety
- **Account Deletion**: Password-confirmed; removes the user's reports, profile, and login
- **Safe Meeting Guidelines**: In-app safety tips for user meetings
- **Report System**: Users can report inappropriate behaviour or content to support

## 🎯 Future Enhancements

- [ ] Push notifications for new matches
- [ ] Advanced search and filtering options
- [ ] User rating and feedback system
- [ ] Integration with university security
- [ ] Multi-language support
- [x] Dark mode theme
- [x] Manage my reported items (view, resolve, delete)
- [ ] Block users (UI placeholder in Privacy & Safety)
- [ ] Edit an existing report
- [ ] Edit profile name / photo
- [ ] Offline capability

## 🐛 Known Issues

- Images may take time to load on slower connections
- Chat requires active internet connection
- Some features optimised for Android (testing on iOS recommended)
- `firestore.rules` has no rule for the `users` collection; add one if your deployed rules block profile writes
- Deleting an account keeps chat history, because chats can't be deleted under the current rules
- Privacy settings are stored on the device, so they don't follow the user to another phone

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

If you encounter any issues or have questions:

- Create an issue on GitHub
- Contact the developer (details above)
- Check the documentation

---

*Built with ❤️ for the University of Ghana community by Theodore Gyaqueh Abbey*
