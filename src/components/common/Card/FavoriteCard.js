import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function FavoriteCard({ 
  item, 
  isSelected, 
  selectionMode, 
  onPress, 
  onLongPress 
}) {
  const [imageError, setImageError] = useState(false);

  // ✅ FIX: Validate image URL - only use if it's a valid remote URL
  const isValidImageUrl = (url) => {
    if (!url) return false;
    // Check if it's a valid HTTP/HTTPS URL (not a local file:// URI)
    return url.startsWith('http://') || url.startsWith('https://');
  };

  // Determine which image source to use
  const getImageSource = () => {
    // Priority 1: Use imageUrl if it's a valid remote URL
    if (isValidImageUrl(item.imageUrl)) {
      return item.imageUrl;
    }
    
    // Priority 2: Use imageUri if it's a valid remote URL (fallback)
    if (isValidImageUrl(item.imageUri)) {
      return item.imageUri;
    }
    
    // No valid image URL found
    return null;
  };

  const imageSource = getImageSource();
  const shouldShowImage = imageSource && !imageError;

  return (
    <TouchableOpacity 
      style={[styles.card, isSelected && styles.cardSelected]} 
      activeOpacity={0.7} 
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {selectionMode && (
        <View style={styles.selectionCheckbox}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
          ) : (
            <View style={styles.emptyCheckbox} />
          )}
        </View>
      )}

      {shouldShowImage ? (
        <Image 
          source={{ uri: imageSource }} 
          style={styles.image}
          onError={(error) => {
            console.error('❌ Failed to load image:', imageSource);
            console.error('Error details:', error.nativeEvent.error);
            setImageError(true);
          }}
          onLoad={() => {
            console.log('✅ Image loaded successfully:', imageSource);
          }}
        />
      ) : (
        <LinearGradient
          colors={['#E8F5E9', '#C8E6C9']}
          style={[styles.image, styles.imageFallback]}
        >
          <Ionicons name="image-outline" size={32} color="#5E936C" />
        </LinearGradient>
      )}
      
      <View style={styles.cardContent}>
        <Text numberOfLines={2} style={styles.name}>
          {item.name || item.commonName || 'Unknown Species'}
        </Text>
        {item.scientificName && item.scientificName !== item.name && (
          <Text numberOfLines={1} style={styles.scientificName}>
            {item.scientificName}
          </Text>
        )}
        {item.rank && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.rank}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  emptyCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E5E7EB',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  scientificName: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5E936C',
    textTransform: 'capitalize',
  },
});