import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Search,
  X,
  MapPin,
  Clock,
  User,
  MessageCircle,
  SearchX,
  PackageOpen,
  Plus,
  CheckCircle2,
} from 'lucide-react-native';
import {
  subscribeToItems,
  getItemCounts,
  formatItemDate,
  isItemReturned,
  ITEMS_PAGE_SIZE,
} from '../backend/itemsService';
import { subscribeToUserChats } from '../backend/chatService';
import { auth } from '../firebaseConfig';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

// 'All', 'Lost' and 'Found' show open items only; 'Returned' shows the rest.
const FILTERS = ['All', 'Lost', 'Found', 'Returned'];
const RETURNED_COLOR = '#4CAF50';

const isNewItem = (createdAt) => {
  if (!createdAt) return false;
  const ts = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
  return Date.now() - ts.getTime() < 60 * 60 * 1000;
};

export default function ListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [items,       setItems]        = useState([]);
  const [hasMore,      setHasMore]      = useState(false);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [chatCount,    setChatCount]    = useState(0);
  const [serverCounts, setServerCounts] = useState(null);   // null → count loaded items
  const loadMoreRef                     = useRef(() => {});

  // Items arrive a page at a time; scrolling to the end loads the next page
  useEffect(() => {
    const feed = subscribeToItems(
      (next) => {
        setItems(next.items);
        setHasMore(next.hasMore);
        setLoadingMore(next.loadingMore);
        setLoading(false);
      },
      () => setLoading(false),
    );
    loadMoreRef.current = feed.loadMore;
    return feed.unsubscribe;
  }, []);

  const loadMore = useCallback(() => loadMoreRef.current(), []);

  // Totals come from server-side counts, since only some pages are loaded.
  // Refreshed whenever the tab gains focus (e.g. after reporting an item).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getItemCounts()
        .then((counts) => { if (active) setServerCounts(counts); })
        .catch((err) => console.warn('[ListScreen] Could not load item counts:', err?.message));
      return () => { active = false; };
    }, []),
  );

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const unsubscribe = subscribeToUserChats(
      currentUser.uid,
      (chats) => setChatCount(chats.length),
    );
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    if (serverCounts) return serverCounts;
    const open = items.filter((i) => !isItemReturned(i));
    return {
      total:    open.length,
      lost:     open.filter((i) => i.type === 'Lost').length,
      found:    open.filter((i) => i.type === 'Found').length,
      returned: items.length - open.length,
    };
  }, [items, serverCounts]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const returned = isItemReturned(item);
      const matchesFilter = activeFilter === 'Returned'
        ? returned
        : !returned && (activeFilter === 'All' || item.type === activeFilter);
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [items, activeFilter, searchQuery]);

  // Search and filters run on loaded pages only — keep loading pages while
  // fewer than a page of matches is showing, so results aren't missed.
  useEffect(() => {
    if (hasMore && !loadingMore && filteredItems.length < ITEMS_PAGE_SIZE) loadMore();
  }, [hasMore, loadingMore, filteredItems.length, loadMore]);

  const handleItemPress = (item) => navigation.navigate('ItemDetails', { item });

  const renderItem = ({ item }) => {
    const isLost      = item.type === 'Lost';
    const returned    = isItemReturned(item);
    const typeColor   = isLost ? '#FF5722' : '#16a97a';
    const accentColor = returned ? RETURNED_COLOR : typeColor;
    const tagBg       = isLost ? colors.tintLost : colors.tintGreen;

    return (
      <TouchableOpacity
        style={[styles.itemCard, { borderLeftColor: accentColor }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.85}
      >
        {!returned && isNewItem(item.createdAt) && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}

        <View style={styles.itemContent}>
          <Image
            source={
              item.imageUrl
                ? { uri: item.imageUrl }
                : { uri: 'https://via.placeholder.com/80x80/e8eaf6/9fa8da?text=?' }
            }
            style={styles.itemImage}
            resizeMode="cover"
          />

          <View style={styles.itemInfo}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              {returned ? (
                <View style={[styles.typeTag, { backgroundColor: colors.tintGreen }]}>
                  <CheckCircle2 size={11} color={RETURNED_COLOR} strokeWidth={2.6} />
                  <Text style={[styles.typeText, { color: RETURNED_COLOR }]}>Returned</Text>
                </View>
              ) : (
                <View style={[styles.typeTag, { backgroundColor: tagBg }]}>
                  <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
                  <Text style={[styles.typeText, { color: typeColor }]}>{item.type}</Text>
                </View>
              )}
            </View>

            {item.description ? (
              <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
            ) : null}

            <View style={styles.metaLine}>
              <MapPin size={12} color={colors.textSecondary} strokeWidth={2.4} />
              <Text style={styles.itemLocation}>{item.location}</Text>
            </View>
            <View style={styles.metaRow}>
              <Clock size={11} color={colors.textFaint} strokeWidth={2.4} />
              <Text style={styles.itemDate}>{formatItemDate(item.createdAt)}</Text>
              {item.reporterName ? (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <User size={11} color={colors.textFaint} strokeWidth={2.4} />
                  <Text style={styles.itemReporter}>{item.reporterName}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, styles.container]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading items…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.navLeft}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.navLogo}
            resizeMode="contain"
          />
          <Text>
            <Text style={styles.navCampus}>Campus</Text>
            <Text style={styles.navFinder}>Finder</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Chats')}
          style={styles.inboxBtn}
        >
          <MessageCircle size={20} color={colors.text} strokeWidth={2} />
          {chatCount > 0 && (
            <View style={styles.inboxBadge}>
              <Text style={styles.inboxBadgeText}>
                {chatCount > 9 ? '9+' : chatCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Page title ───────────────────────────────────────────────────── */}
      <View style={styles.pageTitle}>
        <Text style={styles.pageTitleText}>Lost & Found</Text>
        <Text style={styles.pageTitleSub}>Tap any item to see details and chat.</Text>
      </View>

      {/* ── Stats banner ─────────────────────────────────────────────────── */}
      <View style={styles.statsBanner}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#FF5722' }]}>{stats.lost}</Text>
          <Text style={styles.statLabel}>Lost</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#16a97a' }]}>{stats.found}</Text>
          <Text style={styles.statLabel}>Found</Text>
        </View>
      </View>

      {/* ── Search bar ───────────────────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <Search size={16} color={colors.textMuted} strokeWidth={2.2} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or location..."
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <X size={14} color={colors.textMuted} strokeWidth={2.4} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter tabs ──────────────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f;
          const count = {
            All:      stats.total,
            Lost:     stats.lost,
            Found:    stats.found,
            Returned: stats.returned,
          }[f];
          const tabColor = {
            Lost:     '#FF5722',
            Found:    '#16a97a',
            Returned: RETURNED_COLOR,
          }[f] ?? colors.primaryBtn;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterTab,
                isActive
                  ? { backgroundColor: tabColor, borderColor: tabColor }
                  : { borderColor: colors.border },
              ]}
              onPress={() => setActiveFilter(f)}
            >
              <Text
                style={[styles.filterTabText, isActive && { color: '#fff' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {f} · {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List / empty state ───────────────────────────────────────────── */}
      <View style={{ flex: 1 }}>
        {filteredItems.length === 0 && (hasMore || loadingMore) ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.centered}>
            {searchQuery
              ? <SearchX size={56} color={colors.emptyIcon} strokeWidth={1.6} style={styles.emptyIcon} />
              : <PackageOpen size={56} color={colors.emptyIcon} strokeWidth={1.6} style={styles.emptyIcon} />
            }
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? 'No results found'
                : activeFilter === 'Returned' ? 'No returned items yet' : 'No items yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `Nothing matched "${searchQuery}". Try a different keyword.`
                : activeFilter === 'Returned'
                  ? 'Items appear here once both students confirm the handover.'
                  : 'Be the first to report a lost or found item on campus!'}
            </Text>
            {searchQuery ? (
              <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearchBtnText}>Clear Search</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? <ActivityIndicator style={styles.listFooter} color="#2196F3" /> : null
            }
          />
        )}
      </View>

      {/* ── Floating report button ──────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.reportFab}
        onPress={() => navigation.navigate('ReportItem')}
        activeOpacity={0.9}
      >
        <Plus size={18} color="#fff" strokeWidth={2.6} />
        <Text style={styles.reportFabText}>Report</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },

  // ── Loading / empty ───────────────────────────────────────────────────────
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
  },
  clearSearchBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2196F3',
    borderRadius: 20,
  },
  clearSearchBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // ── Top bar ───────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  navLogo: {
    height: 40,
    width: 35,
    borderRadius: 6,
  },
  navCampus: {
    fontSize: 22,
    fontWeight: '800',
    color: c.brandText,
  },
  navFinder: {
    fontSize: 22,
    fontWeight: '800',
    color: '#16a97a',
  },

  // ── Nav inbox button ──────────────────────────────────────────────────────
  inboxBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inboxBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#E53935',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  inboxBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },

  // ── Page title ────────────────────────────────────────────────────────────
  pageTitle: {
    backgroundColor: c.background,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  pageTitleText: {
    fontSize: 26,
    fontWeight: '800',
    color: c.text,
    letterSpacing: 0.2,
  },
  pageTitleSub: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: 3,
  },

  // ── Stats banner ──────────────────────────────────────────────────────────
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    marginHorizontal: 16,
    marginTop: 1,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: c.text,
  },
  statLabel: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: c.divider,
    marginVertical: 4,
  },

  // ── Search bar ────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: c.text,
    paddingVertical: 10,
  },
  clearBtn: {
    padding: 4,
  },

  // ── Filter tabs ───────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    backgroundColor: c.surface,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textSecondary,
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContainer: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  listFooter: {
    paddingVertical: 16,
  },

  // ── Item card ─────────────────────────────────────────────────────────────
  itemCard: {
    backgroundColor: c.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'visible',
  },
  newBadge: {
    position: 'absolute',
    top: -6,
    right: 12,
    backgroundColor: '#FF6D00',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 10,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: c.surfaceAlt,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: c.text,
    flex: 1,
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
  itemDesc: {
    fontSize: 13,
    color: c.textMuted,
    marginBottom: 5,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  itemLocation: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  itemDate: {
    fontSize: 12,
    color: c.textFaint,
  },
  metaDot: {
    fontSize: 12,
    color: c.textFaint,
    marginHorizontal: 2,
  },
  itemReporter: {
    fontSize: 12,
    color: c.textFaint,
  },

  // ── Floating report button ──────────────────────────────────────────────────
  reportFab: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1B3A8A',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 26,
    shadowColor: '#1B3A8A',
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
