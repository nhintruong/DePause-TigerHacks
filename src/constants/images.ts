// Image registry for all app assets
// Mood faces = cat memes, Mascot = penguin character

export const moodImages = {
  red: require('../../assets/images/mood_red.png'),
  yellow: require('../../assets/images/mood_yellow.png'),
  green: require('../../assets/images/mood_green.png'),
  blue: require('../../assets/images/mood_blue.png'),
} as const;

export const subEmotionImages = {
  // Red
  anxious: require('../../assets/images/sub_anxious.png'),
  frustrated: require('../../assets/images/sub_frustrated.png'),
  angry: require('../../assets/images/sub_angry.png'),
  overwhelmed: require('../../assets/images/sub_overwhelmed.png'),
  stressed: require('../../assets/images/sub_stressed.png'),
  // Yellow
  happy: require('../../assets/images/sub_happy.png'),
  excited: require('../../assets/images/sub_excited.png'),
  motivated: require('../../assets/images/sub_motivated.png'),
  grateful: require('../../assets/images/sub_grateful.png'),
  hopeful: require('../../assets/images/sub_hopeful.png'),
  // Green
  calm: require('../../assets/images/sub_calm.png'),
  relaxed: require('../../assets/images/sub_relaxed.png'),
  content: require('../../assets/images/sub_content.png'),
  peaceful: require('../../assets/images/sub_peaceful.png'),
  refreshed: require('../../assets/images/sub_refreshed.png'),
  // Blue
  sad: require('../../assets/images/sub_sad.png'),
  lonely: require('../../assets/images/sub_lonely.png'),
  tired: require('../../assets/images/sub_tired.png'),
  bored: require('../../assets/images/sub_bored.png'),
  numb: require('../../assets/images/sub_numb.png'),
} as const;

export const mascotImages = {
  main: require('../../assets/images/mascot_main.png'),
  wave: require('../../assets/images/mascot_wave.png'),
  celebrate: require('../../assets/images/mascot_celebrate.png'),
  hug: require('../../assets/images/mascot_hug.png'),
  peek: require('../../assets/images/mascot_peek.png'),
  spoiled: require('../../assets/images/mascot_spoiled.png'),
} as const;
