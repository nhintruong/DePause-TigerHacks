import { MoodQuadrant, MoodQuadrantInfo, SubEmotion, Context } from '../types';
import { colors } from './theme';
import { moodImages, subEmotionImages } from './images';
import { ImageSourcePropType } from 'react-native';

export const MOOD_QUADRANTS: Record<MoodQuadrant, MoodQuadrantInfo> = {
  red: {
    key: 'red',
    label: 'Stressed',
    image: moodImages.red,
    color: colors.mood.red,
    bgColor: colors.moodBg.red,
    subEmotions: ['anxious', 'frustrated', 'angry', 'overwhelmed', 'stressed'],
  },
  yellow: {
    key: 'yellow',
    label: 'Good',
    image: moodImages.yellow,
    color: colors.mood.yellow,
    bgColor: colors.moodBg.yellow,
    subEmotions: ['happy', 'excited', 'motivated', 'grateful', 'hopeful'],
  },
  green: {
    key: 'green',
    label: 'Calm',
    image: moodImages.green,
    color: colors.mood.green,
    bgColor: colors.moodBg.green,
    subEmotions: ['calm', 'relaxed', 'content', 'peaceful', 'refreshed'],
  },
  blue: {
    key: 'blue',
    label: 'Low',
    image: moodImages.blue,
    color: colors.mood.blue,
    bgColor: colors.moodBg.blue,
    subEmotions: ['sad', 'lonely', 'tired', 'bored', 'numb'],
  },
};

export const SUB_EMOTION_LABELS: Record<SubEmotion, string> = {
  anxious: 'Anxious',
  frustrated: 'Frustrated',
  angry: 'Angry',
  overwhelmed: 'Overwhelmed',
  stressed: 'Stressed',
  happy: 'Happy',
  excited: 'Excited',
  motivated: 'Motivated',
  grateful: 'Grateful',
  hopeful: 'Hopeful',
  calm: 'Calm',
  relaxed: 'Relaxed',
  content: 'Content',
  peaceful: 'Peaceful',
  refreshed: 'Refreshed',
  sad: 'Sad',
  lonely: 'Lonely',
  tired: 'Tired',
  bored: 'Bored',
  numb: 'Numb',
};

export const SUB_EMOTION_IMAGES: Record<SubEmotion, ImageSourcePropType> = subEmotionImages;

export const CONTEXT_OPTIONS: { key: Context; label: string }[] = [
  { key: 'academic', label: 'Academic' },
  { key: 'social', label: 'Social' },
  { key: 'personal', label: 'Personal' },
  { key: 'everything', label: 'Just everything' },
];

export const FOLLOWUP_PROMPTS: Record<MoodQuadrant, { subEmotionPrompt: string; contextPrompt: string }> = {
  red: {
    subEmotionPrompt: "I hear you. Can you put a word to it?",
    contextPrompt: "What's weighing on you most?",
  },
  blue: {
    subEmotionPrompt: "Thanks for checking in. Can you put a word to it?",
    contextPrompt: "What's going on?",
  },
  green: {
    subEmotionPrompt: "Nice! What's the vibe?",
    contextPrompt: "",
  },
  yellow: {
    subEmotionPrompt: "Love that! What's the vibe?",
    contextPrompt: "",
  },
};
