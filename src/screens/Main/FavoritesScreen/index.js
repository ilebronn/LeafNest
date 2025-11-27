import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import useFavorites from '@hooks/useFavorites';
import FavoriteCard from '@components/common/Card/FavoriteCard';

export default function FavoritesScreen({ navigation }) {
  const { items, loading, refreshing, uid, loadFavorites, onRefresh, deleteSelected, clearAll } = useFavorites();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = (itemId) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const handleDeleteSelected = async () => {
    await deleteSelected(selectedItems);
    setSelectedItems(new Set());
    setSelectionMode(false);
  };

  const openItem = (item) => {
    if (selectionMode) {
      toggleItemSelection(item.id);
      return;
    }

    Alert.alert(
      item.name,
      `${item.scientificName ? `Scientific Name: ${item.scientificName}\n` : ''}` +
      `${item.rank ? `Rank: ${item.rank}\n` : ''}` +
      `${item.iconicTaxon ? `Type: ${item.iconicTaxon}\n` : ''}` +
      `${item.taxonId ? `Taxon ID: ${item.taxonId}` : ''}`,
      [{ text: 'Close' }]
    );
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.has(item.id);

    return (
      <FavoriteCard
        item={item}
        isSelected={isSelected}
        selectionMode={selectionMode}
        onPress={() => openItem(item)}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            toggleItemSelection(item.id);
          }
        }}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#5E936C', '#4A7A5A']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Favorites</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E936C" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </View>
    );
  }

  if (!uid) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#5E936C', '#4A7A5A']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Favorites</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconWrapper}>
            <LinearGradient colors={['#5E936C', '#3E704C']} style={styles.emptyIconGradient}>
              <Ionicons name="person-outline" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>Sign in Required</Text>
          <Text style={styles.emptyText}>
            Create an account or sign in to save and view your favorite species.
          </Text>
          <TouchableOpacity style={styles.signInButton} onPress={() => navigation.navigate('Profile')}>
            <LinearGradient colors={['#5E936C', '#3E704C']} style={styles.signInGradient}>
              <Text style={styles.signInText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#5E936C', '#4A7A5A']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            {selectionMode ? (
              <>
                <TouchableOpacity onPress={toggleSelectionMode} style={styles.headerButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.selectionTitle}>{selectedItems.size} Selected</Text>
                <TouchableOpacity onPress={selectAll} style={styles.headerButton}>
                  <Ionicons 
                    name={selectedItems.size === items.length ? "checkbox" : "checkbox-outline"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ width: 40 }} />
                <Text style={styles.headerTitle}>Favorites</Text>
                {items.length > 0 ? (
                  <TouchableOpacity onPress={toggleSelectionMode} style={styles.headerButton}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 40 }} />
                )}
              </>
            )}
          </View>
          
          {!selectionMode && items.length > 0 && (
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Ionicons name="heart" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.statText}>{items.length} species</Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {items.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconWrapper}>
            <LinearGradient colors={['#5E936C', '#3E704C']} style={styles.emptyIconGradient}>
              <Ionicons name="heart-outline" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyText}>
            Start exploring and tap the heart icon to save your favorite plants and animals here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#5E936C']} 
              tintColor="#5E936C" 
            />
          }
        />
      )}

      {selectionMode && selectedItems.size > 0 && (
        <View style={styles.bottomBar}>
          <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.bottomBarGradient}>
            <TouchableOpacity style={styles.bottomBarButton} onPress={handleDeleteSelected} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text style={styles.bottomBarText}>
                Delete {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {!selectionMode && items.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={clearAll} activeOpacity={0.8}>
          <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.fabGradient}>
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  listContent: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  columnWrapper: {
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  signInButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#5E936C',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  bottomBarGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  bottomBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bottomBarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#ef4444',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});