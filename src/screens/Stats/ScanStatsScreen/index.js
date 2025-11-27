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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';import { getScanStats, getScanHistory, getDailyScanData } from '@services/scanning/scanStatsService';

const { width } = Dimensions.get('window');

export default function ScanStatsScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // 'week' or 'month'
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // ✅ Check if user is guest
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
      // Load stats
      const statsResult = await getScanStats(userId);
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // Load recent scans with deduplication
      const historyResult = await getScanHistory(userId, 50); // Get more to deduplicate
      if (historyResult.success) {
        // ✅ Deduplicate by taxonId or species name
        const uniqueScans = [];
        const seen = new Set();

        for (const scan of historyResult.data) {
          // Create unique key based on taxonId or name
          const key = scan.taxonId 
            ? `taxon_${scan.taxonId}` 
            : (scan.plantName || scan.speciesName || '').toLowerCase().trim();

          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueScans.push(scan);
          }

          // Stop when we have 10 unique scans
          if (uniqueScans.length >= 10) break;
        }

        setRecentScans(uniqueScans);
      }

      // Load chart data
      const days = selectedPeriod === 'week' ? 7 : 30;
      const chartResult = await getDailyScanData(userId, days);
      if (chartResult.success) {
        setChartData(chartResult.data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Function to determine the correct icon and color based on scan type
  const getScanIcon = (scan) => {
    // Check if it's an animal scan
    const isAnimal = scan.scanType === 'animal' || 
                     scan.type === 'animal' ||
                     scan.category === 'animal' ||
                     (scan.plantName && scan.plantName.toLowerCase().includes('animal')) ||
                     (scan.speciesName && scan.speciesName.toLowerCase().includes('animal'));

    if (isAnimal) {
      return {
        icon: 'paw',
        color: '#FF6B6B',
        backgroundColor: '#FFE5E5'
      };
    }

    // Default to plant/leaf icon
    return {
      icon: 'scan-outline',
      color: '#5E936C',
      backgroundColor: '#E8F5E9'
    };
  };

  const StatCard = ({ icon, label, value, color, subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

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
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(94, 147, 108, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#5E936C',
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E936C" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  // ✅ Guest user message
  if (isGuest) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#5E936C" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Statistics</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.guestContainer}>
          <Ionicons name="lock-closed" size={80} color="#ccc" />
          <Text style={styles.guestTitle}>Sign In Required</Text>
          <Text style={styles.guestMessage}>
            Create an account or sign in to track your scan statistics
          </Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5E936C" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Statistics</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          
          <StatCard
            icon="scan"
            label="Total Scans"
            value={stats?.totalScans || 0}
            color="#4CAF50"
            subtitle="All time"
          />
          
          <View style={styles.statsRow}>
            <View style={[styles.statCardSmall, { borderLeftColor: '#2196F3' }]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="calendar" size={20} color="#2196F3" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>This Month</Text>
                <Text style={styles.statValueSmall}>{stats?.monthScans || 0}</Text>
              </View>
            </View>

            <View style={[styles.statCardSmall, { borderLeftColor: '#FF9800' }]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="trending-up" size={20} color="#FF9800" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>This Week</Text>
                <Text style={styles.statValueSmall}>{stats?.weekScans || 0}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCardSmall, { borderLeftColor: '#9C27B0' }]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="today" size={20} color="#9C27B0" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Today</Text>
                <Text style={styles.statValueSmall}>{stats?.todayScans || 0}</Text>
              </View>
            </View>

            <View style={[styles.statCardSmall, { borderLeftColor: '#FF5722' }]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="planet" size={20} color="#FF5722" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Species</Text>
                <Text style={styles.statValueSmall}>{stats?.uniqueSpecies || 0}</Text>
              </View>
            </View>
          </View>
          
          <StatCard
            icon="time"
            label="Last Scan"
            value={stats?.lastScanDate ? formatDate(stats.lastScanDate) : 'No scans yet'}
            color="#607D8B"
          />
        </View>

        {/* Chart Section */}
        {chartData && chartData.length > 0 && (
          <View style={styles.section}>
            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>Scan Activity</Text>
              <View style={styles.periodSelector}>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    selectedPeriod === 'week' && styles.periodButtonActive
                  ]}
                  onPress={() => setSelectedPeriod('week')}
                >
                  <Text style={[
                    styles.periodButtonText,
                    selectedPeriod === 'week' && styles.periodButtonTextActive
                  ]}>Week</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    selectedPeriod === 'month' && styles.periodButtonActive
                  ]}
                  onPress={() => setSelectedPeriod('month')}
                >
                  <Text style={[
                    styles.periodButtonText,
                    selectedPeriod === 'month' && styles.periodButtonTextActive
                  ]}>Month</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: selectedPeriod === 'week' 
                    ? chartData.map(d => d.date)
                    : chartData.filter((_, i) => i % 5 === 0 || i === chartData.length - 1).map(d => d.date),
                  datasets: [{
                    data: chartData.map(d => d.scans).length > 0 
                      ? chartData.map(d => d.scans)
                      : [0]
                  }]
                }}
                width={width - 40}
                height={220}
                chartConfig={getChartConfig()}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLabels={selectedPeriod === 'week'}
                withHorizontalLabels={true}
                fromZero={true}
                segments={4}
              />
            </View>
          </View>
        )}

        {/* Recent Scans - DEDUPLICATED WITH DYNAMIC ICONS */}
        {recentScans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            <Text style={styles.sectionSubtitle}>
              Showing {recentScans.length} unique species
            </Text>
            {recentScans.map((scan, index) => {
              const iconData = getScanIcon(scan);
              return (
                <View key={scan.id || index} style={styles.scanItem}>
                  <View style={[styles.scanIcon, { backgroundColor: iconData.backgroundColor }]}>
                    <Ionicons name={iconData.icon} size={20} color={iconData.color} />
                  </View>
                  <View style={styles.scanContent}>
                    <Text style={styles.scanName}>
                      {scan.plantName || scan.speciesName || 'Unknown Species'}
                    </Text>
                    <Text style={styles.scanDate}>
                      Last scanned: {formatDate(scan.timestamp)}
                    </Text>
                  </View>
                  {scan.confidence && (
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>
                        {Math.round(scan.confidence)}%
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Achievements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          
          <View style={styles.achievementGrid}>
            <View style={[
              styles.achievementCard,
              (stats?.totalScans || 0) >= 10 && styles.achievementCardUnlocked
            ]}>
              <Ionicons 
                name="star" 
                size={32} 
                color={(stats?.totalScans || 0) >= 10 ? "#FFD700" : "#ccc"} 
              />
              <Text style={styles.achievementTitle}>Beginner</Text>
              <Text style={styles.achievementDesc}>10 scans</Text>
              <Text style={styles.achievementProgress}>
                {Math.min(stats?.totalScans || 0, 10)}/10
              </Text>
            </View>

            <View style={[
              styles.achievementCard,
              (stats?.totalScans || 0) >= 50 && styles.achievementCardUnlocked
            ]}>
              <Ionicons 
                name="trophy" 
                size={32} 
                color={(stats?.totalScans || 0) >= 50 ? "#FFD700" : "#ccc"} 
              />
              <Text style={styles.achievementTitle}>Explorer</Text>
              <Text style={styles.achievementDesc}>50 scans</Text>
              <Text style={styles.achievementProgress}>
                {Math.min(stats?.totalScans || 0, 50)}/50
              </Text>
            </View>

            <View style={[
              styles.achievementCard,
              (stats?.uniqueSpecies || 0) >= 25 && styles.achievementCardUnlocked
            ]}>
              <Ionicons 
                name="sparkles" 
                size={32} 
                color={(stats?.uniqueSpecies || 0) >= 25 ? "#FFD700" : "#ccc"} 
              />
              <Text style={styles.achievementTitle}>Collector</Text>
              <Text style={styles.achievementDesc}>25 species</Text>
              <Text style={styles.achievementProgress}>
                {Math.min(stats?.uniqueSpecies || 0, 25)}/25
              </Text>
            </View>

            <View style={[
              styles.achievementCard,
              (stats?.weekScans || 0) >= 7 && styles.achievementCardUnlocked
            ]}>
              <Ionicons 
                name="flame" 
                size={32} 
                color={(stats?.weekScans || 0) >= 7 ? "#FF4500" : "#ccc"} 
              />
              <Text style={styles.achievementTitle}>Streak</Text>
              <Text style={styles.achievementDesc}>7 in a week</Text>
              <Text style={styles.achievementProgress}>
                {Math.min(stats?.weekScans || 0, 7)}/7
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    height: 100,
    backgroundColor: '#5E936C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  statCardSmall: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statValueSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#5E936C',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  chart: {
    borderRadius: 12,
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  scanIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scanContent: {
    flex: 1,
  },
  scanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  scanDate: {
    fontSize: 12,
    color: '#999',
  },
  confidenceBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E936C',
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    opacity: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  achievementCardUnlocked: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  achievementDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  achievementProgress: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontWeight: '600',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  guestMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  signInButton: {
    backgroundColor: '#5E936C',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});