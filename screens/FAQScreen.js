import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FAQScreen = ({ navigation }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const faqs = [
    { question: 'What is this app?', answer: 'This app allows you to scan and identify animals and plants using AI technology.' },
    { question: 'How do I use the scanner?', answer: 'Simply point the camera at the plant or animal, and the app will try to identify it for you.' },
    { question: 'Is the app accurate?', answer: 'Yes, it uses machine learning to identify plants and animals based on a large database.' },
    { question: 'Can I identify any plant or animal?', answer: 'The app can identify a wide range of species, but its accuracy might vary depending on the environment and lighting.' },
    { question: 'How does the AI work?', answer: 'The AI uses an image recognition model powered by TensorFlow to match the scanned object with known species in its database.' },
    { question: 'How do I save my favorite species?', answer: 'You can add any identified species to your favorites by clicking the heart icon next to it.' },
    { question: 'What if the app can’t recognize the species?', answer: 'You can submit the image for review, and we will update the database to include more species.' },
    { question: 'How do I contact support?', answer: 'You can reach us through the Help section in the Settings or email support@leafnest.com.' },
  ];

  const handleToggle = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // Smooth transition
    setExpandedIndex(expandedIndex === index ? null : index); // Toggle the expanded index
  };

  const renderFAQ = (faq, index) => (
    <View key={index} style={styles.faqItem}>
      <TouchableOpacity onPress={() => handleToggle(index)} style={styles.questionContainer}>
        <Text style={styles.question}>{faq.question}</Text>
        <Ionicons 
          name={expandedIndex === index ? 'chevron-up' : 'chevron-down'} 
          size={24} 
          color="#5E936C" 
          style={styles.icon}
        />
      </TouchableOpacity>
      {expandedIndex === index && (
        <Text style={styles.answer}>{faq.answer}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#5E936C" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Frequently Asked Questions</Text>

        {faqs.map((faq, index) => renderFAQ(faq, index))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FC',  // Soft background for a modern feel
  },
  // Custom Back Button Style
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 50,
    zIndex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 80,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
    color: '#5E936C',
  },
  faqItem: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0', // Subtle border for separation
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  icon: {
    marginLeft: 10,
    transform: [{ rotate: '0deg' }],
  },
  answer: {
    fontSize: 16,
    marginTop: 10,
    color: '#555',
    paddingLeft: 20,
  },
});

export default FAQScreen;
