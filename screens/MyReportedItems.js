import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Trash2,
  MapPin,
  CalendarDays,
  PackageOpen,
  AlertTriangle,
  CheckCircle2,
  ImageOff,
  Tag,
} from 'lucide-react-native';
import { auth } from '../firebaseConfig';
import {
  subscribeToUserItems,
  deleteItem,
  formatCalendarDate,
  getItemStatus,
  ITEM_STATUS,
  ITEM_STATUS_LABELS,
} from '../backend/itemsService';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function MyReportedItems({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const currentUser = auth.currentUser;

  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [retryKey,   setRetryKey]   = useState(0);
  const [banner,     setBanner]     = useState(null);

  const bannerOpacity = useRef(new Animated.Value(0)).current;

  // ── Live list of this user's reports ────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      setError('You need to be signed in to see your reports.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToUserItems(
      currentUser.uid,
      (fetched) => {
        setItems(fetched);
        setLoading(false);
      },
      (err) => {
        console.error('My items error:', err);
        setError('Could not load your reports. Check your connection and try again.');
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [retryKey]);

  // ── Success banner (after reporting / deleting) ─────────────────────────────
  const showBanner = (text) => {
    setBanner(text);
    bannerOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(bannerOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setBanner(null));
  };

  // ReportItemScreen navigates back here with { justReported: <item name> }
  useEffect(() => {
    const name = route.params?.justReported;
    if (!name) return;
    showBanner(`"${name}" was reported successfully.`);
    navigation.setParams({ justReported: undefined });
  }, [route.params?.justReported]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleReport = () => navigation.navigate('ReportItem', { returnTo: 'MyReportedItems' });

  const handleOpen = (item) => navigation.navigate('ItemDetails', { item });

  const confirmDelete = (item) => {
    Alert.alert(
      'Delete report',
      'Are you sure you want to delete this reported item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item) },
      ],
    );
  };

  const handleDelete = async (item) => {
    setDeletingId(item.id);
    try {
      await deleteItem(item.id);
      // Remove immediately; the live listener will confirm.
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showBanner(`"${item.name}" was deleted.`);
    } catch (err) {
      console.error('Delete error:', err);
      Alert.alert('Delete failed', 'Could not delete this report. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render one report ───────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const isLost      = item.type === 'Lost';
    const accentColor = isLost ? colors.lost : colors.green;
    const tagBg       = isLost ? colors.tintLost : colors.tintGreen;
    const status      = getItemStatus(item);
    const returned    = status === ITEM_STATUS.RETURNED;
    const isDeleting  = deletingId === item.id;

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: accentColor }, isDeleting && styles.cardDeleting]}
        onPress={() => handleOpen(item)}
        activeOpacity={0.85}
        disabled={isDeleting}
      >
        <View style={styles.cardRow}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <ImageOff size={22} color={colors.emptyIcon} strokeWidth={1.8} />
            </View>
          )}

          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <View style={[styles.typeTag, { backgroundColor: tagBg }]}>
                <View style={[styles.typeDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.typeText, { color: accentColor }]}>{item.type}</Text>
              </View>
            </View>

            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            ) : null}

            <View style={styles.metaRow}>
              <CalendarDays size={12} color={colors.textMuted} strokeWidth={2.2} />
              <Text style={styles.metaText}>Reported {formatCalendarDate(item.createdAt ?? new Date())}</Text>
            </View>
            {item.location ? (
              <View style={styles.metaRow}>
                <MapPin size={12} color={colors.textMuted} strokeWidth={2.2} />
                <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : null}
            {item.category ? (
              <View style={styles.metaRow}>
                <Tag size={12} color={colors.textMuted} strokeWidth={2.2} />
                <Text style={styles.metaText} numberOfLines={1}>{item.category}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: returned ? colors.tintGreen : colors.tintOrange },
            ]}
          >
            <Text style={[styles.statusText, { color: returned ? colors.green : colors.orange }]}>
              {ITEM_STATUS_LABELS[status]}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => confirmDelete(item)}
            disabled={isDeleting}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <Trash2 size={14} color={colors.danger} strokeWidth={2.2} />
                <Text style={styles.deleteText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Body by state ───────────────────────────────────────────────────────────
  let body;
  if (loading) {
    body = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.blue} />
        <Text style={styles.loadingText}>Loading your reports…</Text>
      </View>
    );
  } else if (error) {
    body = (
      <View style={styles.centered}>
        <AlertTriangle size={48} color={colors.emptyIcon} strokeWidth={1.6} style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.emptySubtitle}>{error}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setRetryKey((k) => k + 1)}>
          <Text style={styles.primaryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (items.length === 0) {
    body = (
      <View style={styles.centered}>
        <PackageOpen size={56} color={colors.emptyIcon} strokeWidth={1.6} style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>No reports yet</Text>
        <Text style={styles.emptySubtitle}>
          You haven't reported any items yet. Lost something or found something on campus?
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleReport}>
          <Plus size={16} color="#fff" strokeWidth={2.6} />
          <Text style={styles.primaryBtnText}>Report an Item</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <Text style={styles.countText}>
            {items.length} report{items.length === 1 ? '' : 's'} · tap one to see details
          </Text>
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="My Reported Items" navigation={navigation} />

      <View style={{ flex: 1 }}>
        {body}

        {banner ? (
          <Animated.View style={[styles.banner, { opacity: bannerOpacity }]} pointerEvents="none">
            <CheckCircle2 size={16} color="#fff" strokeWidth={2.4} />
            <Text style={styles.bannerText} numberOfLines={2}>{banner}</Text>
          </Animated.View>
        ) : null}
      </View>

      {/* Same floating button as the Browse screen */}
      {!loading && !error && items.length > 0 ? (
        <TouchableOpacity style={styles.reportFab} onPress={handleReport} activeOpacity={0.9}>
          <Plus size={18} color="#fff" strokeWidth={2.6} />
          <Text style={styles.reportFabText}>Report Item</Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  // ── Loading / empty / error ───────────────────────────────────────────────
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: c.textSecondary,
    fontSize: 16,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.primaryBtn,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100, // room for the floating button
  },
  countText: {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: 12,
    marginLeft: 4,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: c.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardDeleting: {
    opacity: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: c.surfaceAlt,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: c.text,
    marginRight: 8,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  typeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    color: c.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 12,
    color: c.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.divider,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 60,
    justifyContent: 'flex-end',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.danger,
  },

  // ── Success banner ────────────────────────────────────────────────────────
  banner: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.green,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  bannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Floating report button (matches ListScreen) ───────────────────────────
  reportFab: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.primaryBtn,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 26,
    shadowColor: c.primaryBtn,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  reportFabText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
