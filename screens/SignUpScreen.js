//SignUpScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { auth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from '../firebase';
import { createUserProfile } from '../firestoreService'; // ✅ ADD THIS
import { setUsername, clearAllUserData } from '../utils/userUtils';

export default function SignUpScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsernameState] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // ✅ ADD THIS

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('signup.passwordsDontMatch'));
      return;
    }

    if (!email || !password || !confirmPassword || !username) {
      Alert.alert(t('common.error'), t('signup.fillAllFields'));
      return;
    }

    setIsLoading(true); // ✅ ADD THIS

    try {
      // Clear any existing user data before signing up
      await clearAllUserData();

      // Register the user using Firebase Authentication's modular SDK method
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Set the user's display name using updateProfile from modular SDK
      await updateProfile(user, { displayName: username });

      // ✅ ADD THIS: Create user profile in Firestore
      const profileResult = await createUserProfile(user.uid, email, username);
      
      if (!profileResult.success) {
        console.warn('Failed to create user profile in Firestore:', profileResult.error);
        // Continue anyway - auth was successful
      }

      // Send email verification
      await sendEmailVerification(user);

      Alert.alert(t('signup.signUpSuccessful'), t('signup.verificationEmailSent'));

      // Store username in AsyncStorage
      await setUsername(username);

      // Navigate directly to HomeScreen with username
      navigation.replace('MainTabs', {
        screen: 'Home',
        params: { guest: false, displayName: username },
      });
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(t('common.error'), t('signup.emailAlreadyInUse'));
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert(t('common.error'), t('signup.invalidEmail'));
      } else {
        Alert.alert(t('common.error'), error.message);
      }
    } finally {
      setIsLoading(false); // ✅ ADD THIS
    }
  };

  return (
    <ImageBackground
      source={require('../assets/background-register.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={30} color="white" />
          </TouchableOpacity>

          <TextInput 
            style={styles.input} 
            placeholder={t('signup.username')} 
            placeholderTextColor="#666"
            value={username} 
            onChangeText={setUsernameState}
            editable={!isLoading} 
          />

          <TextInput 
            style={styles.input} 
            placeholder={t('signup.email')} 
            placeholderTextColor="#666"
            value={email} 
            onChangeText={setEmail}
            editable={!isLoading}
          />
          
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('signup.password')}
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
              editable={!isLoading}
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
              <Ionicons name={isPasswordVisible ? 'eye-off' : 'eye'} size={24} color="#5E936C" />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('signup.confirmPassword')}
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!isConfirmPasswordVisible}
              editable={!isLoading}
            />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}>
              <Ionicons name={isConfirmPasswordVisible ? 'eye-off' : 'eye'} size={24} color="#5E936C" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating Account...' : t('signup.register')}
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  input: {
    width: '100%',
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    top: 100
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 25,
    top: 112,
    padding: 5,
  },
  button: {
    backgroundColor: '#5E936C',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    top: 100,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchText: {
    color: '#000000ff',
    fontSize: 20,
    textDecorationLine: 'underline',
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    top: 100
  },
});