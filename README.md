# DePause

**A real-time, anonymous mood map of DePauw's campus that listens to how students feel and proactively connects them with the right well-being resources at the right time.**

Built for TigerHacks 2026 at DePauw University.

![DePause Home Screen](assets/images/mascot_main.png)

## The Problem

- 57% of college students feel lonely (Trellis Strategies, 44,000 students)
- 40% who need mental health help don't get it (Healthy Minds Study, 84,000 students)
- The #1 reason is that: 66% say "I don't think I need it"
- DePauw has 18 well-being resources, but a lot of students don't even know what's available

Well-being resources only matter when they reach the people who need them. Right now, the distance between a struggling student  and the help that exists for them is awareness and encouragement to not suffering in silence.

## Our Solution

DePause is an app that our students to check in their mood in just few seconds. The app can turn into a living campus heatmap. Students tap how they feel, and the app:

1. **Shows them they're not alone** with real-time campus mood data (For example: "You and 60% of our campus users are feeling stressed today")
2. **Suggests evidence-based resources** based on their specific mood state, with real DePauw locations and live campus events
3. **Detects when someone needs more help** through passive behavioral pattern detection that gently surfaces professional resources

## Screenshots

### Check-In Flow
Students select a mood (Do you like cat memes?), optionally pick a building, and get personalized suggestions in under 30 seconds.

### Campus Mood Map
Interactive map showing mood data per building. Each pin's color reflects the dominant mood from recent check-ins.

### Evidence-Based Suggestions
Every suggestion is backed by research. For example: we might suggest users who are feeling angry with "Slow yoga for anger, not running" because a 2024 meta-analysis of 10,189 participants proved it.

### Real Campus Events
Up-to-date live DePauw events pulled from CampusLabs, cross-referenced with mood suggestions. Instead of just saying "try yoga!", we want to bring our users realistic and clear recommendation like "Yoga Club meets in 45 min. Maybe you can try"

## Demo

- [Watch our demo video](https://youtube.com/shorts/YulgsJ31kwY?si=mnG8v-oo3nf7rnK0)
- [View our pitch deck](https://drive.google.com/file/d/1j2_tpl-PsRVwF6BPpOEQLj_xw5LclPnC/view?usp=sharing)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK 54) |
| Language | TypeScript |
| Backend | Supabase (Postgres + Auth + Real-time) |
| Map | react-native-maps |
| Event Data | DePauw CampusLabs RSS feed (live, no auth needed) |
| Suggestion Engine | Evidence-based rules engine (80+ curated mappings) |
| Crisis Detection | On-device behavioral pattern analysis (3-tier system) |

## Architecture

```
Mobile App (Expo/React Native)
    |
    ├── Check-in Flow ──> Anonymous write to Supabase (heatmap)
    |                  ──> Private journal on device (personal history)
    |                  ──> Streak update on profile
    |
    ├── Suggestion Engine ──> Rules DB query (mood + context + preference)
    |                     ──> Live events cross-reference
    |                     ──> Novelty filter (don't repeat suggestions)
    |
    ├── Crisis Detection ──> Local journal pattern analysis (on-device only)
    |                    ──> 3-tier escalation (gentle → professional → immediate)
    |                    ──> Never reports to server without consent
    |
    └── Campus Map ──> Aggregated check-ins per building (10+ minimum)
                   ──> Mood color pins with breakdown on tap
```

**Key design decision: Anonymity architecture.** The `checkins` table has NO user_id column. It is physically impossible to link a mood check-in back to a user account. Personal mood history stays on-device only.

## Features

**Core:**
- 5-second mood check-in (4 quadrants + 20 sub-emotions)
- Building-based location selection (no GPS tracking)
- Evidence-based suggestion engine (80+ curated mood-to-resource mappings)
- Real-time campus mood heatmap
- 104 live DePauw campus events from CampusLabs
- Personal mood journal with calendar heatmap view
- Streak system with auto-freeze

**Safety:**
- 3-tier crisis detection based on behavioral patterns (not self-report)
- "Talk to someone" screen with DePauw Counseling, 988, Crisis Text Line, Trevor Project
- Optional outreach form -- users can request a counselor callback
- All crisis detection runs locally on device -- nothing sent to server without consent

**Privacy:**
- Anonymous check-ins (no user_id in mood data)
- Building-level only (no GPS tracking)
- Minimum 10 check-ins per building before showing data
- Personal journal stored on-device, not in the cloud
- One-time location permission for directions only

## Evidence Base

Every suggestion in DePause is backed by research:

| Claim | Source |
|-------|--------|
| Nature reduces cortisol by 21% | Meta-analysis of nature exposure studies |
| Breathing exercises improve anxiety in 100% of studies | Systematic review, 12/12 studies |
| Calming activities reduce anger; intense exercise does NOT | 2024 meta-analysis, 154 studies, 10,189 participants |
| Behavioral Activation is APA-endorsed for depression | APA's 12 empirically supported treatments |
| Social interaction reduces loneliness in 6/7 interventions | Systematic review of 37 university interventions |
| Mood monitoring apps reduce negative mood (p < 0.001) | Frontiers in Psychiatry, MeMO Study |
| Proactive campus approaches reduce suicide attempts by 25% | JED Foundation, 440+ colleges, decade of data |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Installation
```bash
git clone https://github.com/your-repo/depause.git
cd depause
npm install
```

### Environment Variables
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Run
```bash
npx expo start --web    # Web
npx expo start --ios    # iOS Simulator
npx expo start          # Expo Go (scan QR code)
```

## DePauw-Specific Data

- **21 campus buildings** with GPS coordinates (12 verified from CampusLabs, 9 estimated)
- **Up-to-date real campus events** pulled live from `depauw.campuslabs.com/engage/events.rss`
- **13 well-being resources** mapped to buildings (Welch Fitness Center, Nature Park, CDI, Counseling Services, etc.)
- **DePauw Counseling Services** integrated: (765) 658-4268, walk-in hours, 24/7 crisis line

## Team

- Nhi Truong
- Leo Tang

## Acknowledgments

- DePauw University WiCS for organizing TigerHacks
- Tenzer Technology Center and Prindle Institute for collaboration
- CampusLabs/Anthology Engage for the public RSS event feed
- Research sources: ACHA-NCHA, Healthy Minds Study, JED Foundation, CCMH, Trellis Strategies
