// Shared by server (grouping, team identity) and client (rendering).
// Each option carries: tags (for challenge matching), a phrase (for the
// "what connects you" line) and a team identity (for team naming).

export const QUESTIONS = [
  {
    id: 'destination',
    emoji: '✈️',
    text: 'Your dream trip starts tomorrow. Where are you going?',
    options: [
      { emoji: '🏖️', label: 'Beach escape', tags: ['beach', 'relax'], phrase: 'beach sunsets', team: { emoji: '🏖️', name: 'Sunset Squad' } },
      { emoji: '🏔️', label: 'Mountain adventure', tags: ['mountain', 'adventure'], phrase: 'mountain air', team: { emoji: '🏔️', name: 'Mountain Explorers' } },
      { emoji: '🏙️', label: 'City exploration', tags: ['city'], phrase: 'buzzing city streets', team: { emoji: '🏙️', name: 'City Hoppers' } },
      { emoji: '🌲', label: 'Into the wild', tags: ['wild', 'adventure'], phrase: 'the wild outdoors', team: { emoji: '🌲', name: 'Wild Trailblazers' } },
    ],
  },
  {
    id: 'personality',
    emoji: '🧭',
    text: "What's your travel personality?",
    options: [
      { emoji: '🗺️', label: 'The planner', tags: ['planning'], phrase: 'a well-made plan', team: { emoji: '🗺️', name: 'Master Planners' } },
      { emoji: '🎒', label: 'Go with the flow', tags: ['adventure', 'funny'], phrase: 'going with the flow', team: { emoji: '🎒', name: 'Free Spirits' } },
      { emoji: '🎉', label: 'The social butterfly', tags: ['social', 'people'], phrase: 'making new friends', team: { emoji: '🎉', name: 'Social Butterflies' } },
      { emoji: '🔍', label: 'The curious explorer', tags: ['curious', 'places'], phrase: 'curious detours', team: { emoji: '🔍', name: 'Curious Compass' } },
    ],
  },
  {
    id: 'evening',
    emoji: '🌙',
    text: 'You have one free evening. What sounds best?',
    options: [
      { emoji: '🎲', label: 'Playing games', tags: ['games', 'funny'], phrase: 'game nights', team: { emoji: '🎲', name: 'Game Night Crew' } },
      { emoji: '🍕', label: 'Exploring food', tags: ['food'], phrase: 'hunting for great food', team: { emoji: '🍕', name: 'Food Hunters' } },
      { emoji: '🌆', label: 'Exploring the city', tags: ['city', 'curious'], phrase: 'wandering the city after dark', team: { emoji: '🌆', name: 'Night Wanderers' } },
      { emoji: '☕', label: 'Deep conversations', tags: ['deep', 'people'], phrase: 'deep conversations', team: { emoji: '☕', name: 'Chai & Chats' } },
    ],
  },
  {
    id: 'excites',
    emoji: '⚡',
    text: 'What kind of experience excites you most?',
    options: [
      { emoji: '😂', label: 'Something funny and unexpected', tags: ['funny'], phrase: 'funny surprises', team: { emoji: '😂', name: 'Chaos Crew' } },
      { emoji: '⚡', label: 'An adventurous experience', tags: ['adventure'], phrase: 'a good adrenaline rush', team: { emoji: '⚡', name: 'Thrill Seekers' } },
      { emoji: '❤️', label: 'Meeting interesting people', tags: ['people', 'social'], phrase: 'meeting interesting people', team: { emoji: '❤️', name: 'Heart Connectors' } },
      { emoji: '🌄', label: 'Discovering beautiful places', tags: ['places'], phrase: 'discovering beautiful places', team: { emoji: '🌄', name: 'Horizon Hunters' } },
    ],
  },
  {
    id: 'unforgettable',
    emoji: '💫',
    text: 'What makes a trip unforgettable?',
    options: [
      { emoji: '👥', label: 'The people', tags: ['people'], phrase: 'the people you meet along the way', team: { emoji: '👥', name: 'People Collectors' } },
      { emoji: '🏞️', label: 'The places', tags: ['places'], phrase: 'breathtaking views', team: { emoji: '🏞️', name: 'Postcard Chasers' } },
      { emoji: '🍜', label: 'The food', tags: ['food'], phrase: 'unforgettable food', team: { emoji: '🍜', name: 'Flavor Seekers' } },
      { emoji: '🎭', label: 'The experiences', tags: ['experiences'], phrase: 'collecting stories', team: { emoji: '🎭', name: 'Story Makers' } },
    ],
  },
];

export const AVATARS = [
  '🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🦄', '🐙', '🐢',
  '🦉', '🐧', '🐳', '🦋', '🌵', '🍉', '🌻', '🚀', '🎸', '🛹',
];

export const TEAM_COLORS = [
  '#EA580C', '#0284C7', '#7C3AED', '#059669',
  '#DB2777', '#B45309', '#DC2626', '#0D9488',
];

export const CHALLENGES = [
  {
    id: 1, emoji: '💸', title: 'The ₹5,000 Adventure',
    text: 'Your team has ₹5,000 and 48 hours to plan an unforgettable trip.',
    rule: 'Every teammate must contribute one idea.',
    tags: ['planning', 'adventure', 'food', 'relax'],
  },
  {
    id: 2, emoji: '🤥', title: 'Two Truths and One Lie',
    text: 'Each teammate shares two true statements and one lie about themselves.',
    rule: 'The others must guess which statement is the lie.',
    tags: ['funny', 'social', 'people', 'games'],
  },
  {
    id: 3, emoji: '🔗', title: 'Find Three Things in Common',
    text: 'Find three surprising things that ALL of you have in common.',
    rule: "Answers from the quiz don't count!",
    tags: ['deep', 'people', 'social', 'curious'],
  },
  {
    id: 4, emoji: '🎭', title: 'The Travel Disaster',
    text: 'One teammate acts out a funny travel disaster — without speaking.',
    rule: 'Everyone else guesses what happened. Swap actors if you have time!',
    tags: ['funny', 'games', 'experiences'],
  },
  {
    id: 5, emoji: '🧭', title: 'Mystery Destination',
    text: 'Take turns describing a travel destination without saying its name.',
    rule: 'Your teammates must guess the destination.',
    tags: ['places', 'games', 'curious', 'beach', 'mountain', 'wild'],
  },
  {
    id: 6, emoji: '🏨', title: 'Build Your Dream Hostel',
    text: 'Imagine your team owns a hostel.',
    rule: 'Each teammate suggests one crazy feature that would make it unforgettable.',
    tags: ['funny', 'social', 'experiences', 'relax'],
  },
  {
    id: 7, emoji: '📖', title: 'Story Chain',
    text: 'One person starts a travel story. Every teammate adds a sentence with an unexpected twist.',
    rule: 'Together, create the funniest story possible.',
    tags: ['funny', 'deep', 'experiences', 'games'],
  },
  {
    id: 8, emoji: '🍜', title: 'The Food Challenge',
    text: 'Everyone shares the strangest or most memorable food they have ever eaten.',
    rule: 'As a team, pick the most interesting story.',
    tags: ['food', 'city', 'experiences'],
  },
  {
    id: 9, emoji: '🏝️', title: 'Desert Island',
    text: 'Your team is stranded on an island.',
    rule: 'Agree on three objects you would want to have — and explain why.',
    tags: ['wild', 'beach', 'adventure', 'deep'],
  },
  {
    id: 10, emoji: '🗓️', title: 'Plan Tomorrow Together',
    text: 'Your team has an entire day to explore a new city.',
    rule: "Create a fun itinerary that includes something from everyone's preferences.",
    tags: ['planning', 'city', 'food', 'places', 'curious'],
  },
];

// Conversation starters, keyed by destination answer index (Q1).
export const STARTERS = [
  'If your tribe could teleport to any beach tonight, which one would it be — and what would you do first?',
  'Which mountain trek should your tribe do together — and who would complain first?',
  'If you could explore one city together this weekend, which one, and what is the first stop?',
  'What is the wildest place you have ever slept — and would you go back?',
];
export const DEFAULT_STARTER = 'If you could plan a trip together tomorrow, where would you go?';

export const STATUS_ORDER = [
  'joined', 'answered', 'grouped', 'challenge_started', 'challenge_done', 'feedback_done',
];

export const ATTRIBUTION = 'Built by Parth Makwana for the goSTOPS Build Sprint. Not an official goSTOPS product.';
