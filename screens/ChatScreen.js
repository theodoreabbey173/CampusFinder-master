import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ChevronLeft,
  ArrowLeft,
  MessageCircle,
  Lock,
  AlertTriangle,
  Hand,
  Send,
  CheckCircle2,
  Handshake,
  PackageCheck,
} from 'lucide-react-native';
import { auth } from '../firebaseConfig';
import { getDisplayName } from '../backend/authService';
import {
  createOrGetChat,
  sendMessage,
  subscribeToMessages,
  subscribeToChat,
  confirmHandover,
  formatMessageTime,
} from '../backend/chatService';
import {
  subscribeToItem,
  markItemReturned,
  isItemReturned,
} from '../backend/itemsService';
import { setActiveChat, clearBadge } from '../backend/notificationService';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

// ─── In-app toast component ───────────────────────────────────────────────────
// Slides down from the top when a new message arrives while this screen
// is in the foreground.

const MessageToast = ({ senderName, messageText, visible }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const translateY = useRef(new Animated.Value(-90)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue:        0,
        useNativeDriver: true,
        tension:         60,
        friction:         8,
      }),
      Animated.timing(opacity, {
        toValue:         1,
        duration:        200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 3 s
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue:         -90,
          duration:        300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue:         0,
          duration:        300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 3000);

    return () => clearTimeout(timer);
  }, [visible, senderName, messageText]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { transform: [{ translateY }], opacity },
      ]}
      pointerEvents="none"
    >
      <View style={styles.toastIcon}>
        <MessageCircle size={18} color="#fff" strokeWidth={2.2} />
      </View>
      <View style={styles.toastBody}>
        <Text style={styles.toastSender} numberOfLines={1}>{senderName}</Text>
        <Text style={styles.toastMessage} numberOfLines={1}>{messageText}</Text>
      </View>
    </Animated.View>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChatScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { item }      = route.params;
  const currentUser   = auth.currentUser;

  const myName = getDisplayName(currentUser);

  // Older chats may lack participantNames — fall back to the item's reporter
  // name when the other person is the reporter, otherwise "Student".
  const otherIsReporter = (route.params?.otherUserId ?? item.reportedBy) === item.reportedBy;
  const otherPersonName =
    route.params?.otherUserName?.trim() ||
    (otherIsReporter && item.reporterName?.trim()) ||
    'Student';
  const otherInitials   = otherPersonName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

  const [chatId,     setChatId]     = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [message,    setMessage]    = useState('');
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [initError,  setInitError]  = useState(null);

  // Live chat document (reporterUid, handover) and live item (status).
  // undefined = still loading, null = does not exist (e.g. item deleted).
  const [chatDoc,    setChatDoc]    = useState(undefined);
  const [liveItem,   setLiveItem]   = useState(undefined);
  const [actionBusy, setActionBusy] = useState(false);
  const actionLockRef               = useRef(false);   // guards against double taps

  // Toast state
  const [toast,      setToast]      = useState({ visible: false, sender: '', text: '' });
  const toastKey                    = useRef(0);           // forces re-trigger on each new msg

  // Refs for notification logic
  const appStateRef        = useRef(AppState.currentState);
  const isInitialLoad      = useRef(true);
  const prevMessageCount   = useRef(0);
  const scrollRef          = useRef(null);

  // ── Notification setup ──────────────────────────────────────────────────────
  // Pushes are sent by the notifyOnNewMessage Cloud Function. While this chat
  // is open its pushes are not shown as banners — the toast below covers it.

  useEffect(() => {
    clearBadge();

    // Track app foreground/background state
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active') clearBadge();
    });

    return () => appStateSub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!chatId) return;
      setActiveChat(chatId);
      return () => setActiveChat(null);
    }, [chatId]),
  );

  // ── Init chat ───────────────────────────────────────────────────────────────
  // `retryKey` drives re-runs when the user taps "Try Again".
  // `existingChatId` is passed when navigating from the Inbox — skips
  //  createOrGetChat and the self-chat guard entirely.

  const [retryKey, setRetryKey] = useState(0);

  // Params passed from InboxScreen (optional)
  const existingChatId  = route.params?.existingChatId  ?? null;
  const passedOtherUid  = route.params?.otherUserId     ?? null;

  useEffect(() => {
    if (!currentUser) return;
    if (!loading) return;

    let unsubscribe;

    const startChat = (id) => {
      setChatId(id);
      unsubscribe = subscribeToMessages(
        id,
        (msgs) => {
          const isFirst = isInitialLoad.current;
          isInitialLoad.current = false;

          if (!isFirst && msgs.length > prevMessageCount.current) {
            const newest = msgs[msgs.length - 1];
            if (newest.senderId !== currentUser.uid) {
              handleIncomingMessage(newest);
            }
          }

          prevMessageCount.current = msgs.length;
          setMessages(msgs);
          setLoading(false);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        },
        (err) => {
          setInitError(err.message ?? 'Could not load messages.');
          setLoading(false);
        },
      );
    };

    // ── Fast path: chatId already known (opened from Inbox) ──────────────────
    if (existingChatId) {
      startChat(existingChatId);
      return () => { if (unsubscribe) unsubscribe(); };
    }

    // ── Normal path: opened from DetailsScreen ───────────────────────────────
    const otherUserId = passedOtherUid ?? item.reportedBy ?? 'unknown';

    if (currentUser.uid === otherUserId) {
      Alert.alert('This is your item', 'You cannot chat about your own report.');
      navigation.goBack();
      return;
    }

    const initChat = async () => {
      try {
        setInitError(null);

        if (!item.id) throw new Error('Item is missing an ID. Please go back and try again.');
        if (!otherUserId || otherUserId === 'unknown') {
          throw new Error("Could not identify the item's owner. Please try again.");
        }

        const id = await createOrGetChat(
          currentUser.uid,
          myName,
          otherUserId,
          item.reporterName,
          item.id,
          item.name,
        );

        startChat(id);
      } catch (error) {
        console.error('Chat init error:', error);
        setInitError(error.message ?? 'Could not open the chat. Please try again.');
        setLoading(false);
      }
    };

    initChat();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [retryKey]);

  // ── Handle an incoming message ──────────────────────────────────────────────

  const handleIncomingMessage = useCallback((msg) => {
    // App is visible — show in-app animated toast. When backgrounded, the
    // Cloud Function's push notification reaches the user instead.
    if (appStateRef.current === 'active') {
      toastKey.current += 1;
      setToast({ visible: true, sender: msg.senderName, text: msg.text, key: toastKey.current });
    }
  }, []);

  // ── Send message ────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!message.trim()) return;
    if (returned) return;   // chat is read-only once the item is returned

    // Chat still initialising — tell the user instead of silently failing
    if (!chatId) {
      Alert.alert('Chat not ready', 'The chat is still loading. Please wait a moment and try again.');
      return;
    }
    if (!currentUser) {
      Alert.alert('Not signed in', 'Please sign in to send messages.');
      return;
    }

    const text = message.trim();
    setMessage('');
    setSending(true);

    try {
      await sendMessage(
        chatId,
        text,
        currentUser.uid,
        myName,
      );
    } catch (error) {
      console.error('Send error:', error);
      Alert.alert('Send Failed', 'Could not send the message. Please check your connection and try again.');
      setMessage(text);   // restore so user can retry
    } finally {
      setSending(false);
    }
  };

  // ── Live chat document + live item status ───────────────────────────────────

  useEffect(() => {
    if (!chatId) return;
    const unsubscribe = subscribeToChat(chatId, setChatDoc);
    return unsubscribe;
  }, [chatId]);

  useEffect(() => {
    if (!item.id) return;
    const unsubscribe = subscribeToItem(item.id, setLiveItem);
    return unsubscribe;
  }, [item.id]);

  // ── Handover state ──────────────────────────────────────────────────────────

  const reporterUid  = chatDoc?.reporterUid ?? item.reportedBy;
  const isReporter   = !!currentUser && currentUser.uid === reporterUid;
  const handover     = chatDoc?.handover ?? null;
  const itemDeleted  = liveItem === null;
  const returned     = !!liveItem && isItemReturned(liveItem);
  const statusReady  = !!chatDoc && liveItem !== undefined;

  // Wraps an Alert-confirmed action so it can only run once at a time.
  // The lock is taken before the Alert opens, so a double tap can't open two.
  const runGuardedAction = (title, body, confirmText, action) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;

    const release = () => {
      actionLockRef.current = false;
      setActionBusy(false);
    };

    Alert.alert(
      title,
      body,
      [
        { text: 'Cancel', style: 'cancel', onPress: release },
        {
          text: confirmText,
          onPress: async () => {
            setActionBusy(true);
            try {
              await action();
            } finally {
              release();
            }
          },
        },
      ],
      { cancelable: true, onDismiss: release },
    );
  };

  const handleConfirmHandover = () => {
    if (!chatId || !currentUser) return;
    runGuardedAction(
      'Confirm handover',
      `Confirm that "${item.name}" has changed hands between you and ${otherPersonName}? This can't be undone.`,
      'Confirm',
      async () => {
        try {
          await confirmHandover(chatId, currentUser.uid);
        } catch (error) {
          console.error('Confirm handover error:', error);
          Alert.alert('Could not confirm', 'The handover could not be confirmed. Please check your connection and try again.');
        }
      },
    );
  };

  const handleMarkReturned = () => {
    if (!chatId || !handover?.confirmedBy) return;
    runGuardedAction(
      'Mark as returned',
      `Mark "${item.name}" as returned to ${otherPersonName}? It will be removed from the main list.`,
      'Mark returned',
      async () => {
        try {
          await markItemReturned(item.id, handover.confirmedBy, chatId);
          navigation.navigate('ReportConfirmation', { itemName: item.name });
        } catch (error) {
          console.error('Mark returned error:', error);
          Alert.alert('Could not update item', 'The item could not be marked as returned. Please check your connection and try again.');
        }
      },
    );
  };

  // ── Render a single message bubble ─────────────────────────────────────────

  const renderMessage = (msg, groupedWithNext) => {
    const isMe = msg.senderId === currentUser?.uid;

    return (
      <View
        key={msg.id}
        style={[
          styles.messageWrapper,
          isMe ? styles.wrapperRight : styles.wrapperLeft,
          groupedWithNext && styles.messageWrapperGrouped,
        ]}
      >
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
            {msg.text}
          </Text>
        </View>
        <Text style={[styles.timestamp, isMe ? styles.tsRight : styles.tsLeft]}>
          {formatMessageTime(msg.timestamp)}
        </Text>
      </View>
    );
  };

  // ── Handover / return action bar ────────────────────────────────────────────
  // Non-reporter: "Confirm handover". Reporter: "Mark as returned", enabled
  // only once the other participant has confirmed the handover.

  const renderHandoverAction = () => {
    const Icon  = isReporter ? PackageCheck : Handshake;
    let label   = isReporter ? 'Mark as returned' : 'Confirm handover';
    let onPress = isReporter ? handleMarkReturned : handleConfirmHandover;
    let enabled = false;
    let hint    = null;

    if (!statusReady) {
      hint = 'Loading item status…';
    } else if (itemDeleted) {
      hint = 'This item was deleted by its reporter.';
    } else if (returned) {
      label = 'Returned';
    } else if (isReporter) {
      enabled = !!handover;
      hint = handover
        ? `${otherPersonName} confirmed the handover.`
        : `Available after ${otherPersonName} confirms the handover.`;
    } else if (handover) {
      label = 'Handover confirmed';
      hint  = `Waiting for ${otherPersonName} to mark the item as returned.`;
    } else {
      enabled = true;
      hint    = 'Tap once the item has changed hands.';
    }

    const disabled = !enabled || actionBusy;

    return (
      <View style={styles.actionArea}>
        {hint ? <Text style={styles.actionHint}>{hint}</Text> : null}
        <TouchableOpacity
          style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
        >
          {actionBusy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              {returned
                ? <CheckCircle2 size={16} color="#fff" strokeWidth={2.2} />
                : <Icon size={16} color="#fff" strokeWidth={2.2} />}
              <Text style={styles.actionButtonText}>{label}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // ── Error state ─────────────────────────────────────────────────────────────

  if (initError) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <AlertTriangle size={52} color={colors.emptyIcon} strokeWidth={1.6} style={styles.errorEmoji} />
        <Text style={styles.errorTitle}>Chat unavailable</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setInitError(null);
            setLoading(true);
            setChatId(null);
            isInitialLoad.current    = true;
            prevMessageCount.current = 0;
            setRetryKey((k) => k + 1);  // triggers the useEffect to re-run
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.goBackLink} onPress={() => navigation.goBack()}>
          <View style={styles.goBackLinkRow}>
            <ArrowLeft size={14} color="#2196F3" strokeWidth={2.4} />
            <Text style={styles.goBackLinkText}>Go back</Text>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Opening secure chat…</Text>
      </SafeAreaView>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── In-app toast ─────────────────────────────────────────────────── */}
      <MessageToast
        key={toast.key}
        visible={toast.visible}
        senderName={toast.sender}
        messageText={toast.text}
      />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={26} color={colors.text} strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{otherInitials}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{otherPersonName}</Text>
          <View style={styles.headerStatusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.headerStatusText} numberOfLines={1}>About: {item.name}</Text>
          </View>
        </View>
      </View>

      {/* ── Privacy notice ───────────────────────────────────────────────── */}
      {/* Access is limited by Firestore rules; messages are not end-to-end encrypted. */}
      <View style={styles.encryptionBanner}>
        <Lock size={12} color="#22C55E" strokeWidth={2.4} style={styles.encryptionBannerIcon} />
        <Text style={styles.encryptionBannerText}>
          Only you and {otherPersonName} can see this chat
        </Text>
      </View>

      {/* ── Returned banner ──────────────────────────────────────────────── */}
      {returned ? (
        <View style={styles.returnedBanner}>
          <CheckCircle2 size={16} color="#fff" strokeWidth={2.4} />
          <View style={styles.returnedBannerBody}>
            <Text style={styles.returnedBannerTitle}>Returned</Text>
            <Text style={styles.returnedBannerText}>
              This item has been returned. The chat is now read-only.
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Hand size={48} color={colors.emptyIcon} strokeWidth={1.6} style={styles.emptyChatEmoji} />
            <Text style={styles.emptyChatTitle}>Start the conversation</Text>
            <Text style={styles.emptyChatSub}>Say hello and ask about the item!</Text>
          </View>
        ) : (
          messages.map((msg, index) =>
            renderMessage(msg, messages[index + 1]?.senderId === msg.senderId),
          )
        )}
        <View style={{ height: 10 }} />
      </ScrollView>

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder={returned ? 'This item has been returned' : 'Message...'}
            placeholderTextColor={colors.placeholder}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            editable={!sending && !returned}
            onSubmitEditing={handleSend}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || sending || returned) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!message.trim() || sending || returned}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Send size={18} color="#fff" strokeWidth={2.2} />
          }
        </TouchableOpacity>
      </View>

      {/* ── Handover / return ────────────────────────────────────────────── */}
      {renderHandoverAction()}
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (c) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
  },
  loadingText: {
    marginTop: 12,
    color: c.textSecondary,
    fontSize: 16,
  },
  errorEmoji: {
    marginBottom: 12,
  },
  errorTitle: {
    fontSize:     20,
    fontWeight:   '700',
    color:        c.text,
    marginBottom:  8,
  },
  errorMessage: {
    fontSize:    14,
    color:       c.textMuted,
    textAlign:   'center',
    paddingHorizontal: 30,
    marginBottom: 24,
    lineHeight:   20,
  },
  retryButton: {
    backgroundColor:   '#2196F3',
    paddingHorizontal: 32,
    paddingVertical:   12,
    borderRadius:      24,
    marginBottom:      12,
  },
  retryButtonText: {
    color:      '#fff',
    fontWeight: '700',
    fontSize:   15,
  },
  goBackLink: { padding: 8 },
  goBackLinkRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:            5,
  },
  goBackLinkText: {
    color:    '#2196F3',
    fontSize: 14,
  },

  // ── Toast ──────────────────────────────────────────────────────────────────
  toast: {
    position:        'absolute',
    top:             0,
    left:            12,
    right:           12,
    zIndex:          999,
    backgroundColor: '#1a1a2e',
    borderRadius:    14,
    flexDirection:   'row',
    alignItems:      'center',
    padding:         12,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.3,
    shadowRadius:    8,
    elevation:       10,
    marginTop:       8,
  },
  toastIcon: {
    width:           38,
    height:          38,
    borderRadius:    19,
    backgroundColor: '#2196F3',
    justifyContent:  'center',
    alignItems:      'center',
    marginRight:     10,
  },
  toastBody:     { flex: 1 },
  toastSender: {
    color:      '#fff',
    fontWeight: '700',
    fontSize:   14,
  },
  toastMessage: {
    color:    'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 2,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    backgroundColor:  c.surface,
    paddingHorizontal: 12,
    paddingVertical:   10,
    flexDirection:    'row',
    alignItems:       'center',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backButton: {
    width:          32,
    height:         32,
    justifyContent: 'center',
    alignItems:     'center',
    marginRight:    4,
  },
  headerAvatar: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: '#2AACA0',
    justifyContent:  'center',
    alignItems:      'center',
    marginRight:     10,
  },
  headerAvatarText: {
    color:      '#fff',
    fontWeight: '700',
    fontSize:   15,
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize:   16,
    fontWeight: '700',
    color:      c.text,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginTop:     2,
  },
  statusDot: {
    width:           7,
    height:          7,
    borderRadius:    3.5,
    backgroundColor: '#22C55E',
    marginRight:      5,
  },
  headerStatusText: {
    fontSize: 12,
    color:    c.textSecondary,
    flexShrink: 1,
  },

  // ── Encryption banner ───────────────────────────────────────────────────────
  encryptionBanner: {
    backgroundColor:  '#12121F',
    paddingHorizontal: 14,
    paddingVertical:   9,
    flexDirection:    'row',
    justifyContent:   'center',
    alignItems:       'center',
  },
  encryptionBannerIcon: {
    marginRight: 6,
  },
  encryptionBannerText: {
    fontSize:  12,
    color:     '#22C55E',
    textAlign: 'center',
    fontWeight: '600',
  },

  // ── Messages ────────────────────────────────────────────────────────────────
  messagesContainer: {
    flex:    1,
    padding: 12,
  },
  emptyChat: {
    alignItems:  'center',
    paddingTop:  60,
    paddingBottom: 20,
  },
  emptyChatEmoji: {
    marginBottom: 10,
  },
  emptyChatTitle: {
    fontSize:     18,
    fontWeight:   '700',
    color:        c.textSecondary,
    marginBottom:  4,
  },
  emptyChatSub: {
    fontSize: 14,
    color:    c.textMuted,
  },

  // Message layout
  messageWrapper: {
    marginBottom: 14,
    maxWidth:     '80%',
  },
  messageWrapperGrouped: { marginBottom: 4 },
  wrapperRight: { alignSelf: 'flex-end',  alignItems: 'flex-end' },
  wrapperLeft:  { alignSelf: 'flex-start', alignItems: 'flex-start' },

  // Bubble
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical:   10,
  },
  myMessage: {
    backgroundColor:         '#2563EB',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor:        c.surface,
    borderBottomLeftRadius: 4,
    shadowColor:            '#000',
    shadowOffset:           { width: 0, height: 1 },
    shadowOpacity:          0.06,
    shadowRadius:           3,
    elevation:              1,
  },
  messageText: {
    fontSize:   15,
    lineHeight: 21,
  },
  myText:    { color: '#fff' },
  theirText: { color: c.text },

  timestamp: {
    fontSize:  11,
    color:     c.textMuted,
    marginTop: 4,
  },
  tsRight: { textAlign: 'right' },
  tsLeft:  { textAlign: 'left' },

  // ── Input bar ───────────────────────────────────────────────────────────────
  inputContainer: {
    flexDirection:   'row',
    padding:          12,
    paddingTop:        8,
    borderTopWidth:    1,
    borderTopColor:   c.border,
    backgroundColor:  c.surface,
    alignItems:       'center',
  },
  inputWrapper: {
    flex:             1,
    flexDirection:    'row',
    alignItems:       'center',
    borderRadius:     24,
    paddingHorizontal: 16,
    paddingVertical:    8,
    marginRight:       8,
    backgroundColor:  c.surfaceAlt,
  },
  textInput: {
    flex:      1,
    fontSize:  15,
    color:     c.text,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    width:           42,
    height:          42,
    borderRadius:    21,
    backgroundColor: '#2563EB',
    justifyContent:  'center',
    alignItems:      'center',
  },
  sendButtonDisabled: { opacity: 0.35 },

  // ── Returned banner ─────────────────────────────────────────────────────────
  returnedBanner: {
    backgroundColor:  '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical:   10,
    flexDirection:    'row',
    alignItems:       'center',
    gap:                10,
  },
  returnedBannerBody: { flex: 1 },
  returnedBannerTitle: {
    color:      '#fff',
    fontWeight: '700',
    fontSize:   14,
  },
  returnedBannerText: {
    color:     'rgba(255,255,255,0.9)',
    fontSize:  12,
    marginTop: 1,
  },

  // ── Handover / return action ────────────────────────────────────────────────
  actionArea: {
    backgroundColor: c.surface,
    paddingTop:       4,
  },
  actionHint: {
    fontSize:          12,
    color:             c.textMuted,
    textAlign:         'center',
    paddingHorizontal: 16,
    marginBottom:       6,
  },
  actionButtonDisabled: {
    opacity:   0.45,
    elevation: 0,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginBottom:     16,
    marginTop:         4,
    padding:          13,
    borderRadius:     12,
    flexDirection:    'row',
    justifyContent:   'center',
    alignItems:       'center',
    gap:                8,
    shadowColor:      '#4CAF50',
    shadowOffset:     { width: 0, height: 3 },
    shadowOpacity:    0.35,
    shadowRadius:     6,
    elevation:         4,
  },
  actionButtonText: {
    color:      '#fff',
    fontWeight: '700',
    fontSize:   15,
  },
});
