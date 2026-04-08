import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { MOOD_QUADRANTS } from '../../src/constants/moods';
import { BUILDINGS } from '../../src/data/buildings';
import { supabase } from '../../src/lib/supabase';
import { Building, MoodQuadrant, CampusEvent } from '../../src/types';

// Conditionally import MapView for native
let MapView: any = null;
let Marker: any = null;
let mapsAvailable = false;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    mapsAvailable = true;
  } catch (e) {
    // react-native-maps not available in Expo Go -- use list fallback
    mapsAvailable = false;
  }
}

const CAMPUS_CENTER = { latitude: 39.639, longitude: -86.863 };
const CAMPUS_DELTA = { latitudeDelta: 0.012, longitudeDelta: 0.012 };
const MIN_CHECKINS = 10;

interface BuildingMoodData {
  totalCheckins: number;
  breakdown: Record<MoodQuadrant, number>;
  percentages: Record<MoodQuadrant, number>;
  dominantMood: MoodQuadrant;
}

const BUILDING_TYPE_LABELS: Record<string, string> = {
  academic: 'Academic',
  arts: 'Arts',
  'student-life': 'Student Life',
  dining: 'Dining',
  athletics: 'Athletics',
  wellness: 'Wellness',
  outdoors: 'Outdoors',
  spiritual: 'Spiritual',
};

// ─── Web Leaflet Map component ──────────────────────────────────────
function WebLeafletMap({
  buildingMoods,
  onBuildingSelect,
}: {
  buildingMoods: Record<string, BuildingMoodData | null>;
  onBuildingSelect: (building: Building) => void;
}) {
  const containerRef = useRef<View>(null);

  const markersJson = useMemo(
    () =>
      JSON.stringify(
        BUILDINGS.map((b) => ({
          id: b.id,
          name: b.shortName,
          fullName: b.name,
          lat: b.lat,
          lng: b.lng,
          color: buildingMoods[b.id]
            ? MOOD_QUADRANTS[buildingMoods[b.id]!.dominantMood].color
            : '#CCCCCC',
          hasData: !!buildingMoods[b.id],
          checkins: buildingMoods[b.id]?.totalCheckins || 0,
          type: b.type,
        }))
      ),
    [buildingMoods]
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const node = containerRef.current as any;
    if (!node) return;

    const doc = globalThis.document;
    const win = globalThis.window;
    if (!doc || !win) return;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; }
  .custom-tooltip {
    background: #FFFCFA;
    border: 1px solid #F0E8E3;
    border-radius: 12px;
    padding: 6px 12px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #2D2D2D;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .custom-tooltip::before { display: none; }
  .leaflet-popup-content-wrapper {
    border-radius: 16px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .leaflet-popup-content { margin: 10px 14px; }
  .pin-label {
    font-size: 12px;
    font-weight: 600;
    color: #6B6B6B;
    margin-top: 2px;
  }
  .pin-count {
    font-size: 11px;
    color: #9E9E9E;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var markers = ${markersJson};
  var map = L.map('map', {
    zoomControl: true,
    attributionControl: false,
  }).setView([39.639, -86.863], 16);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
  }).addTo(map);

  L.control.attribution({ prefix: false, position: 'bottomright' })
    .addAttribution('CartoDB')
    .addTo(map);

  markers.forEach(function(m) {
    var radius = m.hasData ? Math.min(10 + m.checkins / 4, 22) : 9;

    var circle = L.circleMarker([m.lat, m.lng], {
      radius: radius,
      fillColor: m.color,
      color: '#FFFFFF',
      weight: 2.5,
      opacity: 1,
      fillOpacity: 0.88,
    }).addTo(map);

    circle.bindTooltip(m.name, {
      direction: 'top',
      offset: [0, -radius - 4],
      className: 'custom-tooltip',
    });

    circle.on('click', function() {
      window.parent.postMessage(
        JSON.stringify({ type: 'building_click', id: m.id }),
        '*'
      );
    });
  });
<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const iframe = doc.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '0';
    iframe.style.display = 'block';
    iframe.setAttribute('allow', 'geolocation');

    node.appendChild(iframe);

    const handler = (event: any) => {
      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'building_click') {
          const building = BUILDINGS.find((b) => b.id === data.id);
          if (building) onBuildingSelect(building);
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    win.addEventListener('message', handler);

    return () => {
      win.removeEventListener('message', handler);
      URL.revokeObjectURL(url);
      if (node.contains(iframe)) {
        node.removeChild(iframe);
      }
    };
  }, [markersJson, onBuildingSelect]);

  return (
    <View
      ref={containerRef}
      style={{ flex: 1 }}
    />
  );
}

// ─── Main screen ────────────────────────────────────────────────────
export default function MapScreen() {
  const [buildingMoods, setBuildingMoods] = useState<
    Record<string, BuildingMoodData | null>
  >({});
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null
  );
  const [buildingEvents, setBuildingEvents] = useState<CampusEvent[]>([]);
  const [totalCampusCheckins, setTotalCampusCheckins] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadBuildingMoods();
    }, [])
  );

  async function loadBuildingMoods() {
    setLoading(true);
    const sixHoursAgo = new Date(
      Date.now() - 6 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from('checkins')
      .select('building_id, quadrant')
      .gte('created_at', sixHoursAgo);

    if (error) {
      setLoading(false);
      return;
    }

    setTotalCampusCheckins(data?.length || 0);

    const grouped: Record<string, Record<MoodQuadrant, number>> = {};
    for (const row of data || []) {
      if (!row.building_id) continue;
      if (!grouped[row.building_id]) {
        grouped[row.building_id] = { red: 0, yellow: 0, green: 0, blue: 0 };
      }
      const q = row.quadrant as MoodQuadrant;
      if (grouped[row.building_id][q] !== undefined) {
        grouped[row.building_id][q]++;
      }
    }

    const moods: Record<string, BuildingMoodData | null> = {};
    for (const building of BUILDINGS) {
      const breakdown = grouped[building.id];
      if (!breakdown) {
        moods[building.id] = null;
        continue;
      }
      const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
      if (total < MIN_CHECKINS) {
        moods[building.id] = null;
        continue;
      }

      let dominant: MoodQuadrant = 'green';
      let maxCount = 0;
      for (const [mood, count] of Object.entries(breakdown)) {
        if (count > maxCount) {
          maxCount = count;
          dominant = mood as MoodQuadrant;
        }
      }

      moods[building.id] = {
        totalCheckins: total,
        breakdown,
        percentages: {
          red: Math.round((breakdown.red / total) * 100),
          yellow: Math.round((breakdown.yellow / total) * 100),
          green: Math.round((breakdown.green / total) * 100),
          blue: Math.round((breakdown.blue / total) * 100),
        },
        dominantMood: dominant,
      };
    }

    setBuildingMoods(moods);
    setLoading(false);
  }

  const selectBuilding = useCallback(async (building: Building) => {
    setSelectedBuilding(building);
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('building_id', building.id)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(3);
    setBuildingEvents(data || []);
  }, []);

  function dismissDetail() {
    setSelectedBuilding(null);
    setBuildingEvents([]);
  }

  // ─── Shared sub-components ────────────────────────────────────────
  function MoodBar({ data }: { data: BuildingMoodData }) {
    const quadrants: MoodQuadrant[] = ['red', 'yellow', 'green', 'blue'];
    return (
      <View style={styles.moodBar}>
        {quadrants.map((q) => {
          const pct = data.percentages[q];
          if (pct === 0) return null;
          return (
            <View
              key={q}
              style={[
                styles.moodBarSegment,
                {
                  width: `${pct}%`,
                  backgroundColor: MOOD_QUADRANTS[q].color,
                },
              ]}
            />
          );
        })}
      </View>
    );
  }

  function MoodBreakdown({ data }: { data: BuildingMoodData }) {
    const quadrants: MoodQuadrant[] = ['red', 'yellow', 'green', 'blue'];
    return (
      <View style={styles.breakdownRow}>
        {quadrants.map((q) => (
          <View key={q} style={styles.breakdownItem}>
            <View
              style={[
                styles.breakdownDot,
                { backgroundColor: MOOD_QUADRANTS[q].color },
              ]}
            />
            <Text style={styles.breakdownLabel}>
              {MOOD_QUADRANTS[q].label} {data.percentages[q]}%
            </Text>
          </View>
        ))}
      </View>
    );
  }

  function BuildingDetail() {
    if (!selectedBuilding) return null;
    const mood = buildingMoods[selectedBuilding.id];

    return (
      <View style={styles.detailCard}>
        <Pressable onPress={dismissDetail} hitSlop={12}>
          <Text style={styles.detailDismiss}>Close</Text>
        </Pressable>

        <Text style={styles.detailName}>{selectedBuilding.name}</Text>
        <Text style={styles.detailType}>
          {BUILDING_TYPE_LABELS[selectedBuilding.type] || selectedBuilding.type}
          {selectedBuilding.isWellbeing ? '  --  Wellbeing resource' : ''}
        </Text>

        {mood ? (
          <View style={styles.detailMoodSection}>
            <MoodBar data={mood} />
            <MoodBreakdown data={mood} />
            <Text style={styles.detailCheckins}>
              {mood.totalCheckins} check-ins in the last 6 hours
            </Text>
          </View>
        ) : (
          <View style={styles.detailMoodSection}>
            <Text style={styles.notEnoughData}>Not enough data yet</Text>
            <Text style={styles.notEnoughSubtext}>
              Needs {MIN_CHECKINS}+ check-ins to show mood data
            </Text>
          </View>
        )}

        {buildingEvents.length > 0 && (
          <View style={styles.detailEventsSection}>
            <Text style={styles.detailEventsTitle}>Upcoming Events</Text>
            {buildingEvents.map((event) => (
              <View key={event.id} style={styles.eventItem}>
                <Text style={styles.eventName}>{event.title}</Text>
                <Text style={styles.eventTime}>
                  {format(new Date(event.start_time), 'EEE, MMM d -- h:mm a')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading campus mood...</Text>
      </SafeAreaView>
    );
  }

  // ─── Web: Leaflet map ─────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={styles.mapWrapper}>
        {/* Unlock banner */}
        {totalCampusCheckins < 50 && (
          <View style={styles.webBannerOverlay}>
            <View style={styles.unlockBanner}>
              <Text style={styles.unlockText}>
                Campus mood unlocks at 50 students
                {totalCampusCheckins > 0
                  ? ` -- ${50 - totalCampusCheckins} more to go`
                  : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Legend overlay */}
        <View style={styles.mapLegend}>
          {Object.values(MOOD_QUADRANTS).map((q) => (
            <View key={q.key} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: q.color }]}
              />
              <Text style={styles.mapLegendLabel}>{q.label}</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: '#CCCCCC' }]}
            />
            <Text style={styles.mapLegendLabel}>No data</Text>
          </View>
        </View>

        {/* Leaflet iframe map */}
        <WebLeafletMap
          buildingMoods={buildingMoods}
          onBuildingSelect={selectBuilding}
        />

        {/* Building detail bottom sheet */}
        {selectedBuilding && <BuildingDetail />}
      </View>
    );
  }

  // ─── Native: react-native-maps ────────────────────────────────────

  // Fallback for Expo Go (react-native-maps not available)
  if (!mapsAvailable) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Campus Map</Text>
        <Text style={styles.subtitle}>
          {totalCampusCheckins} check-ins in the last 6 hours
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {/* Legend */}
          <View style={styles.legendRow}>
            {Object.values(MOOD_QUADRANTS).map((q) => (
              <View key={q.key} style={styles.legendRowItem}>
                <View style={[styles.legendDot, { backgroundColor: q.color }]} />
                <Text style={styles.legendRowLabel}>{q.label}</Text>
              </View>
            ))}
          </View>

          {/* Building list with mood data */}
          {BUILDINGS.map((building) => {
            const mood = buildingMoods[building.id];
            return (
              <Pressable
                key={building.id}
                style={[
                  styles.buildingCard,
                  mood && { borderLeftWidth: 4, borderLeftColor: MOOD_QUADRANTS[mood.dominantMood].color },
                ]}
                onPress={() => selectBuilding(building)}
              >
                <View style={styles.buildingCardHeader}>
                  <Text style={styles.buildingCardName}>{building.shortName}</Text>
                  <Text style={styles.buildingCardType}>
                    {BUILDING_TYPE_LABELS[building.type] || building.type}
                  </Text>
                </View>
                {mood ? (
                  <>
                    <MoodBar data={mood} />
                    <Text style={styles.buildingCardCheckins}>
                      {mood.totalCheckins} check-ins
                    </Text>
                  </>
                ) : (
                  <Text style={styles.buildingCardNoData}>Not enough data yet</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {selectedBuilding && <BuildingDetail />}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.mapWrapper}>
      {totalCampusCheckins < 50 && (
        <SafeAreaView
          edges={['top']}
          style={styles.nativeBannerOverlay}
        >
          <View style={styles.unlockBanner}>
            <Text style={styles.unlockText}>
              Campus mood unlocks at 50 students
              {totalCampusCheckins > 0
                ? ` -- ${50 - totalCampusCheckins} more to go`
                : ''}
            </Text>
          </View>
        </SafeAreaView>
      )}

      <MapView
        style={styles.map}
        initialRegion={{ ...CAMPUS_CENTER, ...CAMPUS_DELTA }}
        showsUserLocation
        showsCompass
        onPress={dismissDetail}
      >
        {BUILDINGS.map((building) => {
          const mood = buildingMoods[building.id];
          const pinColor = mood
            ? MOOD_QUADRANTS[mood.dominantMood].color
            : '#CCCCCC';

          return (
            <Marker
              key={building.id}
              coordinate={{
                latitude: building.lat,
                longitude: building.lng,
              }}
              pinColor={pinColor}
              title={building.shortName}
              onPress={() => selectBuilding(building)}
            />
          );
        })}
      </MapView>

      {/* Legend overlay */}
      <View style={styles.mapLegend}>
        {Object.values(MOOD_QUADRANTS).map((q) => (
          <View key={q.key} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: q.color }]}
            />
            <Text style={styles.mapLegendLabel}>{q.label}</Text>
          </View>
        ))}
      </View>

      {/* Bottom detail sheet */}
      {selectedBuilding && <BuildingDetail />}
    </View>
  );
}

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },

  // Map wrapper (full screen)
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },

  // Unlock banner
  webBannerOverlay: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
  },
  nativeBannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  unlockBanner: {
    backgroundColor: colors.moodBg.yellow,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    ...shadows.soft,
  },
  unlockText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },

  // Legend overlay
  mapLegend: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.md,
    backgroundColor: 'rgba(255,252,250,0.95)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    zIndex: 10,
    ...shadows.soft,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mapLegendLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Mood bar
  moodBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    backgroundColor: colors.divider,
  },
  moodBarSegment: {
    height: '100%',
  },

  // Mood breakdown
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Detail card (bottom sheet)
  detailCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    zIndex: 20,
    ...shadows.medium,
  },
  detailDismiss: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  detailName: {
    fontSize: typography.sizes.lg,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  detailType: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  detailMoodSection: {
    marginBottom: spacing.md,
  },
  detailCheckins: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  notEnoughData: {
    fontSize: typography.sizes.md,
    color: colors.textLight,
    fontWeight: '600',
  },
  notEnoughSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: 4,
  },
  detailEventsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  detailEventsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  eventItem: {
    paddingVertical: spacing.xs,
  },
  eventName: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  eventTime: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Expo Go list fallback styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.soft,
  },
  legendRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendRowLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  buildingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.soft,
  },
  buildingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  buildingCardName: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  buildingCardType: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  buildingCardCheckins: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  buildingCardNoData: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
  },
});
