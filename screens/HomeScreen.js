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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../firebase';

const { width, height } = Dimensions.get('window');

// Responsive sizing functions
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

// Device detection
const isSmallScreen = width < 375;
const isTablet = width > 600;
const isLargeTablet = width > 900;

// Responsive card dimensions
const CARD_WIDTH = isTablet ? width * 0.6 : width * 0.82;
const CARD_SPACING = (width - CARD_WIDTH) / 2;
const ITEM_SPACING = scale(16);
const RADIUS = moderateScale(22);

// ✅ Use separate keys (move to env in production)
const PEXELS_PLANTS_KEY = '4eP0VkrCmnv1mjHlLJSv28TzR6zK6rmdux1fmyr4vP1biT2NayxxLinK';
const PEXELS_ANIMALS_KEY = 'kLcMBCoaSFkMEPgLNZTpxs1s6oEGVcyuVfNVs7pf3poeKAnrtM7JdgcZ';

export default function HomeScreen({ route, navigation }) {
  const displayName = route?.params?.displayName ?? '';
  const sliderRef = useRef(null);
  const { t } = useTranslation();

  const [trendingPlants, setTrendingPlants] = useState([]);
  const [trendingAnimals, setTrendingAnimals] = useState([]);
  const [funFact, setFunFact] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  // ✅ FIX: Check Firebase auth state on mount and on route changes
  useEffect(() => {
    const user = auth.currentUser;
    const guestParam = route?.params?.guest;
    
    // User is guest only if no Firebase user OR explicitly passed as guest
    const userIsGuest = !user || guestParam === true;
    
    console.log('HomeScreen auth check:', {
      hasUser: !!user,
      userEmail: user?.email,
      guestParam,
      userIsGuest
    });
    
    setIsGuest(userIsGuest);
  }, [route?.params?.guest]);

  // Fetch Trending Data from API
  const fetchTrendingData = async () => {
    try {
      setRefreshing(true);

      // Fetch trending plants data
      const plantsResponse = await fetch('https://api.pexels.com/v1/search?query=plants&per_page=5', {
        headers: {
          'Authorization': PEXELS_PLANTS_KEY,
        },
      });
      const plantsData = await plantsResponse.json();
      setTrendingPlants(plantsData.photos);

      // Fetch trending animals data
      const animalsResponse = await fetch('https://api.pexels.com/v1/search?query=animals&per_page=5', {
        headers: {
          'Authorization': PEXELS_ANIMALS_KEY,
        },
      });
      const animalsData = await animalsResponse.json();
      setTrendingAnimals(animalsData.photos);
    } catch (error) {
      console.error('Error fetching trending data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fun Fact Generator
  const generateRandomFact = () => {
    const animalFacts = [
     'Octopuses have three hearts.',
      'Sloths can hold their breath longer than dolphins.',
      'Elephants are the only animals that can’t jump.',
      'Cows have best friends and get stressed when separated.',
      'A group of flamingos is called a "flamboyance".',
      'Dolphins have names for each other using unique whistles.',
      'Sharks existed before trees appeared on Earth.',
      'Penguins propose to mates with a pebble.',
      'A shrimp’s heart is in its head.',
      'Kangaroos can’t walk backward.',
      'Giraffes only need 30 minutes of sleep per day.',
      'Some turtles can breathe through their butts.',
      'Axolotls can regrow entire limbs and parts of their brain.',
      'Owls can rotate their heads almost 270 degrees.',
      'A cheetah can accelerate faster than most sports cars.',
      'Sea otters hold hands while they sleep to stay together.',
      'A group of porcupines is called a "prickle".',
      'Frogs can freeze solid in winter and thaw back to life.',
      'Camels have three eyelids to protect against sand.',
      'Rats and mice laugh when tickled.',
      'Sloths can live up to 30 years.',
      'Penguins mate for life.',
      'Bats are the only mammals that can fly.',
      'Bees communicate with each other by dancing.',
      'Cheetahs are the fastest land animals, capable of reaching speeds up to 70 mph.',
    ];

    const plantFacts = [
        'Bamboo can grow up to 35 inches in a single day!',
      'Sunflowers move to face the sun throughout the day.',
      'Some orchids can live up to 100 years!',
      'Bananas are technically berries, but strawberries are not.',
      'A single tree can provide oxygen for up to four people a day.',
      'The Amazon rainforest produces about 20% of the world’s oxygen.',
      'Dandelions are completely edible, from root to flower.',
      'Plants make up about 80% of Earth’s biomass.',
      'The world’s largest flower, Rafflesia, can be over 3 feet wide.',
      'Some plants, like Mimosa pudica, close their leaves when touched.',
      'A sunflower is actually made of thousands of tiny flowers.',
      'Caffeine is a natural pesticide for plants like coffee and tea.',
      'There are over 390,000 plant species known to science.',
      'Pineapples take about 2 years to fully grow.',
      'Some desert plants can live over 100 years without much water.',
      'Aloe vera can survive for months without soil or water.',
      'Mosses were among the first plants to live on land.',
      'Giant sequoias can live for more than 3,000 years.',
      'Plants communicate using chemical signals through their roots.',
      'Lotus seeds can germinate even after 1,000 years!',
      'Water lilies can survive for months in frozen ponds.',
      'Avocados are a fruit, not a vegetable.',
      'The tallest tree in the world is a Sequoia named Hyperion, standing at 379 feet.',
      'There are plants that eat meat, like the Venus flytrap.',
      'Coconut trees are technically part of the palm family, not trees.',
      'Mangoes are the most widely consumed fruit in the world.',
      'Carrots were originally purple, not orange.',
      'Strawberries aren’t actually berries, but bananas are.',
      'Plants can "hear" sound and respond to vibrations.',
    ];

    const isAnimal = Math.random() > 0.5;
    const source = isAnimal ? animalFacts : plantFacts;
    const randomFact = source[Math.floor(Math.random() * source.length)];
    setFunFact(randomFact);
  };

  // ----- "Top of the hour" timer
  const hourlyIntervalRef = React.useRef(null);

  useEffect(() => {
    // initial load
    generateRandomFact();
    fetchTrendingData();

    // schedule refresh exactly at the next hour mark, then every hour
    const now = new Date();
    const msToNextHour =
      (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();

    const toHourTimeout = setTimeout(() => {
      fetchTrendingData();
      hourlyIntervalRef.current = setInterval(fetchTrendingData, 60 * 60 * 1000);
    }, msToNextHour);

    return () => {
      clearTimeout(toHourTimeout);
      if (hourlyIntervalRef.current) clearInterval(hourlyIntervalRef.current);
    };
  }, []);

  // Render Trending Plants and Animals
  const renderTrendingItem = ({ item }) => (
    <View style={[
      styles.trendingCard,
      isTablet && styles.trendingCardTablet
    ]}>
      <Image source={{ uri: item.src.medium }} style={styles.trendingImage} />
      <Text style={[
        styles.trendingText,
        isTablet && styles.trendingTextTablet
      ]}>
        {item.alt}
      </Text>
    </View>
  );

  // Render Carousel Card
  const renderCard = ({ item }) => (
    <View style={styles.card}>
      <Image source={item.image} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardOverlay} />
      <View style={styles.cardTextWrap}>
        <Text style={[
          styles.cardTitle,
          isTablet && styles.cardTitleTablet
        ]}>
          {item.title}
        </Text>
        <Text style={[
          styles.cardSubtitle,
          isTablet && styles.cardSubtitleTablet
        ]}>
          {item.subtitle}
        </Text>
      </View>
    </View>
  );

  // Carousel Items
  const CAROUSEL_ITEMS = [
    {
      id: '1',
      title: t('home.scanPlantsTitle'),
      subtitle: t('home.scanPlantsSubtitle'),
      image: require('../assets/plant1.jpg'),
    },
    {
      id: '2',
      title: t('home.scanAnimalsTitle'),
      subtitle: t('home.scanAnimalsSubtitle'),
      image: require('../assets/animal1.jpg'),
    },
    {
      id: '3',
      title: t('home.learnNatureTitle'),
      subtitle: t('home.learnNatureSubtitle'),
      image: require('../assets/plant2.jpg'),
    },
  ];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        {/* TopBar */}
        <View style={[
          styles.topBar,
          isTablet && styles.topBarTablet
        ]}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              console.log('Navigating to Profile with guest status:', isGuest);
              navigation.navigate('Profile', { 
                displayName, 
                guest: isGuest  // ✅ Pass current guest status
              });
            }}
          >
            <Ionicons name="person-circle-outline" size={moderateScale(30)} color="#fff" />
          </TouchableOpacity>

          <Image
            source={require('../assets/logo.png')}
            style={[
              styles.logo,
              isTablet && styles.logoTablet
            ]}
            resizeMode="contain"
          />

          <TouchableOpacity
            style={styles.iconBtn} 
            onPress={() => navigation.navigate('NotificationScreen')}
          >
            <Ionicons name="notifications-outline" size={moderateScale(28)} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Scroll Content */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => {
                generateRandomFact();
              }}
              colors={['#5E936C']}
              tintColor="#5E936C"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Carousel */}
          <FlatList
            ref={sliderRef}
            data={CAROUSEL_ITEMS}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToInterval={CARD_WIDTH + ITEM_SPACING}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: CARD_SPACING }}
            snapToAlignment="start"
            style={{ flexGrow: 0, marginTop: verticalScale(100) }}
          />

          {/* Fun Fact Widget */}
          <View style={[
            styles.funFactCard,
            isTablet && styles.funFactCardTablet
          ]}>
            <View style={styles.funFactHeader}>
              <Ionicons 
                name="sparkles-outline" 
                size={moderateScale(24)} 
                color="#ffffffff" 
                style={styles.sparkleIcon}
              />
              <Text style={[
                styles.funFactTitle,
                isTablet && styles.funFactTitleTablet
              ]}>
                {t('home.funFact')}
              </Text>
            </View>

            <Text style={[
              styles.funFactText,
              isTablet && styles.funFactTextTablet
            ]}>
              {funFact}
            </Text>

            <TouchableOpacity onPress={generateRandomFact} style={styles.refreshBtn}>
              <Ionicons name="refresh-outline" size={moderateScale(30)} color="#ffffffff" />
            </TouchableOpacity>
          </View>

          {/* Trending Plants */}
          <View style={styles.trendingSection}>
            <Text style={[
              styles.trendingTitle,
              isTablet && styles.trendingTitleTablet
            ]}>
              {t('home.trendingPlants')}
            </Text>
            <FlatList
              data={trendingPlants}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderTrendingItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: scale(20) }}
            />
          </View>

          {/* Trending Animals */}
          <View style={styles.trendingSection}>
            <Text style={[
              styles.trendingTitle,
              isTablet && styles.trendingTitleTablet
            ]}>
              {t('home.trendingAnimals')}
            </Text>
            <FlatList
              data={trendingAnimals}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderTrendingItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: scale(20) }}
            />
          </View>

          <View style={{ height: verticalScale(40) }} />
        </ScrollView>

        {/* Floating Scan Button */}
        <TouchableOpacity
          style={[
            styles.fab,
            isTablet && styles.fabTablet
          ]}
          onPress={() => navigation.navigate('ScanScreen')}
        >
          <Ionicons name="scan-outline" size={moderateScale(30)} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9f9f9' },

  // Top bar
  topBar: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(30),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#5E936C',
    borderBottomLeftRadius: moderateScale(40),
    borderBottomRightRadius: moderateScale(40),
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 10,
  },
  topBarTablet: {
    paddingHorizontal: scale(40),
    paddingTop: verticalScale(30),
    paddingBottom: verticalScale(25),
  },
  logo: { 
    width: moderateScale(100), 
    height: moderateScale(250),
    position: 'absolute',
    left: '50%',
    marginLeft: moderateScale(-30),
    marginTop: moderateScale(35),
  },
  logoTablet: {
    width: moderateScale(120),
    height: moderateScale(90),
    marginLeft: moderateScale(-60),
  },
  iconBtn: { 
    width: moderateScale(44), 
    height: moderateScale(44), 
    alignItems: 'center', 
    justifyContent: 'center',
    top: 20,
  },

  // Carousel
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.8,
    borderRadius: RADIUS,
    overflow: 'hidden',
    marginRight: ITEM_SPACING,
    backgroundColor: '#ffffffff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  cardTextWrap: { 
    position: 'absolute', 
    left: scale(16), 
    right: scale(16), 
    bottom: verticalScale(16) 
  },
  cardTitle: { 
    color: '#fff', 
    fontSize: moderateScale(22), 
    fontWeight: '700', 
    marginBottom: verticalScale(4) 
  },
  cardTitleTablet: {
    fontSize: moderateScale(28),
  },
  cardSubtitle: { 
    color: '#fff', 
    fontSize: moderateScale(15), 
    opacity: 0.85 
  },
  cardSubtitleTablet: {
    fontSize: moderateScale(18),
  },

  // Fun Fact
  funFactCard: {
    marginTop: verticalScale(28),
    marginHorizontal: scale(20),
    backgroundColor: '#5E936C',
    borderRadius: moderateScale(40),
    paddingVertical: verticalScale(30),
    paddingHorizontal: scale(20),
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  funFactCardTablet: {
    marginHorizontal: scale(60),
    paddingVertical: verticalScale(40),
    paddingHorizontal: scale(40),
    maxWidth: 800,
    alignSelf: 'center',
    width: '90%',
  },
  funFactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
  },
  sparkleIcon: {
    marginRight: scale(8),
  },
  funFactTitle: {
    fontSize: moderateScale(22),
    fontWeight: '600',
    color: '#ffffffff',
  },
  funFactTitleTablet: {
    fontSize: moderateScale(26),
  },
  funFactText: {
    fontSize: moderateScale(16),
    color: '#ffffffff',
    lineHeight: moderateScale(24),
    fontWeight: '400',
    textAlign: 'center',
    marginTop: verticalScale(10),
  },
  funFactTextTablet: {
    fontSize: moderateScale(18),
    lineHeight: moderateScale(28),
  },
  refreshBtn: {
    marginTop: verticalScale(20),
    marginRight: verticalScale(-200),
    alignSelf: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(12),
  },

  // Trending Section
  trendingSection: { 
    marginTop: verticalScale(30), 
    marginHorizontal: scale(20) 
  },
  trendingTitle: {
    fontSize: moderateScale(22),
    fontWeight: '600',
    color: '#333',
    marginBottom: verticalScale(16),
    textAlign: 'center',
  },
  trendingTitleTablet: {
    fontSize: moderateScale(26),
  },
  trendingCard: { 
    width: scale(150), 
    height: scale(150), 
    marginRight: scale(16), 
    backgroundColor: '#fff', 
    borderRadius: moderateScale(16), 
    overflow: 'hidden', 
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  trendingCardTablet: {
    width: scale(200),
    height: scale(200),
  },
  trendingImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: moderateScale(16) 
  },
  trendingText: { 
    fontSize: moderateScale(14), 
    fontWeight: '600', 
    color: '#333', 
    textAlign: 'center', 
    marginTop: verticalScale(8) 
  },
  trendingTextTablet: {
    fontSize: moderateScale(16),
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    right: scale(20),
    bottom: Platform.select({ ios: verticalScale(28), android: verticalScale(20) }),
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    backgroundColor: '#5E936C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabTablet: {
    width: moderateScale(76),
    height: moderateScale(76),
    borderRadius: moderateScale(38),
    right: scale(40),
    bottom: verticalScale(40),
  },
});