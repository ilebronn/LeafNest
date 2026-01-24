import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useVerificationGuard } from '@hooks/useVerificationGuard';
import { auth } from '@config/firebase';

export default function VerificationGuard({ children }) {
  const navigation = useNavigation();
  const { isVerified, isLoading } = useVerificationGuard();
  const currentUser = auth.currentUser;

  useEffect(() => {
    // Only check if user is logged in (not guest)
    if (!isLoading && currentUser && !isVerified) {
      console.log('⚠️ User not verified, redirecting...');
      navigation.navigate('VerificationScreen', { 
        email: currentUser.email 
      });
    }
  }, [isVerified, isLoading, currentUser]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E936C" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});