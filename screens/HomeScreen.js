import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../firebase';

const { width, height } = Dimensions.get('window');

// Responsive sizing
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const isTablet = width > 600;
const CARD_WIDTH = isTablet ? width * 0.7 : width * 0.85;
const CARD_SPACING = (width - CARD_WIDTH) / 2;

const PEXELS_PLANTS_KEY = '4eP0VkrCmnv1mjHlLJSv28TzR6zK6rmdux1fmyr4vP1biT2NayxxLinK';
const PEXELS_ANIMALS_KEY = 'kLcMBCoaSFkMEPgLNZTpxs1s6oEGVcyuVfNVs7pf3poeKAnrtM7JdgcZ';

export default function HomeScreen({ route, navigation }) {
  const displayName = route?.params?.displayName ?? '';
  const sliderRef = useRef(null);
  const { t } = useTranslation();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [trendingPlants, setTrendingPlants] = useState([]);
  const [trendingAnimals, setTrendingAnimals] = useState([]);
  const [funFact, setFunFact] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    const guestParam = route?.params?.guest;
    const userIsGuest = !user || guestParam === true;
    setIsGuest(userIsGuest);
  }, [route?.params?.guest]);

  const fetchTrendingData = async () => {
    try {
      setRefreshing(true);

      const plantsResponse = await fetch('https://api.pexels.com/v1/search?query=plants&per_page=8', {
        headers: { 'Authorization': PEXELS_PLANTS_KEY },
      });
      const plantsData = await plantsResponse.json();
      setTrendingPlants(plantsData.photos);

      const animalsResponse = await fetch('https://api.pexels.com/v1/search?query=animals&per_page=8', {
        headers: { 'Authorization': PEXELS_ANIMALS_KEY },
      });
      const animalsData = await animalsResponse.json();
      setTrendingAnimals(animalsData.photos);
    } catch (error) {
      console.error('Error fetching trending data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const generateRandomFact = () => {
    const allFacts = [
      'Octopuses have three hearts.',
      'Bamboo can grow up to 35 inches in a single day!',
      'Sloths can hold their breath longer than dolphins.',
      'Sunflowers move to face the sun throughout the day.',
      'Elephants are the only animals that can\'t jump.',
      'Some orchids can live up to 100 years!',
      'Dolphins have names for each other using unique whistles.',
      'A single tree can provide oxygen for up to four people a day.',
      'Sharks existed before trees appeared on Earth.',
      'Dandelions are completely edible, from root to flower.',
      'Penguins propose to mates with a pebble.',
      'The Amazon rainforest produces about 20% of the world\'s oxygen.',
      'Sea otters hold hands while they sleep to stay together.',
      'Giant sequoias can live for more than 3,000 years.',
      'Axolotls can regrow entire limbs and parts of their brain.',
      'Plants communicate using chemical signals through their roots.',
    ];
    const randomFact = allFacts[Math.floor(Math.random() * allFacts.length)];
    setFunFact(randomFact);
  };

  useEffect(() => {
    generateRandomFact();
    fetchTrendingData();

    const now = new Date();
    const msToNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;
    const toHourTimeout = setTimeout(() => {
      fetchTrendingData();
      const interval = setInterval(fetchTrendingData, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }, msToNextHour);

    return () => clearTimeout(toHourTimeout);
  }, []);

  const CAROUSEL_ITEMS = [
    {
      id: '1',
      title: t('home.scanPlantsTitle'),
      subtitle: t('home.scanPlantsSubtitle'),
      image: require('../assets/plant1.jpg'),
      gradient: ['#4CAF50', '#2E7D32'],
      icon: 'leaf',
    },
    {
      id: '2',
      title: t('home.scanAnimalsTitle'),
      subtitle: t('home.scanAnimalsSubtitle'),
      image: require('../assets/animal1.jpg'),
      gradient: ['#FF6B6B', '#C92A2A'],
      icon: 'paw',
    },
    {
      id: '3',
      title: t('home.learnNatureTitle'),
      subtitle: t('home.learnNatureSubtitle'),
      image: require('../assets/plant2.jpg'),
      gradient: ['#4FC3F7', '#0277BD'],
      icon: 'earth',
    },
  ];

  const renderCard = ({ item, index }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      style={styles.card}
      onPress={() => navigation.navigate('ScanScreen')}
    >
      <Image source={item.image} style={styles.cardImage} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.cardGradient}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardIconWrapper}>
          <Ionicons name={item.icon} size={32} color="#fff" />
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        <View style={styles.cardAction}>
          <Text style={styles.cardActionText}>Explore Now</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTrendingItem = ({ item }) => (
    <TouchableOpacity style={styles.trendingCard} activeOpacity={0.8}>
      <Image source={{ uri: item.src.medium }} style={styles.trendingImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.trendingOverlay}
      >
        <Text style={styles.trendingText} numberOfLines={2}>
          {item.alt || 'Beautiful Nature'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#5E936C" />
        
        {/* Animated Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <LinearGradient
            colors={['#5E936C', '#4A7A5A']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <SafeAreaView edges={['top']}>
              <View style={styles.headerContent}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => navigation.navigate('Profile', { displayName, guest: isGuest })}
                >
                  <Ionicons name="person-circle-outline" size={28} color="#fff" />
                </TouchableOpacity>

                <View style={styles.logoContainer}>
                  <Image
                    source={require('../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>

                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => navigation.navigate('NotificationScreen')}
                >
                  <View style={styles.notificationBadge}>
                  </View>
                  <Ionicons name="notifications-outline" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>

        {/* Main Content */}
        <Animated.ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                generateRandomFact();
                fetchTrendingData();
              }}
              colors={['#5E936C']}
              tintColor="#5E936C"
            />
          }
        >
          {/* Hero Carousel */}
          <View style={styles.carouselSection}>
            <FlatList
              ref={sliderRef}
              data={CAROUSEL_ITEMS}
              keyExtractor={(item) => item.id}
              renderItem={renderCard}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              snapToInterval={CARD_WIDTH + 20}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: CARD_SPACING }}
              snapToAlignment="center"
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 20));
                setCurrentCardIndex(index);
              }}
            />
            
            {/* Pagination Dots */}
            <View style={styles.paginationDots}>
              {CAROUSEL_ITEMS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentCardIndex === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Fun Fact Card */}
          <View style={styles.funFactContainer}>
            <LinearGradient
              colors={['#5E936C', '#3E704C']}
              style={styles.funFactCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.funFactHeader}>
                <View style={styles.funFactIconBg}>
                  <Ionicons name="bulb" size={24} color="#FFD700" />
                </View>
                <Text style={styles.funFactTitle}>Did You Know?</Text>
              </View>
              
              <Text style={styles.funFactText}>{funFact}</Text>
              
              <TouchableOpacity
                style={styles.funFactRefresh}
                onPress={generateRandomFact}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.funFactRefreshText}>New Fact</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Trending Plants Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Trending Plants</Text>
                <Text style={styles.sectionSubtitle}>Popular in nature</Text>
              </View>
            </View>
            
            <FlatList
              data={trendingPlants}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderTrendingItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
            />
          </View>

          {/* Trending Animals Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Trending Animals</Text>
                <Text style={styles.sectionSubtitle}>Wildlife spotlight</Text>
              </View>
            </View>
            
            <FlatList
              data={trendingAnimals}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderTrendingItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
            />
          </View>

          <View style={{ height: 100 }} />
        </Animated.ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('ScanScreen')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#5E936C', '#3E704C']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="scan-outline" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 1,
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#5E936C',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 40,
  },
  scrollView: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 100 : 120,
  },
  carouselSection: {
    marginBottom: 30,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.1,
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: 10,
    backgroundColor: '#fff',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  cardIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
    lineHeight: 22,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  paginationDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  activeDot: {
    width: 24,
    backgroundColor: '#5E936C',
  },
  funFactContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  funFactCard: {
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  funFactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  funFactIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  funFactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  funFactText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 24,
    marginBottom: 20,
  },
  funFactRefresh: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  funFactRefreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E936C',
  },
  trendingList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  trendingCard: {
    width: 160,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginRight: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 12,
  },
  trendingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 30 : 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 12,
    shadowColor: '#5E936C',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});