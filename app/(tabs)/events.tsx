import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography, shadows } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import { refreshEventsIfStale } from '../../src/lib/eventRefresh';
import { CampusEvent } from '../../src/types';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

interface EventSection {
  title: string;
  data: CampusEvent[];
}

export default function EventsScreen() {
  const [sections, setSections] = useState<EventSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    // Auto-refresh from CampusLabs RSS if stale (>2 days old)
    await refreshEventsIfStale();

    // Then fetch from Supabase
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching events:', error);
      setLoading(false);
      return;
    }

    // Group events by date
    const grouped: Record<string, CampusEvent[]> = {};
    for (const event of (data || [])) {
      const date = event.start_time.slice(0, 10); // YYYY-MM-DD
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(event);
    }

    // Convert to sections with friendly date labels
    const sectionList: EventSection[] = Object.entries(grouped).map(([date, events]) => {
      const parsed = parseISO(date);
      let label: string;
      if (isToday(parsed)) label = 'Today';
      else if (isTomorrow(parsed)) label = 'Tomorrow';
      else label = format(parsed, 'EEEE, MMMM d');

      return { title: label, data: events };
    });

    setSections(sectionList);
    setLoading(false);
  }

  function formatTime(dateStr: string) {
    return format(parseISO(dateStr), 'h:mm a');
  }

  function formatTimeRange(start: string, end?: string) {
    const startStr = formatTime(start);
    if (end) {
      const endStr = formatTime(end);
      return `${startStr} – ${endStr}`;
    }
    return startStr;
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading events...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Campus Events</Text>
      <Text style={styles.subtitle}>{sections.reduce((sum, s) => sum + s.data.length, 0)} upcoming events from DePauw</Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.eventCard, pressed && styles.eventCardPressed]}
            onPress={() => {
              if (item.source_url) Linking.openURL(item.source_url);
            }}
          >
            <View style={styles.eventTimeRow}>
              <Text style={styles.eventTime}>
                {formatTimeRange(item.start_time, item.end_time || undefined)}
              </Text>
              {item.categories && item.categories.length > 0 && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.categories[0]}</Text>
                </View>
              )}
            </View>

            <Text style={styles.eventTitle}>{item.title}</Text>

            {item.location ? (
              <Text style={styles.eventLocation}>{item.location}</Text>
            ) : null}

            {item.host ? (
              <Text style={styles.eventHost}>Hosted by {item.host}</Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No upcoming events found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
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
  sectionHeader: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.soft,
  },
  eventCardPressed: {
    opacity: 0.8,
  },
  eventTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  eventTime: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryBadge: {
    backgroundColor: colors.moodBg.green,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  categoryText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  eventLocation: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  eventHost: {
    fontSize: typography.sizes.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textLight,
  },
});
