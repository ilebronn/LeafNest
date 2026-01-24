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
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getSpeciesScans } from '@services/firebase';

const { width, height } = Dimensions.get('window');
const imageSize = (width - 32) / 3; // 3 columns with refined padding

export default function SpeciesGalleryScreen({ route, navigation }) {
  const { species } = route.params;
  
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [scrollY] = useState(new Animated.Value(0));

  const loadScans = useCallback(async () => {
    try {
      setLoading(true);
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

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Helper function to determine if species is a plant
  const isPlant = (iconicTaxon) => {
    const taxon = iconicTaxon?.toLowerCase() || '';
    return taxon.includes('plant') || taxon.includes('flora') || taxon.includes('fungi') || taxon.includes('mushroom');
  };

  // Helper function to get icon based on taxonomic group
  const getTaxonIcon = (iconicTaxon) => {
    const taxon = iconicTaxon?.toLowerCase() || '';
    
    if (taxon.includes('plant') || taxon.includes('flora')) return 'leaf';
    if (taxon.includes('bird') || taxon.includes('aves')) return 'fitness';
    if (taxon.includes('insect') || taxon.includes('insecta')) return 'bug';
    if (taxon.includes('mammal') || taxon.includes('mammalia')) return 'paw';
    if (taxon.includes('reptil') || taxon.includes('reptilia')) return 'skull';
    if (taxon.includes('amphibi') || taxon.includes('amphibia')) return 'water';
    if (taxon.includes('fish') || taxon.includes('pisces')) return 'fish';
    if (taxon.includes('fungi') || taxon.includes('mushroom')) return 'nutrition';
    if (taxon.includes('mollusc') || taxon.includes('mollusca')) return 'moon';
    if (taxon.includes('arachnid') || taxon.includes('spider')) return 'bug-outline';
    
    return 'leaf-outline';
  };

  const renderGridItem = ({ item, index }) => {
    const itemIcon = getTaxonIcon(species.iconicTaxon);
    
    return (
      <TouchableOpacity
        style={[styles.gridItem, { animationDelay: `${index * 50}ms` }]}
        onPress={() => handleImagePress(item)}
        activeOpacity={0.7}
      >
        {item.imageUrl ? (
          <>
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.gridImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
          </>
        ) : (
          <View style={styles.placeholderImage}>
            <LinearGradient
              colors={['#E8F5E9', '#C8E6C9']}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name={itemIcon} size={28} color="#5E936C" />
          </View>
        )}

        <View style={styles.userBadge}>
          <View style={styles.userAvatarPlaceholder}>
            <Text style={styles.userInitial}>
              {(item.userName || 'A').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ImageModal = () => {
    if (!selectedImage) return null;

    const modalIcon = getTaxonIcon(species.iconicTaxon);

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
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
              
              <BlurView intensity={80} tint="dark" style={styles.modalInfoBlur}>
                <View style={styles.modalInfoContent}>
                  <View style={styles.modalUserInfo}>
                    <View style={styles.modalAvatar}>
                      <Text style={styles.modalAvatarText}>
                        {(selectedImage.userName || 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.modalTextContainer}>
                      <Text style={styles.modalUsername}>
                        {selectedImage.userName || 'Anonymous'}
                      </Text>
                      <Text style={styles.modalDate}>
                        {selectedImage.createdAt ? 
                          new Date(
                            typeof selectedImage.createdAt === 'object' && selectedImage.createdAt.seconds
                              ? selectedImage.createdAt.seconds * 1000
                              : selectedImage.createdAt
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                          : 'Date unknown'
                        }
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalSpeciesTag}>
                    <Ionicons name={modalIcon} size={14} color="#5E936C" />
                    <Text style={styles.modalSpeciesText}>{species.name}</Text>
                  </View>
                </View>
              </BlurView>

              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <BlurView intensity={60} tint="dark" style={styles.closeButtonBlur}>
                  <Ionicons name="close" size={24} color="#fff" />
                </BlurView>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerInfo}>
      <View style={styles.speciesTitleContainer}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#2D5016', '#4A7C59']}
            style={styles.iconGradient}
          >
            <Ionicons 
              name={getTaxonIcon(species.iconicTaxon)} 
              size={24} 
              color="#fff" 
            />
          </LinearGradient>
        </View>
        <View style={styles.titleTextContainer}>
          <Text style={styles.speciesName}>{species.name || 'Unknown Species'}</Text>
          {species.scientificName && species.scientificName !== species.name && (
            <Text style={styles.scientificName}>{species.scientificName}</Text>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="images" size={20} color="#6B8E23" />
          </View>
          <Text style={styles.statNumber}>{scans.length}</Text>
          <Text style={styles.statLabel}>Public Scans</Text>
        </View>

        {species.iconicTaxon && (
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(156, 204, 101, 0.15)' }]}>
              <Ionicons name={getTaxonIcon(species.iconicTaxon)} size={20} color="#9CCC65" />
            </View>
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>{species.iconicTaxon}</Text>
          </View>
        )}

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: 'rgba(129, 199, 132, 0.15)' }]}>
            <Ionicons name="people" size={20} color="#81C784" />
          </View>
          <Text style={styles.statNumber}>
            {new Set(scans.map(s => s.userId)).size}
          </Text>
          <Text style={styles.statLabel}>Contributors</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient 
          colors={['#5E936C', '#4A7A5A']} 
          style={styles.header}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Species Gallery</Text>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E936C" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#2D5016', '#1A2E0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Animated Header Background */}
      <Animated.View style={[styles.headerBackdrop, { opacity: headerOpacity }]}>
        <LinearGradient 
          colors={['#2D5016', '#4A7C59']} 
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Fixed Header */}
      <SafeAreaView edges={['top']} style={styles.fixedHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Animated.Text style={[styles.headerTitle, { opacity: headerOpacity }]}>
            {species.name}
          </Animated.Text>
        </View>
      </SafeAreaView>

      {scans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={['rgba(107, 142, 35, 0.3)', 'rgba(107, 142, 35, 0.1)']}
            style={styles.emptyIconContainer}
          >
            <Ionicons 
              name={isPlant(species.iconicTaxon) ? "leaf-outline" : "paw-outline"} 
              size={48} 
              color="rgba(255, 255, 255, 0.5)" 
            />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Scans Yet</Text>
          <Text style={styles.emptyText}>
            Be the first to document this species!{'\n'}
            Start scanning to contribute to the gallery.
          </Text>
          <TouchableOpacity style={styles.scanButton} activeOpacity={0.8}>
            <LinearGradient
              colors={['#2D5016', '#4A7C59']}
              style={styles.scanButtonGradient}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.scanButtonText}>Start Scanning</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.FlatList
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
              tintColor="#8BC34A"
              progressViewOffset={100}
            />
          }
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      )}

      <ImageModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A2E0A',
  },
  headerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 100 : 80,
    zIndex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerInfo: {
    backgroundColor: 'rgba(45, 80, 22, 0.5)',
    marginTop: Platform.OS === 'ios' ? 110 : 90,
    marginBottom: 16,
    borderRadius: 24,
    marginHorizontal: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  speciesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    marginRight: 16,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D5016',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  titleTextContainer: {
    flex: 1,
  },
  speciesName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  scientificName: {
    fontSize: 15,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(107, 142, 35, 0.15)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.25)',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(107, 142, 35, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  gridContainer: {
    paddingHorizontal: 8,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  gridItem: {
    width: imageSize,
    height: imageSize,
    margin: 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(45, 80, 22, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 80, 22, 0.4)',
  },
  userBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
  },
  userAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2D5016',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 195, 74, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  userInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8BC34A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A2E0A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
    backgroundColor: '#1A2E0A',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(107, 142, 35, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.3)',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  scanButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#2D5016',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalBackground: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: height * 0.7,
  },
  modalInfoBlur: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalInfoContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5E936C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalTextContainer: {
    flex: 1,
  },
  modalUsername: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  modalDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalSpeciesTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(94, 147, 108, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  modalSpeciesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  closeModalButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  closeButtonBlur: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});