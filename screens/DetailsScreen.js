import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  MapPin,
  Clock,
  User,
  MessageCircle,
  Tag,
  CalendarDays,
  CircleDot,
  CheckCircle2,
  Trash2,
  ImageOff,
} from 'lucide-react-native';
import { auth } from '../firebaseConfig';
import {
  formatItemDate,
  formatCalendarDate,
  getItemStatus,
  isItemReturned,
  subscribeToItem,
  deleteItem,
  ITEM_STATUS_LABELS,
} from '../backend/itemsService';
import { findChatForItem } from '../backend/chatService';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

export default function DetailsScreen({ navigation, route }) {
  const { item: initialItem } = route.params;
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Keep the item (and its status) live; fall back to the passed-in copy.
  const [item,     setItem]     = useState(initialItem);
  const [deleting, setDeleting] = useState(false);
  // For returned items: chat the viewer already has about this item.
  // undefined = not looked up yet, null = none.
  const [existingChatId, setExistingChatId] = useState(undefined);

  const isOwner  = !!auth.currentUser && item.reportedBy === auth.currentUser.uid;
  const returned = isItemReturned(item);
  const status   = ITEM_STATUS_LABELS[getItemStatus(item)];
  const busy     = deleting;

  useEffect(() => {
    if (!initialItem.id) return;
    const unsubscribe = subscribeToItem(initialItem.id, (fresh) => {
      if (fresh) setItem(fresh);
    });
    return unsubscribe;
  }, [initialItem.id]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!returned || isOwner || !uid || !item.id) return;
    let cancelled = false;
    findChatForItem(uid, item.id)
      .then((id) => { if (!cancelled) setExistingChatId(id); })
      .catch((err) => {
        console.error('Find chat error:', err);
        if (!cancelled) setExistingChatId(null);
      });
    return () => { cancelled = true; };
  }, [returned, isOwner, item.id]);

  const handleStartChat = () => {
    navigation.navigate('Chat', { item });
  };

  const handleOpenExistingChat = () => {
    navigation.navigate('Chat', {
      item,
      existingChatId,
      otherUserId:   item.reportedBy,
      otherUserName: item.reporterName,
    });
  };

  // ── Owner actions ───────────────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      'Delete report',
      'Are you sure you want to delete this reported item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteItem(item.id);
              navigation.goBack();
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Delete failed', 'Could not delete this report. Please try again.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const isFound = item.type === 'Found';
  const typeColor = isFound ? '#16a97a' : '#FF5722';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.canGoBack() && navigation.goBack()}
              activeOpacity={0.7}
            >
              <ChevronLeft size={22} color={colors.text} strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Item Details</Text>
          </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Item Image */}
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.itemImage, styles.imagePlaceholder]}>
              <ImageOff size={40} color={colors.emptyIcon} strokeWidth={1.6} />
              <Text style={styles.imagePlaceholderText}>No image</Text>
            </View>
          )}
          <View style={[styles.statusPill, { backgroundColor: typeColor }]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>{item.type}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.itemName}>{item.name}</Text>

          {/* Details rows */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.valueRow}>
                {returned
                  ? <CheckCircle2 size={14} color={colors.green} strokeWidth={2.2} />
                  : <CircleDot size={14} color={colors.orange} strokeWidth={2.2} />}
                <Text style={[styles.value, { color: returned ? colors.green : colors.orange }]}>{status}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            {returned && item.returnedAt ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Returned on</Text>
                  <View style={styles.valueRow}>
                    <CalendarDays size={14} color={colors.text} strokeWidth={2.2} />
                    <Text style={styles.value}>{formatCalendarDate(item.returnedAt)}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            ) : null}

            {item.category ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Category</Text>
                  <View style={styles.valueRow}>
                    <Tag size={14} color={colors.text} strokeWidth={2.2} />
                    <Text style={styles.value}>{item.category}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            ) : null}

            <View style={styles.infoRow}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.valueRow}>
                <MapPin size={14} color={colors.text} strokeWidth={2.2} />
                <Text style={styles.value}>{item.location}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            {item.occurredAt ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Date {isFound ? 'found' : 'lost'}</Text>
                  <View style={styles.valueRow}>
                    <CalendarDays size={14} color={colors.text} strokeWidth={2.2} />
                    <Text style={styles.value}>{formatCalendarDate(item.occurredAt)}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            ) : null}

            <View style={styles.infoRow}>
              <Text style={styles.label}>Reported</Text>
              <View style={styles.valueRow}>
                <Clock size={14} color={colors.text} strokeWidth={2.2} />
                <Text style={styles.value}>{formatItemDate(item.createdAt)}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.label}>Reported by</Text>
              <View style={styles.valueRow}>
                <User size={14} color={colors.text} strokeWidth={2.2} />
                <Text style={styles.value}>{isOwner ? 'You' : (item.reporterName ?? 'Anonymous')}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {item.description || 'No description provided.'}
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {isOwner ? (
            <>
              {!returned ? (
                <Text style={styles.ownerHint}>
                  To mark this item as returned, open the chat with the other student once they
                  have confirmed the handover.
                </Text>
              ) : null}

              <TouchableOpacity
                style={[styles.deleteButton, busy && styles.buttonDisabled]}
                onPress={handleDelete}
                disabled={busy}
              >
                {deleting ? (
                  <ActivityIndicator color={colors.danger} />
                ) : (
                  <>
                    <Trash2 size={17} color={colors.danger} strokeWidth={2.2} />
                    <Text style={styles.deleteButtonText}>Delete Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : !returned ? (
            <TouchableOpacity style={styles.chatButton} onPress={handleStartChat}>
              <MessageCircle size={18} color="#fff" strokeWidth={2.2} />
              <Text style={styles.chatButtonText}>Start Secure Chat</Text>
            </TouchableOpacity>
          ) : existingChatId ? (
            <TouchableOpacity style={styles.chatButton} onPress={handleOpenExistingChat}>
              <MessageCircle size={18} color="#fff" strokeWidth={2.2} />
              <Text style={styles.chatButtonText}>Open Chat</Text>
            </TouchableOpacity>
          ) : existingChatId === null ? (
            <Text style={styles.ownerHint}>This item has already been returned to its owner.</Text>
          ) : (
            <ActivityIndicator color={colors.green} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.surface,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backButton: {
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: c.surfaceAlt,
    justifyContent:  'center',
    alignItems:      'center',
    marginRight:      12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: c.text,
  },

  // ── Image ────────────────────────────────────────────────────────────────
  imageContainer: {
    alignItems: 'center',
    backgroundColor: c.surfaceAlt,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 220,
    backgroundColor: c.surfaceAlt,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: c.textMuted,
    fontSize: 13,
  },
  statusPill: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  content: {
    paddingHorizontal: 20,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: c.text,
    marginTop: 20,
    marginBottom: 20,
  },

  infoSection: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: c.divider,
  },
  label: {
    fontSize: 15,
    color: c.textMuted,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    marginLeft: 12,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: c.text,
    flexShrink: 1,
  },

  descriptionSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: c.textSecondary,
    lineHeight: 22,
  },

  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  chatButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a97a',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#16a97a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  ownerHint: {
    fontSize: 13,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: c.danger,
    backgroundColor: c.surface,
  },
  deleteButtonText: {
    color: c.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
