import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const FAQScreen = ({ navigation }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();

  const baseW = 375;
  const baseH = 812;

  const scale = (size) => (width / baseW) * size;
  const vScale = (size) => (height / baseH) * size;
  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
  const clampFS = (size, min = 12, max = 22) => clamp(scale(size), min, max);

  const hPad = clamp(scale(20), 16, 28);
  const cardPad = clamp(scale(18), 14, 22);

  const titleFS = clampFS(28, 22, 32);
  const categoryFS = clampFS(18, 16, 20);
  const questionFS = clampFS(16, 14, 18);
  const answerFS = clampFS(15, 13, 17);
  const bodyFS = clampFS(15, 13, 17);
  const iconSize = clamp(scale(24), 20, 26);
  const backIconSize = clamp(scale(26), 22, 28);

  const categoryIcons = ['rocket', 'camera', 'checkmark-circle', 'help-circle'];
  const faqs =
    (t('faq.categories', { returnObjects: true }) || []).map((category, index) => ({
      icon: categoryIcons[index] || 'information-circle',
      ...category,
    }));

  const handleToggle = (categoryIndex, itemIndex) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    const newIndex = `${categoryIndex}-${itemIndex}`;
    setExpandedIndex(expandedIndex === newIndex ? null : newIndex);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: Platform.OS === 'ios' ? vScale(50) : vScale(40),
      paddingBottom: vScale(20),
      paddingHorizontal: hPad,
      zIndex: 10,
    },
    headerContent: {
      alignItems: 'center',
    },
    backButton: {
      position: 'absolute',
      left: hPad,
      top: Platform.OS === 'ios' ? vScale(52) : vScale(42),
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: 24,
      padding: clamp(scale(10), 8, 12),
      zIndex: 10,
    },
    title: {
      fontSize: titleFS,
      fontWeight: '700',
      color: '#fff',
      textAlign: 'center',
      letterSpacing: 0.5,
      marginTop: Platform.OS === 'ios' ? 0 : vScale(10),
    },
    subtitle: {
      fontSize: clampFS(14, 12, 16),
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      marginTop: vScale(6),
    },
    scrollContainer: {
      padding: hPad,
      paddingTop: Platform.OS === 'ios' ? vScale(140) : vScale(130),
      paddingBottom: vScale(40),
    },
    categorySection: {
      marginBottom: vScale(24),
    },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: vScale(12),
      paddingLeft: clamp(scale(4), 2, 6),
    },
    categoryIconContainer: {
      width: clamp(scale(36), 32, 40),
      height: clamp(scale(36), 32, 40),
      borderRadius: 12,
      backgroundColor: '#F0F7F3',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: clamp(scale(10), 8, 12),
      borderWidth: 2,
      borderColor: '#D1E5D8',
    },
    categoryTitle: {
      fontSize: categoryFS,
      fontWeight: '700',
      color: '#2D5A3F',
      letterSpacing: 0.3,
    },
    faqItem: {
      marginBottom: vScale(12),
      borderRadius: 16,
      backgroundColor: '#fff',
      borderWidth: 2,
      borderColor: '#E5E7EB',
      overflow: 'hidden',
    },
    faqItemExpanded: {
      borderColor: '#5E936C',
    },
    questionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: cardPad,
    },
    questionText: {
      fontSize: questionFS,
      fontWeight: '600',
      color: '#1F2937',
      flex: 1,
      marginRight: clamp(scale(12), 10, 14),
      lineHeight: clamp(scale(22), 20, 24),
    },
    chevronContainer: {
      width: clamp(scale(32), 28, 36),
      height: clamp(scale(32), 28, 36),
      borderRadius: 10,
      backgroundColor: '#F0F7F3',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#D1E5D8',
    },
    answerContainer: {
      paddingHorizontal: cardPad,
      paddingBottom: cardPad,
      paddingTop: 0,
      backgroundColor: '#F9FAFB',
    },
    answer: {
      fontSize: answerFS,
      color: '#4B5563',
      lineHeight: clamp(scale(24), 20, 26),
      paddingTop: vScale(8),
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: vScale(40),
    },
    emptyIcon: {
      width: clamp(scale(80), 64, 96),
      height: clamp(scale(80), 64, 96),
      borderRadius: 40,
      backgroundColor: '#F0F7F3',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: vScale(16),
    },
    emptyText: {
      fontSize: bodyFS,
      color: '#6B7280',
      textAlign: 'center',
    },
    helpCard: {
      backgroundColor: '#F0F7F3',
      borderRadius: 16,
      padding: cardPad,
      marginTop: vScale(12),
      borderWidth: 2,
      borderColor: '#D1E5D8',
      alignItems: 'center',
    },
    helpTitle: {
      fontSize: categoryFS,
      fontWeight: '700',
      color: '#2D5A3F',
      marginBottom: vScale(8),
      textAlign: 'center',
    },
    helpText: {
      fontSize: answerFS,
      color: '#4B5563',
      textAlign: 'center',
      marginBottom: vScale(12),
    },
    contactButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#5E936C',
      paddingVertical: clamp(vScale(12), 10, 14),
      paddingHorizontal: clamp(scale(24), 18, 28),
      borderRadius: 12,
    },
    contactButtonText: {
      fontSize: answerFS,
      color: '#fff',
      fontWeight: '600',
      marginLeft: clamp(scale(8), 6, 10),
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#5E936C', '#7FB28A']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={backIconSize} color="#2D5A3F" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{t('faq.title')}</Text>
          <Text style={styles.subtitle}>{t('faq.subtitle')}</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {faqs.map((category, categoryIndex) => (
          <View key={categoryIndex} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIconContainer}>
                <Ionicons name={category.icon} size={clamp(scale(20), 18, 24)} color="#5E936C" />
              </View>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </View>

            {category.items.map((faq, itemIndex) => {
              const isExpanded = expandedIndex === `${categoryIndex}-${itemIndex}`;
              return (
                <View 
                  key={itemIndex} 
                  style={[styles.faqItem, isExpanded && styles.faqItemExpanded]}
                >
                  <TouchableOpacity 
                    onPress={() => handleToggle(categoryIndex, itemIndex)} 
                    style={styles.questionContainer}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.questionText}>{faq.question}</Text>
                    <View style={styles.chevronContainer}>
                      <Ionicons 
                        name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                        size={iconSize} 
                        color="#5E936C"
                      />
                    </View>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.answerContainer}>
                      <Text style={styles.answer}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FAQScreen;
