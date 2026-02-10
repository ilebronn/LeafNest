// src/components/common/Card/TrendingCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getIconForTaxon, getGradientForTaxon } from '../../../utils/auth/taxonHelpers';
import { pickSpeciesName } from '@utils/text/speciesName';

export default function TrendingCard({ item, index, onPress, t }) {
  const gradient = getGradientForTaxon(item.iconicTaxon);

  return (
    <TouchableOpacity
      style={styles.trendingCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.trendingImageWrapper}>
        {item.imageUrl ? (
          <>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.trendingImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.trendingGradient}
            />
          </>
        ) : (
          <LinearGradient
            colors={gradient}
            style={styles.trendingImage}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name={getIconForTaxon(item.iconicTaxon)} 
              size={32} 
              color="rgba(255,255,255,0.9)" 
            />
          </LinearGradient>
        )}

        <View style={styles.trendingBadge}>
          <Ionicons name="flame" size={14} color="#fff" />
          <Text style={styles.trendingBadgeText}>#{index + 1}</Text>
        </View>

        <View style={styles.trendingInfo}>
          <Text style={styles.trendingName} numberOfLines={2}>
            {pickSpeciesName(item.commonName, item.name, item.scientificName) ||
              t('home.feed.unknownSpecies')}
          </Text>
          <View style={styles.trendingStats}>
            <View style={styles.trendingStat}>
  <Ionicons name="scan-outline" size={12} color="rgba(255,255,255,0.9)" />
  <Text style={styles.trendingStatText}>{item.count} scans</Text>
</View>
            {item.iconicTaxon && (
              <View style={styles.trendingCategory}>
                <Text style={styles.trendingCategoryText}>{item.iconicTaxon}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trendingCard: {
    width: 170,
    marginRight: 12,
  },
  trendingImageWrapper: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  trendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  trendingInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  trendingName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 18,
  },
  trendingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingStatText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  trendingCategory: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trendingCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
});
