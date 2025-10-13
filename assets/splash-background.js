import React from 'react';
import { View, StyleSheet } from 'react-native';

const SplashBackground = () => {
  return (
    <View style={styles.container}>
      <View style={styles.background} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#bff6dc',
  },
  background: {
    flex: 1,
    backgroundColor: '#bff6dc',
  },
});

export default SplashBackground;
