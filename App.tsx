import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from './theme/AppTheme';

import HomePage from './screens/HomePage';
import LiveChannelsPage from './screens/LiveChannelsPage';
import MoviesPage from './screens/MoviesPage';
import MorePage from './screens/MorePage';
import PlayerPage from './screens/PlayerPage';

import IranianSatellitePage from './screens/IranianSatellitePage';
import SearchPage from './screens/SearchPage';
import SeriesPage from './screens/SeriesPage';
import FavoritesPage from './screens/FavoritesPage';
import SubscriptionPage from './screens/SubscriptionPage';
import InstallPage from './screens/InstallPage';
import PrivacyPage from './screens/PrivacyPage';
import AdminPage from './screens/AdminPage';

import { AdminProvider } from './context/AdminContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { LanguageProvider, useTranslation } from './locales';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

// Spread the built-in theme so React Navigation keeps its `fonts` object.
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Theme.colors.primary,
    background: Theme.colors.background,
    card: Theme.colors.surface,
    text: Theme.colors.text,
    border: Theme.colors.border,
    notification: Theme.colors.primary,
  },
};

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Live: { active: 'tv', inactive: 'tv-outline' },
  Movies: { active: 'film', inactive: 'film-outline' },
  More: { active: 'grid', inactive: 'grid-outline' },
};

const TAB_LABELS = {
  en: { Home: 'Home', Live: 'Live TV', Movies: 'Movies', More: 'More' },
  fa: { Home: 'خانه', Live: 'تلویزیون زنده', Movies: 'فیلم‌ها', More: 'بیشتر' },
};

function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <MoreStack.Screen name="MoreMenu" component={MorePage} />
      <MoreStack.Screen name="IranianSatellite" component={IranianSatellitePage} />
      <MoreStack.Screen name="Search" component={SearchPage} />
      <MoreStack.Screen name="Series" component={SeriesPage} />
      <MoreStack.Screen name="Favorites" component={FavoritesPage} />
      <MoreStack.Screen name="Subscription" component={SubscriptionPage} />
      <MoreStack.Screen name="InstallApp" component={InstallPage} />
      <MoreStack.Screen name="Privacy" component={PrivacyPage} />
      <MoreStack.Screen name="Admin" component={AdminPage} />
    </MoreStack.Navigator>
  );
}

function Tabs() {
  const { lang } = useTranslation();
  const labels = TAB_LABELS[lang];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Theme.colors.selection.active,
        tabBarInactiveTintColor: Theme.colors.selection.inactive,
        tabBarStyle: {
          backgroundColor: Theme.colors.surface,
          borderTopColor: Theme.colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: Theme.typography.fontWeight.semibold,
        },
        tabBarIcon: ({ color, focused }) => {
          const icons = TAB_ICONS[route.name] || TAB_ICONS.Home;
          return (
            <Ionicons
              name={(focused ? icons.active : icons.inactive) as any}
              size={focused ? 23 : 21}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomePage} options={{ title: labels.Home }} />
      <Tab.Screen name="Live" component={LiveChannelsPage} options={{ title: labels.Live }} />
      <Tab.Screen name="Movies" component={MoviesPage} options={{ title: labels.Movies }} />
      <Tab.Screen name="More" component={MoreNavigator} options={{ title: labels.More }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <LanguageProvider>
        <AdminProvider>
          <FavoritesProvider>
            <NavigationContainer theme={navigationTheme}>
              <RootStack.Navigator screenOptions={{ headerShown: false }}>
                <RootStack.Screen name="Tabs" component={Tabs} />
                <RootStack.Screen
                  name="Player"
                  component={PlayerPage}
                  options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
                />
              </RootStack.Navigator>
            </NavigationContainer>
          </FavoritesProvider>
        </AdminProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
      }
        
