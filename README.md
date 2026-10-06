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
- **Confirmed Handover & Returns**: An item is marked as returned only after the other student confirms the handover in chat; returned items move to a "Returned" filter and the chat becomes read-only
- **User Authentication**: Firebase-backed sign-up, login, email verification by link, and "Forgot password?" reset emails
- **Verified-only Access**: Firestore rules only let users with a verified email read or write items, chats and messages
- **Inbox / Chat Management**: Centralised inbox to view and manage all active conversations
- **Account / Profile Tab**: View profile info, reported items count, and account settings
- **Dark Mode**: App-wide light/dark theme, toggled from the Account tab and remembered between launches
- **My Reported Items**: Manage your own reports — view details, see Open / Returned status, or delete
- **Privacy & Safety Settings**: Anonymous posting, password reset, account deletion, and safety guidelines
- **Help & Support**: Expandable FAQs plus one-tap Contact Support, Report a Problem, and Send Feedback
- **Location & Category Tagging**: Items are tagged with a campus location, a category, and the date lost/found
- **Message Notifications**: In-app toast for new messages while a chat is open, and a local notification when the app is in the background
- **Real-time Updates**: Firebase-powered live data syncing
- **Icon-Based UI**: Consistent `lucide-react-native` iconography throughout — no emoji in the app UI

## 🏗️ App Architecture

The application follows three main user flows:

### 1. Sign Up & Onboarding Flow
- **SignUp Screen**: User registration with name, email, and password; a verification link is emailed on sign-up
- **Login Screen**: Existing user sign-in, plus **Forgot password?** which emails a reset link to the address in the email field
- **Verification Screen**: Asks the user to click the link in their email, then tap **Verify & continue** (with a resend option)
- **Welcome Screen**: App introduction and feature overview

> Firebase Auth state determines the initial route automatically (`onIdTokenChanged` in `App.js`):
> - Not signed in → Auth screens (SignUp / Login)
> - Signed in but email unverified → Verification screen
> - Signed in & verified → Full app
>
> After the link is clicked, **Verify & continue** reloads the user and forces an ID-token refresh, so the
> `email_verified` claim the Firestore rules check is up to date and the app moves to the Welcome screen
> without a restart.

### 2. Main App (Bottom Tabs)
`MainTabs.js` hosts three tabs, each backed by a dedicated screen:
- **Browse** (`ListScreen`): Live Lost/Found stats, search, filter pills (All / Lost / Found show open items; **Returned** shows returned ones), and a floating **+ Report** button
- **Chats** (`InboxScreen`): Overview of all active chat conversations
- **You** (`ProfileScreen`): Account info, Dark mode toggle, and links to the account screens below

### 3. Lost & Found Reporting Flow
- **Details Screen**: Live item information (status, return date, category, location, date) and a **Start Secure Chat** button. On your own report it shows **Delete Report** and a hint on how to mark it returned. For a returned item, the other student can still **Open Chat** to read the history
- **Report Item Screen**: Form to report lost or found items — name, description, category, location, date, and optional photo — with required-field validation

### 4. Account & Safety Flow (from the You tab)
- **My Reported Items** (`MyReportedItems`): Live list of the signed-in user's reports showing image, name, description, date reported, and status (Open / Returned). Includes a **Report Item** button, delete with confirmation, and loading / empty / error / success states
- **Privacy & Safety** (`PrivacyAndSafety`):
  - *Privacy*: "Show my name on reports" toggle (off = post as Anonymous), who can see your items, location & device permissions, how your data is used
  - *Safety*: Report a user or content, safety guidelines, account security (email verification status); blocked users is marked *Coming soon*
  - *Account & data*: Change password (Firebase reset email), request my data, delete account (password-confirmed)
- **Help & Support** (`HelpAndSupport`): Expandable FAQs, contact options that open a pre-filled support email, and safety information

### 5. Secure Communication & Return Flow
- **Chat Screen**: Encrypted real-time messaging between users, launched from an item's details or from Chats. The header shows the other student's name and "About: {item name}"
- **Handover**: After meeting, the student who is *not* the reporter taps **Confirm handover** (once, can't be undone)
- **Return**: The reporter's **Mark as returned** button unlocks only after that confirmation. Marking it returned updates the item, shows a "Returned" banner, and makes the chat read-only
- **Confirmation Screen**: "Item returned" confirmation with what happens next and safety tips
- **Names**: New chats store both participants' names (display name, or the part of the email before the @). Older chats without a stored name show "Student"

## 🛠️ Tools & Technologies Used

### Frontend Framework
- **React Native**: Cross-platform mobile development framework
- **Expo**: Development platform including the image picker (`expo-image-picker`) and local notifications (`expo-notifications`)

### Backend & Database
- **Firebase Authentication**: Email/password accounts, verification links, and password-reset emails
- **Cloud Firestore**: Real-time data for users, items, chats and messages, protected by `firestore.rules`
- **Cloudinary**: Image hosting for item photos (unsigned upload preset)
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
- A Firebase project with **Email/Password** sign-in enabled and a **Cloud Firestore** database
- A Cloudinary account with an unsigned upload preset (for item photos)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/theodoreabbey173/CampusFinder-master.git
   cd CampusFinder-master
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**  
   Create a `firebaseConfig.js` file in the project root with your Firebase project credentials. It must export both `auth` and `db`, because the files in `backend/` import both:
   ```js
   import { initializeApp } from 'firebase/app';
   import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
   import { getFirestore } from 'firebase/firestore';
   import AsyncStorage from '@react-native-async-storage/async-storage';

   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };

   const app = initializeApp(firebaseConfig);
   const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
   const db = getFirestore(app);

   export { auth, db };
   export default app;
   ```

4. **Publish the Firestore security rules**  
   Copy the contents of `firestore.rules`, then in the Firebase console go to **Firestore Database → Rules**, paste over the existing rules, and click **Publish**. The app expects these rules: without them, sign-up profile writes and the handover/return flow will not behave as described.

5. **Configure Cloudinary**  
   Fill in `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` in `cloudinaryConfig.js`.

6. **Set the support email**  
   Open `supportConfig.js` and replace `SUPPORT_EMAIL` with the inbox your team monitors. Help & Support and Privacy & Safety send emails there.
   ```js
   export const SUPPORT_EMAIL = 'your-support-inbox@example.com';
   ```

7. **Start the development server**
   ```bash
   npx expo start
   ```

8. **Run on device**
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
│   ├── chatService.js              # Chat creation, encrypted messaging, handover confirmation, subscriptions
│   ├── itemsService.js             # Item CRUD, live subscriptions, categories, status & mark-as-returned
│   ├── notificationService.js      # Local chat-message notifications & badge
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
│   ├── ChatScreen.js               # Secure real-time messaging, handover & mark as returned
│   ├── ProfileScreen.js            # You tab — account info, dark mode & settings links
│   ├── MyReportedItems.js          # Manage your own reports
│   ├── PrivacyAndSafety.js         # Privacy, safety & account settings
│   ├── HelpAndSupport.js           # FAQs, contact support & safety info
│   └── ConfirmationScreen.js       # "Item returned" confirmation
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

## 🗂️ Data Model

### `users/{uid}`

Written at sign-up and updated when the email is verified. Each user can only read and write their own document.

| Field | Description |
|---|---|
| `uid` | Must equal the document id and the signed-in user's uid |
| `name`, `email` | From the sign-up form |
| `emailVerified` | Kept in sync for reference only — access control uses the ID token's `email_verified` claim |
| `createdAt` | Server timestamp |

### `items/{itemId}`

| Field | Description |
|---|---|
| `name`, `description`, `location` | Entered in the report form |
| `type` | `Lost` or `Found` |
| `category` | e.g. Electronics, Bags, Keys, ID & Cards |
| `occurredAt` | Date the item was lost/found |
| `status` | `open` or `returned` |
| `returnedAt`, `returnedTo`, `returnedChatId` | Set when the item is marked returned: time, uid of the other student, and the chat holding the handover confirmation |
| `imageUrl` | Cloudinary URL or `null` |
| `reportedBy`, `reporterName` | Owner uid and display name (`Anonymous` if the user hides their name) |
| `createdAt` | Server timestamp |

Older reports still work: a missing `status` or legacy `Open` counts as `open`, legacy `Resolved` counts as `returned`, and missing `category` / `occurredAt` are hidden.

### `chats/{chatId}`

| Field | Description |
|---|---|
| `participants` | The two uids in the conversation |
| `participantNames` | `{ uid: name }` for both participants |
| `reporterUid` | uid of the item's reporter |
| `itemId`, `itemName` | The item the chat is about |
| `lastMessage`, `lastMessageTime` | Encrypted preview and time of the latest message |
| `handover` | `{ confirmedBy, confirmedAt }` — set once by the non-reporter after the item changes hands |
| `createdAt` | Server timestamp |

Messages live in `chats/{chatId}/messages` with `text` (encrypted), `senderId`, `senderName` and `timestamp`. They cannot be edited or deleted.




## 🔐 Security Features

- **Firebase Authentication**: Secure email/password auth with an email verification gate in the app
- **Verification Enforced Server-side**: Firestore rules require a verified email (`email_verified` token claim) for every read and write on items, chats and messages
- **Private Profiles**: A user can only read and write their own `users` document; profiles cannot be deleted
- **Encrypted Communication**: Messages secured with CryptoJS before transmission
- **Privacy Protection**: User information is kept confidential; emails are never shown publicly
- **Anonymous Reporting**: Option to post new reports as "Anonymous"
- **Owner-only Changes**: Firestore rules let only the reporter edit or delete their item
- **Tamper-resistant Returns**: Rules only allow an item to become `returned` through a chat about that item where the other participant confirmed the handover; after that, the return fields are locked
- **Locked-down Chats**: Only the two participants can read a chat; updates are limited to the message preview and a one-time handover confirmation; chats and messages cannot be deleted
- **Password Reset**: Firebase password-reset email from the login screen ("Forgot password?") or Privacy & Safety, with a neutral message that doesn't reveal whether an account exists
- **Account Deletion**: Password-confirmed; removes the user's reports and login
- **Safe Meeting Guidelines**: In-app safety tips for user meetings
- **Report a User or Content**: Privacy & Safety opens a pre-filled email to the support inbox (there is no in-app moderation queue)

## 🎯 Future Enhancements

- [ ] Remote push notifications for new items and matches (today only local notifications for chat messages exist)
- [ ] Advanced search and filtering options
- [ ] User rating and feedback system
- [ ] Integration with university security
- [ ] Multi-language support
- [x] Dark mode theme
- [x] Manage my reported items (view, delete)
- [x] Confirmed handover before an item is marked returned
- [x] Forgot-password reset from the login screen
- [ ] Block users (UI placeholder in Privacy & Safety)
- [ ] Edit an existing report
- [ ] Edit profile name / photo
- [ ] Offline capability

## 🐛 Known Issues

- Images may take time to load on slower connections
- Chat requires active internet connection
- Some features optimised for Android (testing on iOS recommended)
- Deleting an account keeps chat history and the `users` profile document, because the rules don't allow deleting either
- Marking an item returned is final — there is no "reopen" option
- Chats created before participant names were stored show "Student" instead of a name
- Users who verified their email shortly before the verification rules were published may see permission errors until they log out and back in
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
