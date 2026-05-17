// Game content and configuration for different subjects
export const subjects = {
  mathematics: {
    title: 'Mathematics',
    icon: 'Calculator',
    games: [
      {
        id: 'math-basic',
        title: 'Number Ninja',
        description: 'Master basic arithmetic operations',
        type: 'math',
        difficulty: 'beginner',
        reward: 100,
        topics: ['addition', 'subtraction', 'multiplication', 'division'],
        timeLimit: 300
      },
      {
        id: 'math-algebra',
        title: 'Algebra Adventure',
        description: 'Solve algebraic equations and earn rewards',
        type: 'quiz',
        difficulty: 'intermediate',
        reward: 150,
        topics: ['equations', 'expressions', 'functions'],
        timeLimit: 400
      }
    ]
  },
  english: {
    title: 'English',
    icon: 'BookOpen',
    games: [
      {
        id: 'vocab-match',
        title: 'Word Wizard',
        description: 'Match words with their meanings',
        type: 'memory',
        difficulty: 'beginner',
        reward: 100,
        topics: ['vocabulary', 'synonyms', 'antonyms'],
        timeLimit: 300
      },
      {
        id: 'grammar-quest',
        title: 'Grammar Guardian',
        description: 'Test your grammar knowledge',
        type: 'quiz',
        difficulty: 'intermediate',
        reward: 150,
        topics: ['parts of speech', 'tenses', 'punctuation'],
        timeLimit: 400
      }
    ]
  },
  science: {
    title: 'Science',
    icon: 'Atom',
    games: [
      {
        id: 'science-elements',
        title: 'Element Explorer',
        description: 'Learn about chemical elements',
        type: 'memory',
        difficulty: 'intermediate',
        reward: 150,
        topics: ['periodic table', 'chemical symbols', 'properties'],
        timeLimit: 400
      },
      {
        id: 'bio-quiz',
        title: 'Biology Brain',
        description: 'Test your biology knowledge',
        type: 'quiz',
        difficulty: 'advanced',
        reward: 200,
        topics: ['cells', 'organs', 'systems'],
        timeLimit: 500
      }
    ]
  },
  history: {
    title: 'History',
    icon: 'Clock',
    games: [
      {
        id: 'history-timeline',
        title: 'Time Traveler',
        description: 'Order historical events correctly',
        type: 'sequence',
        difficulty: 'intermediate',
        reward: 150,
        topics: ['world wars', 'ancient civilizations', 'industrial revolution'],
        timeLimit: 400
      },
      {
        id: 'history-quiz',
        title: 'History Hero',
        description: 'Test your historical knowledge',
        type: 'quiz',
        difficulty: 'advanced',
        reward: 200,
        topics: ['important dates', 'historical figures', 'major events'],
        timeLimit: 500
      }
    ]
  },
  geography: {
    title: 'Geography',
    icon: 'Globe',
    games: [
      {
        id: 'geo-match',
        title: 'Globe Trotter',
        description: 'Match countries with their capitals',
        type: 'memory',
        difficulty: 'intermediate',
        reward: 150,
        topics: ['capitals', 'countries', 'continents'],
        timeLimit: 400
      },
      {
        id: 'map-quiz',
        title: 'Map Master',
        description: 'Test your geographical knowledge',
        type: 'quiz',
        difficulty: 'advanced',
        reward: 200,
        topics: ['landforms', 'climate', 'natural resources'],
        timeLimit: 500
      }
    ]
  }
};

export const quizQuestions = {
  'grammar-quest': [
    {
      question: "Which of these is a proper noun?",
      options: ["London", "city", "building", "street"],
      answer: 0
    },
    {
      question: "What tense is: 'I will have been studying'?",
      options: ["Future perfect continuous", "Past perfect", "Present perfect continuous", "Future continuous"],
      answer: 0
    }
  ],
  'bio-quiz': [
    {
      question: "Which organelle is known as the powerhouse of the cell?",
      options: ["Mitochondria", "Nucleus", "Ribosome", "Golgi body"],
      answer: 0
    },
    {
      question: "What is the process of converting light energy into chemical energy?",
      options: ["Photosynthesis", "Respiration", "Fermentation", "Digestion"],
      answer: 0
    }
  ],
  'history-quiz': [
    {
      question: "When did World War II end?",
      options: ["1945", "1944", "1946", "1943"],
      answer: 0
    },
    {
      question: "Who was the first Tudor monarch?",
      options: ["Henry VII", "Henry VIII", "Edward VI", "Mary I"],
      answer: 0
    }
  ],
  'map-quiz': [
    {
      question: "Which is the largest ocean?",
      options: ["Pacific", "Atlantic", "Indian", "Arctic"],
      answer: 0
    },
    {
      question: "What is the capital of Australia?",
      options: ["Canberra", "Sydney", "Melbourne", "Perth"],
      answer: 0
    }
  ]
};

export const memoryCards = {
  'vocab-match': [
    { term: "Benevolent", definition: "Kind and generous" },
    { term: "Ephemeral", definition: "Lasting for a short time" },
    { term: "Ubiquitous", definition: "Present everywhere" },
    { term: "Verbose", definition: "Using more words than needed" },
    { term: "Zealous", definition: "Enthusiastic and diligent" },
    { term: "Pragmatic", definition: "Practical and realistic" }
  ],
  'science-elements': [
    { term: "Au", definition: "Gold" },
    { term: "Fe", definition: "Iron" },
    { term: "Na", definition: "Sodium" },
    { term: "Ag", definition: "Silver" },
    { term: "Cu", definition: "Copper" },
    { term: "H", definition: "Hydrogen" }
  ],
  'geo-match': [
    { term: "France", definition: "Paris" },
    { term: "Japan", definition: "Tokyo" },
    { term: "Brazil", definition: "Brasília" },
    { term: "Egypt", definition: "Cairo" },
    { term: "India", definition: "New Delhi" },
    { term: "Spain", definition: "Madrid" }
  ]
};