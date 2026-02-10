/**
 * ELIZA - A Computer Program For the Study of Natural Language Communication
 * Based on Joseph Weizenbaum's 1966 paper
 *
 * This is a classic implementation of the ELIZA pattern-matching chatbot.
 */

// Word reflections - swap pronouns between user and ELIZA
const REFLECTIONS = {
  'am': 'are',
  'are': 'am',
  'was': 'were',
  'were': 'was',
  'i': 'you',
  'me': 'you',
  'my': 'your',
  'mine': 'yours',
  'you': 'i',
  'your': 'my',
  'yours': 'mine',
  'myself': 'yourself',
  'yourself': 'myself',
  'i\'m': 'you\'re',
  'you\'re': 'i\'m',
  'i\'ve': 'you\'ve',
  'you\'ve': 'i\'ve',
  'i\'ll': 'you\'ll',
  'you\'ll': 'i\'ll',
  'i\'d': 'you\'d',
  'you\'d': 'i\'d'
};

/**
 * ELIZA Script - Keywords, patterns, and responses
 * Based on the DOCTOR script from the 1966 paper
 *
 * Each keyword has:
 * - rank: precedence (higher ranks match first)
 * - patterns: array of [decomposition, [reassembly rules]]
 */
const SCRIPT = {
  'sorry': {
    rank: 0,
    patterns: [
      [
        /.*/, // Match anything
        [
          "Please don't apologize.",
          "Apologies are not necessary.",
          "What feelings do you have when you apologize?",
          "I've told you that apologies are not required."
        ]
      ]
    ]
  },

  'remember': {
    rank: 5,
    patterns: [
      [
        /(.*)you remember(.*)/i,
        [
          "Do you often think of $2?",
          "Does thinking of $2 bring anything else to mind?",
          "What else do you remember?",
          "Why do you remember $2 just now?",
          "What in the present situation reminds you of $2?",
          "What is the connection between me and $2?"
        ]
      ],
      [
        /(.*)do i remember(.*)/i,
        [
          "Did you think I would forget $2?",
          "Why do you think I should recall $2 now?",
          "What about $2?",
          "You mentioned $2."
        ]
      ]
    ]
  },

  'if': {
    rank: 3,
    patterns: [
      [
        /(.*)if(.*)/i,
        [
          "Do you think it's likely that $2?",
          "Do you wish that $2?",
          "What do you think about $2?",
          "Really, if $2?"
        ]
      ]
    ]
  },

  'dreamt': {
    rank: 4,
    patterns: [
      [
        /(.*)you dreamt(.*)/i,
        [
          "Really, $2?",
          "Have you ever fantasied $2 while you were awake?",
          "Have you dreamt $2 before?"
        ]
      ]
    ]
  },

  'dream': {
    rank: 3,
    patterns: [
      [
        /.*/,
        [
          "What does that dream suggest to you?",
          "Do you dream often?",
          "What persons appear in your dreams?",
          "Don't you believe that dream has something to do with your problem?"
        ]
      ]
    ]
  },

  'perhaps': {
    rank: 0,
    patterns: [
      [
        /.*/,
        [
          "You don't seem quite certain.",
          "Why the uncertain tone?",
          "Can't you be more positive?",
          "You aren't sure?",
          "Don't you know?"
        ]
      ]
    ]
  },

  'name': {
    rank: 15,
    patterns: [
      [
        /.*/,
        [
          "I am not interested in names.",
          "I've told you before, I don't care about names - please continue."
        ]
      ]
    ]
  },

  'computer': {
    rank: 50,
    patterns: [
      [
        /.*/,
        [
          "Do computers worry you?",
          "Why do you mention computers?",
          "What do you think machines have to do with your problem?",
          "Don't you think computers can help people?",
          "What about machines worries you?"
        ]
      ]
    ]
  },

  'am': {
    rank: 0,
    patterns: [
      [
        /(.*)am i(.*)/i,
        [
          "Do you believe you are $2?",
          "Would you want to be $2?",
          "You wish I would tell you you are $2?",
          "What would it mean if you were $2?"
        ]
      ],
      [
        /.*/,
        [
          "Why do you say 'am'?",
          "I don't understand that."
        ]
      ]
    ]
  },

  'are': {
    rank: 0,
    patterns: [
      [
        /(.*)are you(.*)/i,
        [
          "Why are you interested in whether I am $2 or not?",
          "Would you prefer if I weren't $2?",
          "Perhaps I am $2 in your fantasies.",
          "Do you sometimes think I am $2?"
        ]
      ],
      [
        /(.*)are(.*)/i,
        [
          "Did you think they might not be $2?",
          "Would you like it if they were not $2?",
          "What if they were not $2?",
          "Possibly they are $2."
        ]
      ]
    ]
  },

  'your': {
    rank: 0,
    patterns: [
      [
        /(.*)your(.*)/i,
        [
          "Why are you concerned over my $2?",
          "What about your own $2?",
          "Are you worried about someone else's $2?",
          "Really, my $2?"
        ]
      ]
    ]
  },

  'was': {
    rank: 2,
    patterns: [
      [
        /(.*)was you(.*)/i,
        [
          "What if you were $2?",
          "Do you think you were $2?",
          "Were you $2?",
          "What would it mean if you were $2?",
          "What does '$2' suggest to you?"
        ]
      ],
      [
        /(.*)you was(.*)/i,
        [
          "Were you really?",
          "Why do you tell me you were $2 now?",
          "Perhaps I already knew you were $2."
        ]
      ],
      [
        /(.*)was i(.*)/i,
        [
          "Would you like to believe I was $2?",
          "What suggests that I was $2?",
          "What do you think?",
          "Perhaps I was $2.",
          "What if I had been $2?"
        ]
      ]
    ]
  },

  'i': {
    rank: 0,
    patterns: [
      [
        /(.*)i (want|need)(.*)/i,
        [
          "What would it mean to you if you got $3?",
          "Why do you want $3?",
          "Suppose you got $3 soon.",
          "What if you never got $3?",
          "What would getting $3 mean to you?",
          "What does wanting $3 have to do with this discussion?"
        ]
      ],
      [
        /(.*)i am (sad|unhappy|depressed|sick)(.*)/i,
        [
          "I am sorry to hear you are $2.",
          "Do you think coming here will help you not to be $2?",
          "I'm sure it's not pleasant to be $2.",
          "Can you explain what made you $2?"
        ]
      ],
      [
        /(.*)i am (happy|elated|glad|better)(.*)/i,
        [
          "How have I helped you to be $2?",
          "Has your treatment made you $2?",
          "What makes you $2 just now?",
          "Can you explain why you are suddenly $2?"
        ]
      ],
      [
        /(.*)i (believe|think|feel)(.*)/i,
        [
          "Do you really think so?",
          "But you are not sure you $3?",
          "Do you really doubt you $3?"
        ]
      ],
      [
        /(.*)i(.*)you(.*)/i,
        [
          "Perhaps in your fantasy we $2 each other.",
          "Do you wish to $2 me?",
          "You seem to need to $2 me.",
          "Do you $2 anyone else?"
        ]
      ],
      [
        /(.*)i am(.*)/i,
        [
          "Is it because you are $2 that you came to me?",
          "How long have you been $2?",
          "Do you believe it normal to be $2?",
          "Do you enjoy being $2?"
        ]
      ],
      [
        /(.*)i can't(.*)/i,
        [
          "How do you know you can't $2?",
          "Have you tried?",
          "Perhaps you could $2 now.",
          "Do you really want to be able to $2?"
        ]
      ],
      [
        /(.*)i don't(.*)/i,
        [
          "Don't you really $2?",
          "Why don't you $2?",
          "Do you wish to be able to $2?",
          "Does that trouble you?"
        ]
      ],
      [
        /(.*)i feel(.*)/i,
        [
          "Tell me more about such feelings.",
          "Do you often feel $2?",
          "Do you enjoy feeling $2?",
          "Of what does feeling $2 remind you?"
        ]
      ]
    ]
  },

  'you': {
    rank: 0,
    patterns: [
      [
        /(.*)you remind me of(.*)/i,
        [
          // DIT pattern from paper
          "In what way?",
          "What resemblance do you see?",
          "What does that similarity suggest to you?",
          "What other connections do you see?",
          "What do you suppose that resemblance means?",
          "What is the connection, do you suppose?",
          "Could there really be some connection?",
          "How?"
        ]
      ],
      [
        /(.*)you are(.*)/i,
        [
          "What makes you think I am $2?",
          "Does it please you to believe I am $2?",
          "Do you sometimes wish you were $2?",
          "Perhaps you would like to be $2."
        ]
      ],
      [
        /(.*)you(.*)me(.*)/i,
        [
          "Why do you think I $2 you?",
          "You like to think I $2 you - don't you?",
          "What makes you think I $2 you?",
          "Really, I $2 you?",
          "Do you wish to believe I $2 you?",
          "Suppose I did $2 you - what would that mean?",
          "Does someone else believe I $2 you?"
        ]
      ],
      [
        /(.*)you(.*)/i,
        [
          "We were discussing you - not me.",
          "Oh, I $2?",
          "You're not really talking about me - are you?",
          "What are your feelings now?"
        ]
      ]
    ]
  },

  'yes': {
    rank: 0,
    patterns: [
      [
        /.*/,
        [
          "You seem quite positive.",
          "You are sure.",
          "I see.",
          "I understand."
        ]
      ]
    ]
  },

  'no': {
    rank: 0,
    patterns: [
      [
        /.*/,
        [
          "Are you saying 'no' just to be negative?",
          "You are being a bit negative.",
          "Why not?",
          "Why 'no'?"
        ]
      ]
    ]
  },

  'my': {
    rank: 2,
    patterns: [
      [
        /(.*)my (mother|father|brother|sister|wife|husband|son|daughter|family)(.*)/i,
        [
          "Tell me more about your family.",
          "Who else in your family $3?",
          "Your $2?",
          "What else comes to mind when you think of your $2?"
        ]
      ],
      [
        /(.*)my(.*)/i,
        [
          "Your $2?",
          "Why do you say your $2?",
          "Does that suggest anything else which belongs to you?",
          "Is it important to you that $2?"
        ]
      ]
    ]
  },

  'can': {
    rank: 0,
    patterns: [
      [
        /(.*)can you(.*)/i,
        [
          "You believe I can $2 don't you?",
          "You want me to be able to $2?",
          "Perhaps you would like to be able to $2 yourself."
        ]
      ],
      [
        /(.*)can i(.*)/i,
        [
          "Whether or not you can $2 depends on you more than on me.",
          "Do you want to be able to $2?",
          "Perhaps you don't want to $2."
        ]
      ]
    ]
  },

  'what': {
    rank: 0,
    patterns: [
      [
        /.*/,
        [
          "Why do you ask?",
          "Does that question interest you?",
          "What is it you really want to know?",
          "Are such questions much on your mind?",
          "What answer would please you most?",
          "What do you think?",
          "What comes to your mind when you ask that?",
          "Have you asked such questions before?",
          "Have you asked anyone else?"
        ]
      ]
    ]
  },

  'because': {
    rank: 0,
    patterns: [
      [
        /.*/,
        [
          "Is that the real reason?",
          "Don't any other reasons come to mind?",
          "Does that reason seem to explain anything else?",
          "What other reasons might there be?"
        ]
      ]
    ]
  },

  'why': {
    rank: 0,
    patterns: [
      [
        /(.*)why don't you(.*)/i,
        [
          "Do you believe I don't $2?",
          "Perhaps I will $2 in good time.",
          "Should you $2 yourself?",
          "You want me to $2?"
        ]
      ],
      [
        /(.*)why can't i(.*)/i,
        [
          "Do you think you should be able to $2?",
          "Do you want to be able to $2?",
          "Do you believe this will help you to $2?",
          "Have you any idea why you can't $2?"
        ]
      ],
      [
        /.*/,
        [
          "Why do you ask?",
          "Does that question interest you?",
          "What is it you really want to know?",
          "Are such questions much on your mind?",
          "What answer would please you most?",
          "What do you think?",
          "What comes to your mind when you ask that?"
        ]
      ]
    ]
  },

  'everyone': {
    rank: 2,
    patterns: [
      [
        /(.*)everyone(.*)/i,
        [
          "Really, everyone?",
          "Surely not everyone.",
          "Can you think of anyone in particular?",
          "Who, for example?",
          "You are thinking of a very special person.",
          "Who, may I ask?",
          "Someone special perhaps?",
          "You have a particular person in mind, don't you?",
          "Who do you think you're talking about?"
        ]
      ]
    ]
  },

  'everybody': {
    rank: 2,
    patterns: [
      [
        /(.*)everybody(.*)/i,
        [
          "Really, everybody?",
          "Surely not everybody.",
          "Can you think of anyone in particular?",
          "Who, for example?",
          "You are thinking of a very special person.",
          "Who, may I ask?",
          "Someone special perhaps?",
          "You have a particular person in mind, don't you?",
          "Who do you think you're talking about?"
        ]
      ]
    ]
  },

  'nobody': {
    rank: 2,
    patterns: [
      [
        /(.*)nobody(.*)/i,
        [
          "Really, nobody?",
          "Surely someone.",
          "Can you think of anyone in particular?",
          "Who, for example?",
          "You are thinking of a very special person.",
          "Who, may I ask?",
          "Someone special perhaps?",
          "You have a particular person in mind, don't you?",
          "Who do you think you're talking about?"
        ]
      ]
    ]
  },

  'always': {
    rank: 1,
    patterns: [
      [
        /.*/,
        [
          "Can you think of a specific example?",
          "When?",
          "What incident are you thinking of?",
          "Really, always?"
        ]
      ]
    ]
  },

  'alike': {
    rank: 10,
    patterns: [
      [
        /.*/,
        [
          "In what way?",
          "What resemblance do you see?",
          "What does that similarity suggest to you?",
          "What other connections do you see?",
          "What do you suppose that resemblance means?",
          "What is the connection, do you suppose?",
          "Could there really be some connection?",
          "How?"
        ]
      ]
    ]
  },

  'like': {
    rank: 10,
    patterns: [
      [
        /(.*)am like(.*)/i,
        [
          "In what way?",
          "What resemblance do you see?",
          "What does that similarity suggest to you?",
          "What other connections do you see?",
          "Could there really be some connection?",
          "How?"
        ]
      ],
      [
        /(.*)is like(.*)/i,
        [
          "In what way?",
          "What resemblance do you see?",
          "What does that similarity suggest to you?",
          "What other connections do you see?",
          "Could there really be some connection?",
          "How?"
        ]
      ],
      [
        /(.*)like(.*)/i,
        [
          "In what way?",
          "What resemblance do you see?"
        ]
      ]
    ]
  }
};

// Default responses when no keyword matches
const DEFAULT_RESPONSES = [
  "Please tell me more.",
  "I'm not sure I understand you fully.",
  "Please go on.",
  "What does that suggest to you?",
  "Do you feel strongly about discussing such things?",
  "That is interesting.",
  "Tell me more about that.",
  "Can you elaborate on that?"
];

/**
 * ELIZA Engine Class
 */
export class ElizaEngine {
  constructor() {
    this.script = SCRIPT;
    this.reflections = REFLECTIONS;
    this.defaultResponses = DEFAULT_RESPONSES;
    this.memory = []; // For MEMORY mechanism from the paper
    this.responseIndices = {}; // Track which response to use next for each pattern
  }

  /**
   * Get a response from ELIZA for the given input
   * @param {string} input - User input text
   * @returns {string} - ELIZA's response
   */
  getResponse(input) {
    // Normalize input
    input = input.toLowerCase().trim();

    // Remove punctuation except apostrophes
    input = input.replace(/[^a-z\s']/g, '');

    if (!input) {
      return "Please tell me something.";
    }

    // Find matching keywords and their ranks
    const matches = [];
    for (const [keyword, keywordData] of Object.entries(this.script)) {
      const keywordRegex = new RegExp(`\\b${keyword.toLowerCase()}\\b`);
      if (keywordRegex.test(input)) {
        matches.push({ keyword, rank: keywordData.rank, data: keywordData });
      }
    }

    // Sort by rank (highest first)
    matches.sort((a, b) => b.rank - a.rank);

    // Try each keyword match in order of rank
    for (const match of matches) {
      const response = this.tryKeyword(input, match.keyword, match.data);
      if (response) {
        return response;
      }
    }

    // No keyword matched - use default response or memory
    if (this.memory.length > 0 && Math.random() < 0.3) {
      return this.memory.shift(); // Pull from memory
    }

    return this.getDefaultResponse();
  }

  /**
   * Try to match input against a keyword's patterns
   */
  tryKeyword(input, keyword, keywordData) {
    for (let i = 0; i < keywordData.patterns.length; i++) {
      const [pattern, responses] = keywordData.patterns[i];
      const match = input.match(pattern);

      if (match) {
        // Get the next response for this pattern (cycle through responses)
        const patternKey = `${keyword}-${i}`;
        if (!this.responseIndices[patternKey]) {
          this.responseIndices[patternKey] = 0;
        }

        const responseIndex = this.responseIndices[patternKey];
        let response = responses[responseIndex];

        // Update index for next time
        this.responseIndices[patternKey] = (responseIndex + 1) % responses.length;

        // Apply reflections and substitutions
        response = this.substituteMatches(response, match);

        return response;
      }
    }

    return null;
  }

  /**
   * Substitute captured groups and apply reflections
   */
  substituteMatches(response, match) {
    // Replace $1, $2, etc. with captured groups
    for (let i = 1; i < match.length; i++) {
      if (match[i]) {
        let substitution = match[i].trim();

        // Apply word reflections
        substitution = this.reflect(substitution);

        response = response.replace(new RegExp('\\$' + i, 'g'), substitution);
      }
    }

    return response;
  }

  /**
   * Apply word reflections (swap pronouns)
   */
  reflect(text) {
    const words = text.split(' ');
    const reflected = words.map(word => {
      const lower = word.toLowerCase();
      if (this.reflections[lower]) {
        return this.reflections[lower];
      }
      return word;
    });
    return reflected.join(' ');
  }

  /**
   * Get a random default response
   */
  getDefaultResponse() {
    const index = Math.floor(Math.random() * this.defaultResponses.length);
    return this.defaultResponses[index];
  }

  /**
   * Get initial greeting
   */
  getGreeting() {
    return "How do you do. Please tell me your problem.";
  }
}

export default ElizaEngine;
