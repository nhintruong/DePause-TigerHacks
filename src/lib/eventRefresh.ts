import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_REFRESH_KEY = 'depause_events_last_refresh';
const REFRESH_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

// Building name -> building_id fuzzy matching
const BUILDING_MAP: Record<string, string[]> = {
  julian: ['julian', 'jsc', 'percy'],
  east_college: ['east college', 'meharry'],
  roy_west: ['roy o. west', 'wood study'],
  pulliam: ['pulliam'],
  mcdermond: ['mcdermond'],
  green_center: ['green center', 'kresge', 'thompson recital', 'kerr theatre'],
  peeler: ['peeler'],
  union_building: ['union building', 'ub ballroom', 'ub living', 'ub flag'],
  stewart_plaza: ['stewart plaza'],
  hoover: ['hoover', 'wallace-stewart', 'wallace stewart'],
  cdi: ['cdi', 'center for diversity', 'center for diversity and inclusion'],
  lilly_center: ['lilly', 'welch', 'neal fieldhouse'],
  buehler: ['buehler'],
  nature_park: ['nature park'],
  bowman_park: ['bowman'],
  prindle: ['prindle'],
  tenzer: ['tenzer'],
  hubbard: ['hubbard'],
  hartman: ['hartman'],
  womens_center: ["women's center"],
  spiritual_life: ['spiritual life'],
};

function matchBuilding(location: string): string | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  for (const [id, keywords] of Object.entries(BUILDING_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return id;
    }
  }
  return null;
}

/**
 * Check if events need refreshing and fetch from CampusLabs RSS if stale.
 * Returns true if refresh happened, false if skipped.
 */
export async function refreshEventsIfStale(): Promise<boolean> {
  const lastRefresh = await AsyncStorage.getItem(LAST_REFRESH_KEY);

  if (lastRefresh) {
    const elapsed = Date.now() - parseInt(lastRefresh, 10);
    if (elapsed < REFRESH_INTERVAL_MS) {
      return false; // Still fresh
    }
  }

  try {
    await fetchAndUpsertEvents();
    await AsyncStorage.setItem(LAST_REFRESH_KEY, Date.now().toString());
    return true;
  } catch (e) {
    console.error('Event refresh failed:', e);
    return false;
  }
}

/**
 * Force refresh events from CampusLabs RSS feed.
 */
async function fetchAndUpsertEvents() {
  // Fetch RSS feed
  const response = await fetch('https://depauw.campuslabs.com/engage/events.rss');
  if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);

  const xml = await response.text();

  // Parse RSS XML (simple regex-based parser for React Native compatibility)
  const events = parseRssXml(xml);

  if (events.length === 0) return;

  // Upsert in batches of 20
  for (let i = 0; i < events.length; i += 20) {
    const batch = events.slice(i, i + 20);
    const { error } = await supabase
      .from('events')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error('Event upsert error:', error);
    }
  }

  console.log(`Refreshed ${events.length} events from CampusLabs`);
}

interface ParsedEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string | null;
  location: string;
  building_id: string | null;
  categories: string[];
  host: string | null;
  image_url: string | null;
  source_url: string;
}

/**
 * Parse RSS XML into event objects.
 * Uses regex instead of DOMParser for React Native compatibility.
 */
function parseRssXml(xml: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Split by <item> tags
  const items = xml.split('<item>').slice(1);

  for (const item of items) {
    const closing = item.indexOf('</item>');
    const content = closing > 0 ? item.slice(0, closing) : item;

    const title = extractTag(content, 'title');
    const link = extractTag(content, 'link');
    const guid = extractTag(content, 'guid');
    const id = (guid || link || '').split('/').pop() || '';

    if (!id || !title) continue;

    // Extract description text (strip HTML from CDATA)
    let description = extractCdata(content, 'description') || '';
    description = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    description = description.slice(0, 500);

    // Extract namespaced event fields
    const startStr = extractTag(content, 'start', 'events');
    const endStr = extractTag(content, 'end', 'events');
    const location = extractTag(content, 'location', 'events') || '';
    const host = extractTag(content, 'host', 'events') || null;

    // Extract categories
    const categories: string[] = [];
    const catRegex = /<category>([^<]+)<\/category>/g;
    let catMatch;
    while ((catMatch = catRegex.exec(content)) !== null) {
      categories.push(catMatch[1]);
    }

    // Extract image
    const enclosureMatch = content.match(/enclosure\s+url="([^"]+)"/);
    const imageUrl = enclosureMatch ? enclosureMatch[1] : null;

    // Parse dates
    const startTime = startStr ? new Date(startStr).toISOString() : null;
    const endTime = endStr ? new Date(endStr).toISOString() : null;

    if (!startTime) continue;

    events.push({
      id,
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      location,
      building_id: matchBuilding(location),
      categories,
      host,
      image_url: imageUrl,
      source_url: link || guid || '',
    });
  }

  return events;
}

function extractTag(content: string, tag: string, ns?: string): string {
  const tagName = ns ? `${tag} xmlns="${ns}"` : tag;
  const simpleTag = ns ? `${ns}:${tag}` : tag;

  // Try namespaced format: <start xmlns="events">...</start>
  let regex = new RegExp(`<${tagName}>([^<]*)</${tag}>`, 'i');
  let match = content.match(regex);
  if (match) return match[1].trim();

  // Try simple format: <tag>...</tag>
  regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
  match = content.match(regex);
  if (match) return match[1].trim();

  return '';
}

function extractCdata(content: string, tag: string): string {
  const regex = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const match = content.match(regex);
  return match ? match[1] : '';
}
