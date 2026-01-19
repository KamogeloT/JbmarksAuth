import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors } from '@constants/colors';
import { Button, Input } from '@components/common';
import { useAuthStore } from '@store';

const { height } = Dimensions.get('window');

// Eye icon for password visibility toggle
const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    {visible ? (
      <>
        <Path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke={Colors.textSecondary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="12" cy="12" r="3" stroke={Colors.textSecondary} strokeWidth={2} />
      </>
    ) : (
      <>
        <Path
          d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
          stroke={Colors.textSecondary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M1 1l22 22" stroke={Colors.textSecondary} strokeWidth={2} strokeLinecap="round" />
      </>
    )}
  </Svg>
);

export default function LoginScreen() {
  const { loginWithOAuth, loading, error } = useAuthStore();
  const navigation = useNavigation();

  const handleLogin = async () => {
    try {
      // Use OAuth authentication (works with standalone builds)
      const success = await loginWithOAuth();
      if (success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Tabs' as never }],
        });
      }
      // Error is already handled by the store and displayed in UI
    } catch (error: any) {
      console.error('Login error:', error);
      // Error is already handled by the store
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Green gradient background */}
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#43A047']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.circle1]} />
      <View style={[styles.decorCircle, styles.circle2]} />
      <View style={[styles.decorCircle, styles.circle3]} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/jbmarkslogo.jpg')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.formCard}>
                <Text style={styles.welcomeText}>Welcome to JBmarks</Text>
                <Text style={styles.instructionText}>
                  Sign in to access your Bitrix24 tasks, messages, and notifications
                </Text>

                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#1B5E20', '#2E7D32']}
                    style={styles.loginButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.loginButtonText}>
                      {loading ? 'Signing In...' : 'Sign In'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Marks of Excellence</Text>
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -80,
    right: -80,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 150,
    left: -60,
  },
  circle3: {
    width: 120,
    height: 120,
    top: height * 0.35,
    right: -40,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  logo: {
    width: 200,
    height: 90,
  },
  formSection: {
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  oauthInfoText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 28,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: Colors.error + '15',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  versionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
});
