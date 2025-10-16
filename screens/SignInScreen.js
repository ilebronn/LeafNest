//signinscreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ImageBackground, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { auth, signInWithEmailAndPassword } from '../firebase';
import { clearAllUserData } from '../utils/userUtils';
import { CommonActions } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// Responsive sizing functions
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export default function SignInScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Device detection
  const isSmallScreen = width < 375;
  const isTablet = width > 600;

  const handleSignIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ FIXED: Use reset instead of replace
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'MainTabs',
              params: {
                screen: 'Home',
                params: { guest: false, displayName: user.displayName },
              },
            },
          ],
        })
      );
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/background-signin.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity 
            style={[
              styles.backButton,
              isTablet && styles.backButtonTablet
            ]} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={moderateScale(30)} color="white" />
          </TouchableOpacity>

          <View style={[
            styles.formContainer,
            isTablet && styles.formContainerTablet
          ]}>
            <TextInput 
              style={[
                styles.input,
                isTablet && styles.inputTablet
              ]} 
              placeholder={t('signin.email')} 
              placeholderTextColor="#666"
              value={email} 
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  isTablet && styles.inputTablet
                ]}
                placeholder={t('signin.password')}
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              >
                <Ionicons 
                  name={isPasswordVisible ? 'eye-off' : 'eye'} 
                  size={moderateScale(24)} 
                  color="#5E936C" 
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity 
              style={styles.forgotPasswordContainer}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={[
                styles.forgotPasswordText,
                isTablet && styles.forgotPasswordTextTablet
              ]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.button,
                isTablet && styles.buttonTablet
              ]} 
              onPress={handleSignIn}
            >
              <Text style={[
                styles.buttonText,
                isTablet && styles.buttonTextTablet
              ]}>
                {t('signin.signIn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={[
                styles.switchText,
                isTablet && styles.switchTextTablet
              ]}>
                {t('signin.dontHaveAccount')}
              </Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(40),
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(40),
    left: scale(10),
    padding: moderateScale(10),
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: moderateScale(25),
  },
  backButtonTablet: {
    top: verticalScale(60),
    left: scale(20),
    padding: moderateScale(12),
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  formContainerTablet: {
    maxWidth: 500,
  },
  heading: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    marginBottom: verticalScale(20),
    color: '#333',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  input: {
    width: '100%',
    padding: moderateScale(20),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: moderateScale(25),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#333',
    fontSize: moderateScale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    top: verticalScale(30),
  },
  inputTablet: {
    padding: moderateScale(22),
    fontSize: moderateScale(18),
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: scale(10),
    top: verticalScale(36),
    padding: moderateScale(10),
    
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginRight: scale(20),
    marginTop: verticalScale(-10),
    marginBottom: verticalScale(15),
  },
  forgotPasswordText: {
    color: '#000000ff',
    fontSize: moderateScale(14),
    fontWeight: '600',
    textDecorationLine: 'underline',
    top: verticalScale(30),
  },
  forgotPasswordTextTablet: {
    fontSize: moderateScale(16),
    
  },
  button: {
    backgroundColor: '#5E936C',
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(30),
    borderRadius: moderateScale(25),
    width: '80%',
    maxWidth: 350,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    top: verticalScale(30),
  },
  buttonTablet: {
    paddingVertical: verticalScale(18),
    maxWidth: 400,
  },
  buttonText: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: 'bold',
  },
  buttonTextTablet: {
    fontSize: moderateScale(18),
  },
  switchText: {
    color: '#000000ff',
    fontSize: moderateScale(18),
    textDecorationLine: 'underline',
    marginTop: verticalScale(20),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(10),
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    top: verticalScale(30),
  },
  switchTextTablet: {
    fontSize: moderateScale(20),
  },
});