# ELIZA

A faithful recreation of Joseph Weizenbaum's classic 1966 ELIZA chatbot, specifically the DOCTOR script that simulates a Rogerian psychotherapist.

## About

ELIZA was one of the first chatbot programs, created at MIT between 1964-1966. It demonstrated that simple pattern matching and response generation could create the illusion of understanding and empathy. The program became famous for fooling people into believing they were talking to a real therapist, despite Weizenbaum's warnings about attributing human-like understanding to machines.

## Implementation

This implementation is based directly on Weizenbaum's January 1966 paper in *Communications of the ACM*, including:

### Core Features

1. **Keyword Matching with Ranks**: Keywords have precedence levels - higher-ranked keywords are matched first (e.g., "computer" has rank 50, while "sorry" has rank 0)

2. **Decomposition Rules**: Pattern matching using regular expressions to break down user input into components

3. **Reassembly Rules**: Response templates that use captured components from decomposition, with multiple responses per pattern that cycle through to avoid repetition

4. **Word Reflections**: Automatic transformation of pronouns (I ↔ you, my ↔ your, etc.) to maintain conversational flow

5. **Default Responses**: Content-free remarks when no keywords match ("Please tell me more", "Go on", etc.)

### Classic DOCTOR Script Keywords

The implementation includes all major keywords from the original DOCTOR script:

- **High rank (special topics)**: computer (50), name (15), alike/like (10)
- **Memory-related**: remember (5), dreamt (4), dream (3), if (3)
- **Emotional**: sad, unhappy, depressed, sick, happy, elated, glad, better
- **Universal quantifiers**: everyone, everybody, nobody, always (2)
- **Pronouns and relationships**: i, you, my, your, my mother/father/etc. (2)
- **Modal verbs**: can, was/were (2)
- **Question words**: what, why, because
- **Responses**: yes, no, sorry, perhaps

### Example Conversation

```
ELIZA: HOW DO YOU DO. PLEASE TELL ME YOUR PROBLEM.

You: Men are all alike.
ELIZA: IN WHAT WAY?

You: They're always bugging us about something or other.
ELIZA: CAN YOU THINK OF A SPECIFIC EXAMPLE?

You: Well, my boyfriend made me come here.
ELIZA: YOUR BOYFRIEND MADE YOU COME HERE?

You: He says I'm depressed much of the time.
ELIZA: I AM SORRY TO HEAR YOU ARE DEPRESSED.
```

## Technical Details

### Pattern Matching

The engine uses JavaScript regular expressions for pattern matching:
- `(.*)` captures any text
- Keywords are matched case-insensitively
- Captured groups are referenced in responses as $1, $2, etc.
- Word reflections are applied to captured text before substitution

### Response Selection

For each decomposition pattern, multiple reassembly rules are provided. The engine cycles through responses to avoid repetitive replies, tracking which response was last used for each pattern.

### Interface

The chat interface features a classic 1960s terminal aesthetic:
- Black background with green (user) and cyan (ELIZA) text
- Monospace font
- ELIZA's responses are displayed in uppercase, as in the original
- Simple, distraction-free design

## Running the App

If you have the dev server running:

Visit: **http://localhost:3000?app=eliza**

Or if using subdomain routing: **http://eliza.localhost:3000**

## Historical Context

From Weizenbaum's paper:

> "It is said that to explain is to explain away. This maxim is nowhere so well fulfilled as in the area of computer programming... once a particular program is unmasked, once its inner workings are explained in language sufficiently plain to induce understanding, its magic crumbles away."

Despite its simplicity, ELIZA had a profound impact:
- Many users attributed understanding and empathy to the program
- Some refused to believe it was "just a program"
- It sparked important debates about AI, consciousness, and human-computer interaction
- Weizenbaum himself became concerned about people's willingness to confide in machines

## References

- Weizenbaum, J. (1966). "ELIZA—A Computer Program For the Study of Natural Language Communication Between Man And Machine". *Communications of the ACM* 9(1): 36-45.
- Weizenbaum's original implementation was written in MAD-SLIP for the IBM 7094
- This implementation preserves the spirit and methodology of the original while using modern JavaScript

## License

This is a historical recreation for educational purposes. The original ELIZA concept and DOCTOR script are in the public domain.
