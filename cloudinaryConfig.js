// Values come from .env — see .env.example.
// An unsigned preset is visible to anyone with the app, so restrict it in the
// Cloudinary dashboard (allowed formats, max file size, fixed folder).

// Your Cloudinary cloud name (shown on the dashboard)
export const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

// The name of your unsigned upload preset
export const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
