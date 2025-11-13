import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getSpeciesScans } from '../firestoreService'; // ✅ Named import

const { width } = Dimensions.get('window');
const imageSize = (width - 48) / 3; // 3 columns with padding

export default function SpeciesGalleryScreen({ route, navigation }) {
  const { species } = route.params; // Expecting: { name, taxonId, iconicTaxon, etc. }
  
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadScans = useCallback(async () => {
    try {
      setLoading(true);
      // This function needs to be created in firestoreService
      const result = await getSpeciesScans(species.taxonId, species.name);
      
      if (result.success) {
        setScans(result.data);
      } else {
        console.error('Failed to load scans:', result.error);
        setScans([]);
      }
    } catch (error) {
      console.error('Error loading species scans:', error);
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, [species]);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadScans();
    setRefreshing(false);
  };

  const handleImagePress = (scan) => {
    setSelectedImage(scan);
    setModalVisible(true);
  };

  const renderGridItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => handleImagePress(item)}
        activeOpacity={0.8}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.gridImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#E8F5E9', '#C8E6C9']}
            style={styles.gridImage}
          >
            <Ionicons name="image-outline" size={32} color="#5E936C" />
          </LinearGradient>
        )}

        {/* User info badge */}
        <View style={styles.userBadge}>
          <Text style={styles.userBadgeText} numberOfLines={1}>
            {item.userName || 'Anonymous'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ImageModal = () => {
    if (!selectedImage) return null;

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <Image
                source={{ uri: selectedImage.imageUrl }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              
              <View style={styles.modalInfo}>
                <Text style={styles.modalUsername}>
                  Scanned by {selectedImage.userName || 'Anonymous'}
                </Text>
                <Text style={styles.modalDate}>
                  {selectedImage.createdAt ? 
                    new Date(
                      typeof selectedImage.createdAt === 'object' && selectedImage.createdAt.seconds
                        ? selectedImage.createdAt.seconds * 1000
                        : selectedImage.createdAt
                    ).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                    : 'Date unknown'
                  }
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close-circle" size={36} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerInfo}>
      <Text style={styles.speciesName}>{species.name || 'Unknown Species'}</Text>
      {species.scientificName && (
        <Text style={styles.scientificName}>{species.scientificName}</Text>
      )}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="images-outline" size={18} color="#5E936C" />
          <Text style={styles.statText}>
            {scans.length} {scans.length === 1 ? 'scan' : 'scans'}
          </Text>
        </View>
        {species.iconicTaxon && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{species.iconicTaxon}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#5E936C', '#4A7A5A']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Species Gallery</Text>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E936C" />
          <Text style={styles.loadingText}>Loading scans...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#5E936C', '#4A7A5A']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Species Gallery</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {scans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Scans Yet</Text>
          <Text style={styles.emptyText}>
            Be the first to scan this species!
          </Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderGridItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.gridContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#5E936C"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ImageModal />
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
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerInfo: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  speciesName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#6B7280',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  categoryBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E936C',
  },
  gridContainer: {
    padding: 12,
  },
  gridItem: {
    width: imageSize,
    height: imageSize,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  userBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: width,
  },
  modalInfo: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12,
  },
  modalUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  closeModalButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});