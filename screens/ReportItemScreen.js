import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  X,
  FileText,
  CalendarDays,
} from 'lucide-react-native';
import { auth } from '../firebaseConfig';
import {
  createItem,
  formatCalendarDate,
  ITEM_CATEGORIES,
  ITEM_STATUS,
} from '../backend/itemsService';
import { uploadImage } from '../backend/storageService';
import { getPrivacySettings } from '../backend/settingsService';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

const DAY_MS = 86_400_000;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function ReportItemScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Where to go after a successful report (e.g. 'MyReportedItems'); defaults to the Browse list
  const returnTo = route.params?.returnTo;

  const [itemName,    setItemName]    = useState('');
  const [description, setDescription] = useState('');
  const [location,    setLocation]    = useState('');
  const [category,    setCategory]    = useState(null);
  const [occurredAt,  setOccurredAt]  = useState(() => startOfDay(new Date()));
  const [reportType,  setReportType]  = useState('Found');
  const [imageUri,    setImageUri]    = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [errors,      setErrors]      = useState({});

  const today       = startOfDay(new Date());
  const isToday     = occurredAt.getTime() === today.getTime();
  const isYesterday = occurredAt.getTime() === today.getTime() - DAY_MS;

  const shiftDate = (days) => {
    const next = new Date(occurredAt.getTime() + days * DAY_MS);
    if (next > today) return; // can't report something lost/found in the future
    setOccurredAt(startOfDay(next));
  };

  const clearError = (field) => setErrors((prev) => ({ ...prev, [field]: undefined }));

  // ── Image picker — Gallery ────────────────────────────────────────────────

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        "Please allow access to your photos so you can attach an image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ── Image picker — Camera ─────────────────────────────────────────────────

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Camera Permission Required',
        "Please allow access to your camera so you can take a photo.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────────

  const validate = () => {
    const next = {};
    if (!itemName.trim())    next.itemName    = 'Please enter the item name.';
    if (!description.trim()) next.description = 'Please describe the item.';
    if (!location.trim())    next.location    = 'Please say where it was lost or found.';
    if (!category)           next.category    = 'Please choose a category.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Missing details', 'Please fill in all required fields.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be signed in to report an item.');
      return;
    }

    setSubmitting(true);
    try {
      // Respect the "Show my name on reports" privacy setting
      const { showNameOnReports } = await getPrivacySettings(user.uid);

      // 1. Upload image to Cloudinary (if one was selected)
      let imageUrl = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }

      // 2. Save item document to Firestore `items` collection
      const name = itemName.trim();
      await createItem({
        name,
        description:  description.trim(),
        location:     location.trim(),
        type:         reportType,
        category,
        occurredAt,
        status:       ITEM_STATUS.OPEN,
        imageUrl,
        reportedBy:   user.uid,
        reporterName: showNameOnReports ? (user.displayName ?? 'Anonymous') : 'Anonymous',
      });

      if (returnTo) {
        // Back to the screen we came from, which shows its own success banner
        navigation.navigate(returnTo, { justReported: name });
        return;
      }

      Alert.alert(
        'Report Submitted!',
        `Your ${reportType.toLowerCase()} item report has been saved.`,
        [{ text: 'OK', onPress: () => navigation.navigate('ItemList') }],
      );
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Failed to submit the report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Report an Item" navigation={navigation} />

      <KeyboardAvoidingView
        style={styles.scrollArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>
        Help others by reporting lost or found items on campus
      </Text>

      {/* Report type toggle */}
      <View style={styles.typeSelector}>
        <Text style={styles.label}>Report Type</Text>
        <View style={styles.typeButtons}>
          {['Lost', 'Found'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, reportType === type && styles.activeTypeButton]}
              onPress={() => setReportType(type)}
              disabled={submitting}
            >
              <Text style={[styles.typeButtonText, reportType === type && styles.activeTypeButtonText]}>
                {type} Item
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Item Name *</Text>
        <TextInput
          style={[styles.input, errors.itemName && styles.inputError]}
          placeholder="e.g., Blue Backpack, iPhone, Textbook"
          placeholderTextColor={colors.placeholder}
          value={itemName}
          onChangeText={(t) => { setItemName(t); clearError('itemName'); }}
          editable={!submitting}
          maxLength={80}
        />
        {errors.itemName ? <Text style={styles.errorText}>{errors.itemName}</Text> : null}

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea, errors.description && styles.inputError]}
          placeholder="Provide details (colour, brand, distinguishing features…)"
          placeholderTextColor={colors.placeholder}
          value={description}
          onChangeText={(t) => { setDescription(t); clearError('description'); }}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!submitting}
          maxLength={500}
        />
        {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}

        {/* Category */}
        <Text style={styles.label}>Category *</Text>
        <View style={styles.chipWrap}>
          {ITEM_CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => { setCategory(cat); clearError('category'); }}
                disabled={submitting}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.category ? <Text style={[styles.errorText, { marginTop: -10 }]}>{errors.category}</Text> : null}

        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={[styles.input, errors.location && styles.inputError]}
          placeholder="Where was the item lost / found?"
          placeholderTextColor={colors.placeholder}
          value={location}
          onChangeText={(t) => { setLocation(t); clearError('location'); }}
          editable={!submitting}
          maxLength={120}
        />
        {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}

        {/* Date */}
        <Text style={styles.label}>Date {reportType === 'Lost' ? 'Lost' : 'Found'} *</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateArrow}
            onPress={() => shiftDate(-1)}
            disabled={submitting}
            accessibilityLabel="Previous day"
          >
            <ChevronLeft size={18} color={colors.text} strokeWidth={2.4} />
          </TouchableOpacity>
          <View style={styles.dateValue}>
            <CalendarDays size={16} color={colors.textSecondary} strokeWidth={2.2} />
            <Text style={styles.dateText}>
              {isToday ? 'Today' : isYesterday ? 'Yesterday' : formatCalendarDate(occurredAt)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
            onPress={() => shiftDate(1)}
            disabled={submitting || isToday}
            accessibilityLabel="Next day"
          >
            <ChevronRight size={18} color={colors.text} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* Image picker */}
        <Text style={styles.label}>Add an Image (Optional)</Text>
        {!imageUri ? (
          <View style={styles.imageButtonRow}>
            {/* Take photo with camera */}
            <TouchableOpacity
              style={[styles.imageOptionButton, styles.cameraButton]}
              onPress={takePhoto}
              disabled={submitting}
            >
              <Camera size={28} color="#FF9800" strokeWidth={2} style={styles.imageOptionIcon} />
              <Text style={styles.imageOptionTitle}>Take Photo</Text>
              <Text style={styles.imageOptionSub}>Use camera</Text>
            </TouchableOpacity>

            {/* Choose from gallery */}
            <TouchableOpacity
              style={[styles.imageOptionButton, styles.galleryButton]}
              onPress={pickImage}
              disabled={submitting}
            >
              <ImageIcon size={28} color="#2196F3" strokeWidth={2} style={styles.imageOptionIcon} />
              <Text style={styles.imageOptionTitle}>Choose Photo</Text>
              <Text style={styles.imageOptionSub}>From gallery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            {/* Overlay action buttons on the preview */}
            <View style={styles.imageActions}>
              <TouchableOpacity
                style={[styles.imageActionBtn, { backgroundColor: 'rgba(33,150,243,0.85)' }]}
                onPress={takePhoto}
                disabled={submitting}
              >
                <Camera size={13} color="#fff" strokeWidth={2.4} />
                <Text style={styles.imageActionText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imageActionBtn, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
                onPress={pickImage}
                disabled={submitting}
              >
                <ImageIcon size={13} color="#fff" strokeWidth={2.4} />
                <Text style={styles.imageActionText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imageActionBtn, { backgroundColor: 'rgba(229,57,53,0.85)' }]}
                onPress={() => setImageUri(null)}
                disabled={submitting}
              >
                <X size={13} color="#fff" strokeWidth={2.6} />
                <Text style={styles.imageActionText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.noteSection}>
          <View style={styles.noteTitleRow}>
            <FileText size={16} color={colors.text} strokeWidth={2.2} />
            <Text style={styles.noteTitle}>Important Notes:</Text>
          </View>
          <Text style={styles.noteText}>• Be as specific as possible with your description</Text>
          <Text style={styles.noteText}>• Include any unique identifying features</Text>
          <Text style={styles.noteText}>• All communication will be handled securely</Text>
          <Text style={styles.noteText}>• False reports may result in account suspension</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <View style={styles.submitLoading}>
              <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.submitButtonText}>
                {imageUri ? 'Uploading image…' : 'Saving report…'}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.surface,
  },
  scrollArea: {
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 30,
    color: c.textSecondary,
    paddingHorizontal: 20,
  },
  typeSelector: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 10,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center',
  },
  activeTypeButton: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.textSecondary,
  },
  activeTypeButtonText: {
    color: '#fff',
  },
  formSection: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: c.input,
    color: c.text,
  },
  inputError: {
    borderColor: c.danger,
    marginBottom: 6,
  },
  errorText: {
    color: c.danger,
    fontSize: 13,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
  },

  // ── Category chips ────────────────────────────────────────────────────────
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.input,
  },
  chipActive: {
    borderColor: '#2196F3',
    backgroundColor: '#2196F3',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },

  // ── Date stepper ──────────────────────────────────────────────────────────
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    backgroundColor: c.input,
    padding: 6,
    marginBottom: 20,
  },
  dateArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateArrowDisabled: {
    opacity: 0.35,
  },
  dateValue: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
  },

  // ── Image option buttons (camera / gallery) ───────────────────────────────
  imageButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  imageOptionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  cameraButton: {
    backgroundColor: c.tintOrange,
    borderColor: '#FF9800',
  },
  galleryButton: {
    backgroundColor: c.tintBlue,
    borderColor: '#2196F3',
  },
  imageOptionIcon: {
    marginBottom: 6,
  },
  imageOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text,
  },
  imageOptionSub: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },

  // ── Image preview ─────────────────────────────────────────────────────────
  imagePreviewContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 210,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  imageActions: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  imageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  imageActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  noteSection: {
    backgroundColor: c.infoBox,
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text,
  },
  noteText: {
    fontSize: 14,
    color: c.textSecondary,
    marginBottom: 5,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 40,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
