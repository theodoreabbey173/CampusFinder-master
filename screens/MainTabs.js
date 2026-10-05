import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, MessageCircle, User } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';

import ListScreen   from './ListScreen';
import InboxScreen  from './InboxScreen';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Browse: Home,
  Chats:  MessageCircle,
  You:    User,
};

function TabIcon({ routeName, focused }) {
  const { colors } = useTheme();
  const Icon = TAB_ICONS[routeName];
  return (
    <Icon
      size={22}
      color={focused ? colors.brandText : colors.textMuted}
      strokeWidth={focused ? 2.4 : 2}
    />
  );
}

export default function MainTabs() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brandText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Browse" component={ListScreen} />
      <Tab.Screen name="Chats" component={InboxScreen} />
      <Tab.Screen name="You" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const createStyles = (c) => StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 84 : 66,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 10,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
