import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

import { AppTheme } from './theme/AppTheme';
import { LanguageProvider } from './locales';
import { AdminProvider } from './context/AdminContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { AuthProvider } from './context/AuthContext';
import { createPollListener } from './services/firebase';

import HomePage from './screens/HomePage';
import LiveChannelsPage from './screens/LiveChannelsPage';
import MoviesPage from './screens/MoviesPage';
import SeriesPage from './screens/SeriesPage';
import SearchPage from './screens/SearchPage';
import MorePage from './screens/MorePage';
import FavoritesPage from './screens/FavoritesPage';
import AdminPage from './screens/AdminPage';
import PlayerPage from './screens/PlayerPage';
import PrivacyPage from './screens/PrivacyPage';
import SubscriptionPage from './screens/SubscriptionPage';
import IranianSatellitePage from './screens/IranianSatellitePage';
import AuthPage from './screens/AuthPage';
import MyChannelPage from './screens/MyChannelPage';
import PublicChannelsPage from './screens/PublicChannelsPage';


class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: String(error?.message || error) };
  }
  componentDidCatch(error: any) {
    console.warn('App ErrorBoundary:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0A0E17', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 12 }}>
            مشکلی در بارگذاری برنامه پیش آمد
          </Text>
          <Text style={{ color: '#A8B4C8', fontSize: 13, textAlign: 'center' }}>{this.state.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function versionToNumber(v?: string | null): number {
  if (!v) return 0;
  const parts = String(v).split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts[0] * 1_000_000 + parts[1] * 1_000 + parts[2];
}

function ForceUpdateGate({ children }: { children: React.ReactNode }) {
  const [localVersion, setLocalVersion] = useState<string | null>(null);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [forceUpdateUrl, setForceUpdateUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v =
        (Application && (Application.nativeApplicationVersion || (Application as any).applicationVersion)) ||
        (Constants?.expoConfig?.version as string) ||
        (Constants?.manifest?.version as string) ||
        '1.0.0';
      setLocalVersion(v ?? null);
    } catch {
      setLocalVersion(null);
    }
  }, []);

  useEffect(() => {
    let versionListener: ReturnType<typeof createPollListener> | null = null;
    let urlListener: ReturnType<typeof createPollListener> | null = null;

    try {
      versionListener = createPollListener('current_version', 4000);
      urlListener = createPollListener('force_update_url', 4000);

      versionListener.start((data: any) => {
        setRemoteVersion(data == null ? null : String(data));
      });
      urlListener.start((data: any) => {
        setForceUpdateUrl(data == null ? null : String(data));
      });
    } catch {
      // silent
    }

    setReady(true);

    return () => {
      try { versionListener?.stop(); } catch {}
      try { urlListener?.stop(); } catch {}
    };
  }, []);

  const forceRequired =
    ready &&
    remoteVersion != null &&
    localVersion != null &&
    versionToNumber(remoteVersion) > versionToNumber(localVersion);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={AppTheme.colors.primary} />
      </View>
    );
  }

  if (forceRequired) {
    return (
      <View style={styles.forceWrap}>
        <Text style={styles.forceTitle}>به‌روزرسانی لازم است</Text>
        <Text style={styles.forceText}>
          نسخه جدید برنامه در دسترس است. برای ادامه لطفاً به‌روزرسانی کنید.
        </Text>
        {forceUpdateUrl ? (
          <TouchableOpacity
            style={styles.forceBtn}
            onPress={() => Linking.openURL(forceUpdateUrl).catch(() => {})}
            activeOpacity={0.85}
          >
            <Text style={styles.forceBtnText}>دریافت نسخه جدید</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return <>{children}</>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: AppTheme.colors.backgroundSecondary,
          borderTopColor: AppTheme.colors.border,
          borderTopWidth: 1,
          height: 58,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarActiveTintColor: AppTheme.colors.primary,
        tabBarInactiveTintColor: AppTheme.colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          let icon: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'Home') icon = 'home';
          else if (route.name === 'Live') icon = 'tv';
          else if (route.name === 'Movies') icon = 'film';
          else if (route.name === 'Series') icon = 'albums';
          else if (route.name === 'More') icon = 'menu';
          return <Ionicons name={icon} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomePage} options={{ title: 'خانه' }} />
      <Tab.Screen name="Live" component={LiveChannelsPage} options={{ title: 'زنده' }} />
      <Tab.Screen name="Movies" component={MoviesPage} options={{ title: 'فیلم' }} />
      <Tab.Screen name="Series" component={SeriesPage} options={{ title: 'سریال' }} />
      <Tab.Screen name="More" component={MorePage} options={{ title: 'بیشتر' }} />
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Search" component={SearchPage} />
      <Stack.Screen name="Favorites" component={FavoritesPage} />
      <Stack.Screen name="Admin" component={AdminPage} />
      <Stack.Screen name="Player" component={PlayerPage} />
      <Stack.Screen name="Privacy" component={PrivacyPage} />
      <Stack.Screen name="Subscription" component={SubscriptionPage} />
      <Stack.Screen name="IranianSatellite" component={IranianSatellitePage} />
      <Stack.Screen name="Auth" component={AuthPage} />
      <Stack.Screen name="MyChannel" component={MyChannelPage} />
      <Stack.Screen name="PublicChannels" component={PublicChannelsPage} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={AppTheme.colors.background} />
      <LanguageProvider>
        <AdminProvider>
          <AuthProvider>
          <FavoritesProvider>
            <ForceUpdateGate>
              <NavigationContainer
                theme={{
                  dark: true,
                  colors: {
                    primary: AppTheme.colors.primary,
                    background: AppTheme.colors.background,
                    card: AppTheme.colors.surface,
                    text: AppTheme.colors.text,
                    border: AppTheme.colors.border,
                    notification: AppTheme.colors.primary,
                  },
                  fonts: {
                    regular: { fontFamily: 'System', fontWeight: '400' },
                    medium: { fontFamily: 'System', fontWeight: '500' },
                    bold: { fontFamily: 'System', fontWeight: '700' },
                    heavy: { fontFamily: 'System', fontWeight: '800' },
                  },
                }}
              >
                <RootStack />
              </NavigationContainer>
            </ForceUpdateGate>
          </FavoritesProvider>
          </AuthProvider>
        </AdminProvider>
      </LanguageProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forceWrap: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  forceTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AppTheme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  forceText: {
    fontSize: 15,
    color: AppTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  forceBtn: {
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  forceBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
