// screens/Stats/ScanStatsScreen/index.js - WITH CLAIMABLE BADGES (FIXED)
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { getScanStats, getScanHistory, getDailyScanData } from '@services/scanning/scanStatsService';
import { 
  ACHIEVEMENT_BORDERS, 
  claimBorder, 
  setActiveBorder, 
  getClaimedBorders, 
  getActiveBorder,
} from '@services/rewards/borderRewardService';
import { 
  ACHIEVEMENT_BADGES,
  claimBadge,
  setActiveBadge,
  getClaimedBadges,
  getActiveBadge,
} from '@services/rewards/badgeRewardService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive utilities
const isSmallDevice = SCREEN_WIDTH < 375;
const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
const isLargeDevice = SCREEN_WIDTH >= 414;
const isTablet = SCREEN_WIDTH >= 768;

const scale = (size) => {
  const baseWidth = 375;
  return (SCREEN_WIDTH / baseWidth) * size;
};

const moderateScale = (size, factor = 0.5) => {
  return size + (scale(size) - size) * factor;
};

export default function ScanStatsScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [isGuest, setIsGuest] = useState(false);
  const [dimensions, setDimensions] = useState({
    window: Dimensions.get('window'),
    screen: Dimensions.get('screen'),
  });
  const [claimedBorders, setClaimedBorders] = useState([]);
  const [activeBorder, setActiveBorderState] = useState(null);
  const [claimedBadges, setClaimedBadges] = useState([]);
  const [activeBadge, setActiveBadgeState] = useState(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      setDimensions({ window, screen });
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (!userId || userId === 'guest') {
      setIsGuest(true);
      setIsLoading(false);
      return;
    }
    
    setIsGuest(false);
    loadAllData();
  }, [userId, selectedPeriod]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const statsResult = await getScanStats(userId);
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      const historyResult = await getScanHistory(userId, 50);
      if (historyResult.success) {
        const uniqueScans = [];
        const seen = new Set();

        for (const scan of historyResult.data) {
          const key = scan.taxonId 
            ? `taxon_${scan.taxonId}` 
            : (scan.plantName || scan.speciesName || '').toLowerCase().trim();

          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueScans.push(scan);
          }

          if (uniqueScans.length >= 10) break;
        }

        setRecentScans(uniqueScans);
      }

      const days = selectedPeriod === 'week' ? 7 : 30;
      const chartResult = await getDailyScanData(userId, days);
      if (chartResult.success) {
        setChartData(chartResult.data);
      }

      // Load reward data
      await loadRewardData();
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRewardData = async () => {
    try {
      // Load borders
      const claimedBordersResult = await getClaimedBorders(userId);
      if (claimedBordersResult.success) {
        setClaimedBorders(claimedBordersResult.borders);
      }

      const activeBorderResult = await getActiveBorder(userId);
      if (activeBorderResult.success) {
        setActiveBorderState(activeBorderResult.border);
      }

      // Load badges
      const claimedBadgesResult = await getClaimedBadges(userId);
      if (claimedBadgesResult.success) {
        setClaimedBadges(claimedBadgesResult.badges);
      }

      const activeBadgeResult = await getActiveBadge(userId);
      if (activeBadgeResult.success) {
        setActiveBadgeState(activeBadgeResult.badge);
      }
    } catch (error) {
      console.error('Error loading reward data:', error);
    }
  };

  const handleClaimBorder = async (borderId) => {
    const result = await claimBorder(userId, borderId);
    if (result.success) {
      setClaimedBorders([...claimedBorders, borderId]);
      Alert.alert('🎉 Border Unlocked!', 'You can now use this border on your profile!');
    } else {
      Alert.alert('Error', result.error || 'Failed to claim border');
    }
  };

  const handleSetActiveBorder = async (borderId) => {
    const result = await setActiveBorder(userId, borderId);
    if (result.success) {
      const border = ACHIEVEMENT_BORDERS[borderId];
      setActiveBorderState(border);
      Alert.alert('✅ Border Applied!', 'Your profile border has been updated.');
    } else {
      Alert.alert('Error', result.error || 'Failed to set border');
    }
  };

  const handleClaimBadge = async (badgeId) => {
    const result = await claimBadge(userId, badgeId);
    if (result.success) {
      setClaimedBadges([...claimedBadges, badgeId]);
      Alert.alert('🎉 Badge Unlocked!', 'You can now display this badge on your profile!');
    } else {
      Alert.alert('Error', result.error || 'Failed to claim badge');
    }
  };

  const handleSetActiveBadge = async (badgeId) => {
    const result = await setActiveBadge(userId, badgeId);
    if (result.success) {
      const badge = ACHIEVEMENT_BADGES[badgeId];
      setActiveBadgeState(badge);
      Alert.alert('✅ Badge Applied!', 'Your profile badge has been updated.');
    } else {
      Alert.alert('Error', result.error || 'Failed to set badge');
    }
  };

  const getScanIcon = (scan) => {
    const speciesName = (scan.plantName || scan.speciesName || '').toLowerCase();
    const iconicTaxon = (scan.iconicTaxon || scan.iconicTaxonName || '').toLowerCase();
    
    const animalKeywords = [
      'panda', 'cat', 'dog', 'goat', 'panthera', 'pardus', 'lion', 'tiger',
      'elephant', 'monkey', 'bear', 'wolf', 'fox', 'deer', 'rabbit', 'mouse',
      'rat', 'horse', 'cow', 'pig', 'sheep', 'chicken', 'duck', 'bird',
      'fish', 'shark', 'whale', 'dolphin', 'snake', 'lizard', 'frog',
      'toad', 'turtle', 'crocodile', 'alligator', 'insect', 'butterfly',
      'moth', 'bee', 'ant', 'spider', 'mammal', 'aves', 'reptil', 'amphibi',
      'human', 'homo sapiens', 'darwin', 'slipper'
    ];
    
    const isAnimal = animalKeywords.some(keyword => 
      speciesName.includes(keyword) || iconicTaxon.includes(keyword)
    ) || iconicTaxon.includes('animal') || 
       iconicTaxon.includes('mammalia') || 
       iconicTaxon.includes('aves') ||
       scan.scanType === 'animal' || 
       scan.type === 'animal' ||
       scan.category === 'animal';

    if (speciesName.includes('panda')) {
      return { icon: 'paw', color: '#000000', backgroundColor: '#F0F0F0' };
    }
    if (speciesName.includes('cat') || speciesName.includes('panthera') || speciesName.includes('pardus')) {
      return { icon: 'paw', color: '#FF6B6B', backgroundColor: '#FFE5E5' };
    }
    if (speciesName.includes('bird') || iconicTaxon.includes('aves')) {
      return { icon: 'fitness', color: '#2196F3', backgroundColor: '#E3F2FD' };
    }
    if (speciesName.includes('fish') || iconicTaxon.includes('pisces')) {
      return { icon: 'fish', color: '#00BCD4', backgroundColor: '#E0F7FA' };
    }
    if (speciesName.includes('insect') || speciesName.includes('butterfly')) {
      return { icon: 'bug', color: '#9C27B0', backgroundColor: '#F3E5F5' };
    }
    if (speciesName.includes('reptil') || speciesName.includes('snake') || speciesName.includes('lizard') || speciesName.includes('darwin')) {
      return { icon: 'skull', color: '#795548', backgroundColor: '#EFEBE9' };
    }
    if (speciesName.includes('frog') || speciesName.includes('toad') || iconicTaxon.includes('amphibi')) {
      return { icon: 'water', color: '#4CAF50', backgroundColor: '#E8F5E9' };
    }
    if (speciesName.includes('human') || speciesName.includes('homo')) {
      return { icon: 'person', color: '#FF9800', backgroundColor: '#FFF3E0' };
    }
    if (speciesName.includes('goat')) {
      return { icon: 'paw', color: '#8D6E63', backgroundColor: '#EFEBE9' };
    }
    if (speciesName.includes('slipper') || speciesName.includes('troglodytes')) {
      return { icon: 'leaf', color: '#7B1FA2', backgroundColor: '#F3E5F5' };
    }

    if (isAnimal) {
      return { icon: 'paw', color: '#FF6B6B', backgroundColor: '#FFE5E5' };
    }

    if (iconicTaxon.includes('fungi') || speciesName.includes('mushroom')) {
      return { icon: 'nutrition', color: '#8B4513', backgroundColor: '#FFF3E0' };
    }
    
    if (speciesName.includes('rosa') || speciesName.includes('hibiscus') || 
        speciesName.includes('flower') || iconicTaxon.includes('magnoliopsida')) {
      return { icon: 'flower', color: '#E91E63', backgroundColor: '#FCE4EC' };
    }
    if (speciesName.includes('maranta') || speciesName.includes('asclepiad')) {
      return { icon: 'leaf', color: '#4CAF50', backgroundColor: '#E8F5E9' };
    }

    return { icon: 'leaf', color: '#5E936C', backgroundColor: '#E8F5E9' };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChartConfig = () => ({
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(94, 147, 108, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.6})`,
    style: { borderRadius: moderateScale(16) },
    propsForDots: {
      r: isSmallDevice ? '4' : '5',
      strokeWidth: '2',
      stroke: '#5E936C',
    },
  });

  const getResponsiveStyles = () => {
    const currentWidth = dimensions.window.width;
    const horizontalPadding = isTablet ? 40 : isSmallDevice ? 16 : 20;
    
    // Calculate card width to ensure proper fit
    const gap = 12;
    const cardColumns = isTablet ? 4 : 2;
    const totalGaps = gap * (cardColumns - 1);
    const availableWidth = currentWidth - (horizontalPadding * 2) - totalGaps;
    const cardWidth = availableWidth / cardColumns;

    return {
      horizontalPadding,
      cardWidth,
      cardColumns,
      gap,
    };
  };

  const responsiveStyles = getResponsiveStyles();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#5E936C', '#4A7C59']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={[styles.loadingText, { fontSize: moderateScale(16) }]}>
          Loading your stats...
        </Text>
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient 
          colors={['#5E936C', '#4A7C59']} 
          style={[styles.guestHeader, { height: isTablet ? 250 : 200 }]} 
        />
        
        <View style={[styles.guestContent, { 
          paddingHorizontal: responsiveStyles.horizontalPadding,
          marginTop: isTablet ? -125 : -100 
        }]}>
          <View style={styles.guestIconContainer}>
            <LinearGradient 
              colors={['#E8F5E9', '#C8E6C9']} 
              style={[styles.guestIconGradient, {
                width: moderateScale(140),
                height: moderateScale(140),
                borderRadius: moderateScale(70),
              }]}
            >
              <Ionicons name="lock-closed" size={moderateScale(60)} color="#5E936C" />
            </LinearGradient>
          </View>
          <Text style={[styles.guestTitle, { 
            fontSize: moderateScale(28),
            maxWidth: isTablet ? 600 : '100%'
          }]}>
            Sign In to Track Stats
          </Text>
          <Text style={[styles.guestMessage, { 
            fontSize: moderateScale(16),
            maxWidth: isTablet ? 500 : '100%'
          }]}>
            Create an account to view detailed scan statistics, track your progress, and unlock achievements!
          </Text>
          <TouchableOpacity 
            style={[styles.modernSignInButton, {
              maxWidth: isTablet ? 400 : '100%',
              width: '100%'
            }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#5E936C', '#4A7C59']} style={styles.signInGradient}>
              <Text style={[styles.signInButtonText, { fontSize: moderateScale(17) }]}>
                Get Started
              </Text>
              <Ionicons name="arrow-forward" size={moderateScale(20)} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.backTextButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={[styles.backTextButtonText, { fontSize: moderateScale(15) }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Achievements with both borders and badges
  const achievements = [
    { 
      id: 'beginner', 
      name: 'Beginner', 
      goal: '10 scans', 
      icon: 'star',
      current: stats?.totalScans || 0,
      target: 10,
      color: '#FFD700',
      type: 'both',
    },
    { 
      id: 'explorer', 
      name: 'Explorer', 
      goal: '50 scans', 
      icon: 'trophy',
      current: stats?.totalScans || 0,
      target: 50,
      color: '#FFD700',
      type: 'both',
    },
    { 
      id: 'collector', 
      name: 'Collector', 
      goal: '25 species', 
      icon: 'sparkles',
      current: stats?.uniqueSpecies || 0,
      target: 25,
      color: '#FFD700',
      type: 'both',
    },
    { 
      id: 'streak', 
      name: 'Streak', 
      goal: '7 in a week', 
      icon: 'flame',
      current: stats?.weekScans || 0,
      target: 7,
      color: '#FF4500',
      type: 'both',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Modern Gradient Header */}
      <LinearGradient 
        colors={['#5E936C', '#4A7C59']} 
        style={[styles.modernHeader, {
          paddingTop: Platform.OS === 'ios' ? (isTablet ? 80 : 60) : (isTablet ? 60 : 40),
        }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={[styles.modernBackButton, {
              width: moderateScale(44),
              height: moderateScale(44),
              borderRadius: moderateScale(22),
            }]}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={moderateScale(28)} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerSubtitle, { fontSize: moderateScale(13) }]}>
              Your Progress
            </Text>
            <Text style={[styles.headerTitle, { fontSize: moderateScale(28) }]}>
              Statistics
            </Text>
          </View>
          <View style={{ width: moderateScale(44) }} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, {
          paddingHorizontal: responsiveStyles.horizontalPadding,
        }]}
      >
        {/* Hero Stats Card */}
        <View style={[styles.heroCard, {
          borderRadius: moderateScale(24),
        }]}>
          <LinearGradient colors={['#5E936C', '#4A7C59']} style={[styles.heroGradient, {
            padding: isTablet ? 32 : moderateScale(24),
          }]}>
            <View style={styles.heroContent}>
              <View style={styles.heroMain}>
                <Text style={[styles.heroLabel, { fontSize: moderateScale(14) }]}>
                  Total Scans
                </Text>
                <Text style={[styles.heroValue, { 
                  fontSize: isTablet ? 80 : moderateScale(64),
                  lineHeight: isTablet ? 84 : moderateScale(68),
                }]}>
                  {stats?.totalScans || 0}
                </Text>
                <Text style={[styles.heroSubtext, { fontSize: moderateScale(15) }]}>
                  lifetime discoveries
                </Text>
              </View>
              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <Ionicons name="trending-up" size={moderateScale(20)} color="rgba(255,255,255,0.9)" />
                  <Text style={[styles.heroStatValue, { fontSize: moderateScale(24) }]}>
                    {stats?.weekScans || 0}
                  </Text>
                  <Text style={[styles.heroStatLabel, { fontSize: moderateScale(12) }]}>
                    This Week
                  </Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Ionicons name="planet-outline" size={moderateScale(20)} color="rgba(255,255,255,0.9)" />
                  <Text style={[styles.heroStatValue, { fontSize: moderateScale(24) }]}>
                    {stats?.uniqueSpecies || 0}
                  </Text>
                  <Text style={[styles.heroStatLabel, { fontSize: moderateScale(12) }]}>
                    Species
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Stats Grid */}
        <View style={[styles.quickStatsGrid, {
          flexDirection: isTablet ? 'row' : 'row',
          gap: 12,
        }]}>
          <View style={[styles.quickStatCard, {
            borderRadius: moderateScale(20),
            padding: moderateScale(20),
          }]}>
            <View style={[styles.quickStatIcon, {
              width: moderateScale(56),
              height: moderateScale(56),
              borderRadius: moderateScale(28),
              backgroundColor: '#E3F2FD'
            }]}>
              <Ionicons name="calendar-outline" size={moderateScale(24)} color="#2196F3" />
            </View>
            <Text style={[styles.quickStatValue, { fontSize: moderateScale(28) }]}>
              {stats?.monthScans || 0}
            </Text>
            <Text style={[styles.quickStatLabel, { fontSize: moderateScale(13) }]}>
              This Month
            </Text>
          </View>

          <View style={[styles.quickStatCard, {
            borderRadius: moderateScale(20),
            padding: moderateScale(20),
          }]}>
            <View style={[styles.quickStatIcon, {
              width: moderateScale(56),
              height: moderateScale(56),
              borderRadius: moderateScale(28),
              backgroundColor: '#F3E5F5'
            }]}>
              <Ionicons name="today-outline" size={moderateScale(24)} color="#9C27B0" />
            </View>
            <Text style={[styles.quickStatValue, { fontSize: moderateScale(28) }]}>
              {stats?.todayScans || 0}
            </Text>
            <Text style={[styles.quickStatLabel, { fontSize: moderateScale(13) }]}>
              Today
            </Text>
          </View>
        </View>

        {/* Chart Section */}
        {chartData && chartData.length > 0 && (
          <View style={styles.chartSection}>
            <View style={styles.chartHeader}>
              <Text style={[styles.sectionTitle, { fontSize: moderateScale(22) }]}>
                Activity
              </Text>
              <View style={[styles.modernPeriodSelector, {
                borderRadius: moderateScale(12),
              }]}>
                <TouchableOpacity
                  style={[styles.periodTab, 
                    { 
                      paddingHorizontal: moderateScale(20),
                      paddingVertical: moderateScale(8),
                      borderRadius: moderateScale(10),
                    },
                    selectedPeriod === 'week' && styles.periodTabActive
                  ]}
                  onPress={() => setSelectedPeriod('week')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.periodTabText, 
                    { fontSize: moderateScale(14) },
                    selectedPeriod === 'week' && styles.periodTabTextActive
                  ]}>
                    Week
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodTab,
                    {
                      paddingHorizontal: moderateScale(20),
                      paddingVertical: moderateScale(8),
                      borderRadius: moderateScale(10),
                    },
                    selectedPeriod === 'month' && styles.periodTabActive
                  ]}
                  onPress={() => setSelectedPeriod('month')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.periodTabText,
                    { fontSize: moderateScale(14) },
                    selectedPeriod === 'month' && styles.periodTabTextActive
                  ]}>
                    Month
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.modernChartContainer, {
              borderRadius: moderateScale(20),
              padding: moderateScale(16),
            }]}>
              <LineChart
                data={{
                  labels: selectedPeriod === 'week' 
                    ? chartData.map(d => d.date)
                    : chartData.filter((_, i) => i % 5 === 0 || i === chartData.length - 1).map(d => d.date),
                  datasets: [{
                    data: chartData.map(d => d.scans).length > 0 ? chartData.map(d => d.scans) : [0]
                  }]
                }}
                width={dimensions.window.width - (responsiveStyles.horizontalPadding * 2) - (moderateScale(16) * 2)}
                height={isTablet ? 250 : 200}
                chartConfig={getChartConfig()}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={false}
                withVerticalLabels={selectedPeriod === 'week'}
                withHorizontalLabels={true}
                fromZero={true}
                segments={4}
              />
            </View>
          </View>
        )}

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={[styles.sectionTitle, { fontSize: moderateScale(22) }]}>
                Recent Discoveries
              </Text>
              <View style={[styles.countBadge, {
                paddingHorizontal: moderateScale(12),
                paddingVertical: moderateScale(6),
                borderRadius: moderateScale(12),
              }]}>
                <Text style={[styles.countBadgeText, { fontSize: moderateScale(13) }]}>
                  {recentScans.length}
                </Text>
              </View>
            </View>

            <View style={styles.scansList}>
              {recentScans.map((scan, index) => {
                const iconData = getScanIcon(scan);
                return (
                  <TouchableOpacity 
                    key={scan.id || index} 
                    style={[styles.modernScanItem, {
                      borderRadius: moderateScale(18),
                      padding: moderateScale(16),
                    }]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modernScanIcon, { 
                      width: moderateScale(56),
                      height: moderateScale(56),
                      borderRadius: moderateScale(28),
                      backgroundColor: iconData.backgroundColor 
                    }]}>
                      <Ionicons name={iconData.icon} size={moderateScale(26)} color={iconData.color} />
                    </View>
                    <View style={styles.modernScanContent}>
                      <Text style={[styles.modernScanName, { fontSize: moderateScale(16) }]} numberOfLines={1}>
                        {scan.plantName || scan.speciesName || 'Unknown Species'}
                      </Text>
                      <Text style={[styles.modernScanDate, { fontSize: moderateScale(13) }]}>
                        {formatDate(scan.timestamp)}
                      </Text>
                    </View>
                    {scan.confidence && (
                      <View style={[styles.modernConfidenceBadge, {
                        paddingHorizontal: moderateScale(12),
                        paddingVertical: moderateScale(6),
                        borderRadius: moderateScale(12),
                      }]}>
                        <Text style={[styles.modernConfidenceText, { fontSize: moderateScale(13) }]}>
                          {Math.round(scan.confidence)}%
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Achievements with Borders & Badges (FIXED) */}
        <View style={styles.achievementsSection}>
          <Text style={[styles.sectionTitle, { fontSize: moderateScale(22) }]}>
            Achievements & Rewards
          </Text>
          
          <View style={[styles.modernAchievementGrid, {
            marginTop: moderateScale(16),
          }]}>
            {achievements.map((achievement, index) => {
              const isUnlocked = achievement.current >= achievement.target;
              const borderClaimed = claimedBorders.includes(achievement.id);
              const badgeClaimed = claimedBadges.includes(achievement.id);
              const borderActive = activeBorder?.id === achievement.id;
              const badgeActive = activeBadge?.id === achievement.id;
              
              // ✅ FIX: Add safety checks for border and badge
              const border = ACHIEVEMENT_BORDERS[achievement.id];
              const badge = ACHIEVEMENT_BADGES[achievement.id];
              
              // ✅ FIX: Validate border has colors array
              const borderColors = border?.colors && Array.isArray(border.colors) 
                ? border.colors 
                : ['#FFD700', '#FFA500']; // Fallback colors

              const isLastInRow = (index + 1) % responsiveStyles.cardColumns === 0;

              return (
                <View 
                  key={achievement.id}
                  style={[
                    styles.modernAchievementCard,
                    {
                      width: responsiveStyles.cardWidth,
                      borderRadius: moderateScale(20),
                      padding: moderateScale(16),
                      marginRight: isLastInRow ? 0 : responsiveStyles.gap,
                      marginBottom: responsiveStyles.gap,
                    },
                    isUnlocked && styles.achievementUnlocked,
                    (borderActive || badgeActive) && styles.achievementActive
                  ]}
                >
                  {/* ✅ FIX: Border Preview with safety check */}
                  {border && borderColors && (
                    <View style={[styles.borderPreview, {
                      height: moderateScale(6),
                      borderRadius: moderateScale(3),
                      marginBottom: moderateScale(10),
                    }]}>
                      <LinearGradient 
                        colors={borderColors} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 1 }} 
                        style={[
                          styles.borderPreviewGradient,
                          !isUnlocked && styles.borderPreviewLocked
                        ]} 
                      />
                    </View>
                  )}

                  <View style={[styles.achievementIconContainer, {
                    width: moderateScale(64),
                    height: moderateScale(64),
                    borderRadius: moderateScale(32),
                    marginBottom: moderateScale(10),
                  }]}>
                    <Ionicons 
                      name={isUnlocked ? achievement.icon : `${achievement.icon}-outline`} 
                      size={moderateScale(32)} 
                      color={isUnlocked ? achievement.color : "#D0D0D0"} 
                    />
                  </View>
                  
                  <Text style={[styles.achievementName, { 
                    fontSize: moderateScale(15),
                    marginBottom: moderateScale(2),
                  }]} numberOfLines={1}>
                    {achievement.name}
                  </Text>
                  
                  <Text style={[styles.achievementGoal, { 
                    fontSize: moderateScale(12),
                    marginBottom: moderateScale(10),
                  }]} numberOfLines={1}>
                    {achievement.goal}
                  </Text>
                  
                  <View style={[styles.achievementProgressBar, {
                    height: moderateScale(5),
                    borderRadius: moderateScale(2.5),
                    marginBottom: moderateScale(6),
                  }]}>
                    <View style={[styles.achievementProgressFill, { 
                      width: `${Math.min((achievement.current / achievement.target) * 100, 100)}%`,
                      backgroundColor: isUnlocked ? achievement.color : '#5E936C',
                      borderRadius: moderateScale(2.5),
                    }]} />
                  </View>
                  
                  <Text style={[styles.achievementCount, { 
                    fontSize: moderateScale(11),
                    marginBottom: moderateScale(10),
                  }]}>
                    {Math.min(achievement.current, achievement.target)}/{achievement.target}
                  </Text>

                  {/* ✅ FIX: Reward Buttons with safety checks */}
                  {isUnlocked && (
                    <View style={[styles.rewardButtons, {
                      gap: moderateScale(6),
                    }]}>
                      {/* Border Button */}
                      {border && !borderClaimed && (
                        <TouchableOpacity 
                          style={[styles.claimButton, { 
                            paddingVertical: moderateScale(8),
                            borderRadius: moderateScale(10),
                          }]}
                          onPress={() => handleClaimBorder(achievement.id)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient 
                            colors={borderColors} 
                            style={styles.claimButtonGradient}
                          >
                            <Ionicons name="star-outline" size={moderateScale(12)} color="#fff" />
                            <Text style={[styles.claimButtonText, { fontSize: moderateScale(11) }]}>
                              Border
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                      
                      {border && borderClaimed && borderActive && (
                        <View style={[styles.activeBadgeSmall, { 
                          paddingVertical: moderateScale(6),
                          paddingHorizontal: moderateScale(8),
                          borderRadius: moderateScale(10),
                        }]}>
                          <Ionicons name="checkmark-circle" size={moderateScale(12)} color={achievement.color} />
                          <Text style={[styles.activeBadgeTextSmall, { fontSize: moderateScale(10) }]}>
                            Active
                          </Text>
                        </View>
                      )}
                      
                      {border && borderClaimed && !borderActive && (
                        <TouchableOpacity 
                          style={[styles.useButtonSmall, { 
                            paddingVertical: moderateScale(6),
                            paddingHorizontal: moderateScale(8),
                            borderRadius: moderateScale(10),
                            backgroundColor: '#F0F0F0'
                          }]}
                          onPress={() => handleSetActiveBorder(achievement.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="star" size={moderateScale(12)} color="#5E936C" />
                          <Text style={[styles.useButtonTextSmall, { fontSize: moderateScale(10) }]}>
                            Use
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Badge Button */}
                      {badge && !badgeClaimed && (
                        <TouchableOpacity 
                          style={[styles.claimButton, { 
                            paddingVertical: moderateScale(8),
                            borderRadius: moderateScale(10),
                          }]}
                          onPress={() => handleClaimBadge(achievement.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.claimButtonSolid, {
                            backgroundColor: badge.color || '#5E936C',
                            borderRadius: moderateScale(10),
                          }]}>
                            <Ionicons name={badge.icon || 'ribbon'} size={moderateScale(12)} color="#fff" />
                            <Text style={[styles.claimButtonText, { fontSize: moderateScale(11) }]}>
                              Badge
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      
                      {badge && badgeClaimed && badgeActive && (
                        <View style={[styles.activeBadgeSmall, { 
                          paddingVertical: moderateScale(6),
                          paddingHorizontal: moderateScale(8),
                          borderRadius: moderateScale(10),
                        }]}>
                          <Ionicons name="checkmark-circle" size={moderateScale(12)} color={achievement.color} />
                          <Text style={[styles.activeBadgeTextSmall, { fontSize: moderateScale(10) }]}>
                            Active
                          </Text>
                        </View>
                      )}
                      
                      {badge && badgeClaimed && !badgeActive && (
                        <TouchableOpacity 
                          style={[styles.useButtonSmall, { 
                            paddingVertical: moderateScale(6),
                            paddingHorizontal: moderateScale(8),
                            borderRadius: moderateScale(10),
                            backgroundColor: '#F0F0F0'
                          }]}
                          onPress={() => handleSetActiveBadge(achievement.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name={badge.icon || 'ribbon'} size={moderateScale(12)} color="#5E936C" />
                          <Text style={[styles.useButtonTextSmall, { fontSize: moderateScale(10) }]}>
                            Use
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: isTablet ? 80 : 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modernHeader: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernBackButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerSubtitle: {
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  heroCard: {
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#5E936C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  heroGradient: {},
  heroContent: {
    gap: 20,
  },
  heroMain: {
    alignItems: 'center',
  },
  heroLabel: {
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroValue: {
    fontWeight: '800',
    color: '#fff',
  },
  heroSubtext: {
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatValue: {
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  heroStatLabel: {
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  heroStatDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickStatIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickStatValue: {
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontWeight: '500',
    color: '#888',
  },
  chartSection: {
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modernPeriodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    padding: 3,
  },
  periodTab: {},
  periodTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  periodTabText: {
    fontWeight: '600',
    color: '#888',
  },
  periodTabTextActive: {
    color: '#1A1A1A',
  },
  modernChartContainer: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chart: {
    borderRadius: 16,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  countBadge: {
    backgroundColor: '#5E936C',
  },
  countBadgeText: {
    fontWeight: '700',
    color: '#fff',
  },
  scansList: {
    gap: 10,
  },
  modernScanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modernScanIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modernScanContent: {
    flex: 1,
  },
  modernScanName: {
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  modernScanDate: {
    fontWeight: '500',
    color: '#888',
  },
  modernConfidenceBadge: {
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  modernConfidenceText: {
    fontWeight: '700',
    color: '#5E936C',
  },
  achievementsSection: {
    marginBottom: 24,
  },
  modernAchievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modernAchievementCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    opacity: 0.6,
  },
  achievementUnlocked: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  achievementActive: {
    borderWidth: 3,
    borderColor: '#FF4500',
    shadowColor: '#FF4500',
    shadowOpacity: 0.3,
  },
  achievementIconContainer: {
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementName: {
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  achievementGoal: {
    fontWeight: '500',
    color: '#888',
    textAlign: 'center',
  },
  achievementProgressBar: {
    width: '100%',
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
  },
  achievementCount: {
    fontWeight: '600',
    color: '#888',
    textAlign: 'center',
  },
  borderPreview: {
    width: '100%',
    overflow: 'hidden',
  },
  borderPreviewGradient: {
    flex: 1,
  },
  borderPreviewLocked: {
    opacity: 0.3,
  },
  rewardButtons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  claimButton: {
    flex: 1,
    overflow: 'hidden',
  },
  claimButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  claimButtonSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
    borderRadius: 12,
  },
  claimButtonText: {
    fontWeight: '700',
    color: '#fff',
  },
  useButtonSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  useButtonTextSmall: {
    fontWeight: '700',
    color: '#5E936C',
  },
  activeBadgeSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    gap: 4,
  },
  activeBadgeTextSmall: {
    fontWeight: '700',
    color: '#FF9800',
  },
  guestHeader: {},
  guestContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestIconContainer: {
    marginBottom: 24,
  },
  guestIconGradient: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5E936C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  guestTitle: {
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  guestMessage: {
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  modernSignInButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#5E936C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  signInButtonText: {
    fontWeight: '700',
    color: '#fff',
  },
  backTextButton: {
    paddingVertical: 12,
  },
  backTextButtonText: {
    fontWeight: '600',
    color: '#5E936C',
  },
});