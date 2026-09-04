/**
 * CBT seed — starter bank: 3 subjects × 30 curriculum questions (JSS3),
 * every question with a written explanation.
 *
 * Run: npm run cbt:seed
 * Safe to re-run: upserts subjects, skips questions whose stem already exists.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Q = {
  topic: string;
  difficulty: number;
  stem: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
};

const ENGLISH: Q[] = [
  {
    topic: "Parts of Speech",
    difficulty: 1,
    stem: "Which of these is a common noun?",
    options: ["Lagos", "Chair", "Sarah", "Monday"],
    correctIndex: 1,
    explanation:
      "'Chair' names a general class of things, so it is a common noun. The others name particular people, places or days (proper nouns).",
  },
  {
    topic: "Parts of Speech",
    difficulty: 1,
    stem: "In the sentence 'She sings beautifully', the word 'beautifully' is:",
    options: ["An adjective", "A verb", "An adverb", "A noun"],
    correctIndex: 2,
    explanation:
      "'Beautifully' describes HOW the action (sings) is done, so it modifies the verb — that is an adverb.",
  },
  {
    topic: "Parts of Speech",
    difficulty: 2,
    stem: "Choose the correct plural of 'chief'.",
    options: ["Chieves", "Chiefs", "Chiefes", "Chievs"],
    correctIndex: 1,
    explanation:
      "Nouns ending in -f or -fe that are borrowed words simply add -s: chief → chiefs (like roof → roofs).",
  },
  {
    topic: "Parts of Speech",
    difficulty: 2,
    stem: "'The book on the table is mine.' The underlined phrase 'on the table' is a:",
    options: ["Noun phrase", "Prepositional phrase", "Verb phrase", "Clause"],
    correctIndex: 1,
    explanation:
      "'On the table' begins with the preposition 'on' and tells where — it is a prepositional phrase functioning as an adjective.",
  },
  {
    topic: "Tenses",
    difficulty: 1,
    stem: "She ____ to school every morning.",
    options: ["go", "goes", "gone", "going"],
    correctIndex: 1,
    explanation:
      "'Every morning' shows habitual present; third-person singular (she) takes 'goes'.",
  },
  {
    topic: "Tenses",
    difficulty: 2,
    stem: "By the time we arrived, the film ____.",
    options: ["has started", "had started", "have started", "starting"],
    correctIndex: 1,
    explanation:
      "An action completed before another past action takes the past perfect: 'had started'.",
  },
  {
    topic: "Tenses",
    difficulty: 2,
    stem: "I ____ my homework before dinner yesterday.",
    options: ["finish", "have finished", "had finished", "will finish"],
    correctIndex: 2,
    explanation:
      "The homework was completed before another past event (dinner yesterday) — past perfect: 'had finished'.",
  },
  {
    topic: "Punctuation",
    difficulty: 1,
    stem: "Which sentence is correctly punctuated?",
    options: ["Musas car is new", "Musa's car is new", "Musas' car is new", "Musa car's is new"],
    correctIndex: 1,
    explanation: "Singular possessive: add apostrophe + s — Musa's.",
  },
  {
    topic: "Punctuation",
    difficulty: 2,
    stem: "Choose the correctly punctuated sentence.",
    options: [
      'He asked, "Where are you going"',
      "He asked where are you going?",
      "He asked, where are you going.",
      'He asked "where are you going"?',
    ],
    correctIndex: 0,
    explanation:
      "A direct question inside quotation marks keeps its question mark inside the quotes and is introduced by a comma.",
  },
  {
    topic: "Punctuation",
    difficulty: 2,
    stem: "Which word needs an apostrophe? 'The boys books were wet.'",
    options: ["boys'", "boys", "book's", "wet"],
    correctIndex: 0,
    explanation: "Books belonging to several boys: plural possessive — boys'.",
  },
  {
    topic: "Vocabulary",
    difficulty: 1,
    stem: "Choose the word opposite in meaning to 'ancient'.",
    options: ["Old", "Modern", "Antique", "Aged"],
    correctIndex: 1,
    explanation: "'Ancient' means very old; its opposite is 'modern'.",
  },
  {
    topic: "Vocabulary",
    difficulty: 2,
    stem: "The word 'generous' most nearly means:",
    options: ["Greedy", "Kind and giving", "Angry", "Careless"],
    correctIndex: 1,
    explanation: "A generous person freely gives to others — kind and giving.",
  },
  {
    topic: "Vocabulary",
    difficulty: 2,
    stem: "Choose the synonym of 'diligent'.",
    options: ["Lazy", "Hardworking", "Rude", "Slow"],
    correctIndex: 1,
    explanation: "'Diligent' means showing steady, careful effort — hardworking.",
  },
  {
    topic: "Vocabulary",
    difficulty: 3,
    stem: "'The politician's speech was ambiguous.' 'Ambiguous' means:",
    options: ["Very clear", "Open to more than one meaning", "Too long", "Full of praise"],
    correctIndex: 1,
    explanation: "Ambiguous language can be understood in more than one way.",
  },
  {
    topic: "Concord",
    difficulty: 2,
    stem: "Neither the teacher nor the students ____ present.",
    options: ["was", "were", "is", "has"],
    correctIndex: 1,
    explanation:
      "With 'neither...nor', the verb agrees with the nearer subject ('students' — plural): were.",
  },
  {
    topic: "Concord",
    difficulty: 2,
    stem: "Each of the boys ____ a pen.",
    options: ["have", "has", "are having", "were having"],
    correctIndex: 1,
    explanation: "'Each' is singular, even when followed by a plural noun — 'has'.",
  },
  {
    topic: "Concord",
    difficulty: 2,
    stem: "Mathematics ____ my favourite subject.",
    options: ["are", "is", "were", "have been"],
    correctIndex: 1,
    explanation:
      "Subjects like Mathematics and Physics end in -s but name ONE subject, so they take a singular verb: is.",
  },
  {
    topic: "Spelling",
    difficulty: 1,
    stem: "Choose the correctly spelt word.",
    options: ["Recieve", "Receive", "Receeve", "Receve"],
    correctIndex: 1,
    explanation: "Remember: i before e except after c — receive.",
  },
  {
    topic: "Spelling",
    difficulty: 2,
    stem: "Choose the correctly spelt word (occasion).",
    options: ["Occassion", "Ocassion", "Occasion", "Ocasion"],
    correctIndex: 2,
    explanation: "'Occasion' has double c but single s.",
  },
  {
    topic: "Spelling",
    difficulty: 2,
    stem: "Choose the correctly spelt word (privilege).",
    options: ["Priviledge", "Privilage", "Privilege", "Previlage"],
    correctIndex: 2,
    explanation: "'Privilege' — there is no 'd' and the ending is -ege.",
  },
  {
    topic: "Comprehension Skills",
    difficulty: 2,
    stem: "A statement that gives the main idea of a passage is called:",
    options: ["The summary", "An example", "A conclusion", "An introduction"],
    correctIndex: 0,
    explanation: "The main idea restated briefly is the summary of the passage.",
  },
  {
    topic: "Comprehension Skills",
    difficulty: 2,
    stem: "The word 'it' in 'The bus was late because it broke down' refers to:",
    options: ["The word 'late'", "The bus", "The road", "The driver"],
    correctIndex: 1,
    explanation: "'It' replaces the noun phrase 'the bus' — that is its referent.",
  },
  {
    topic: "Comprehension Skills",
    difficulty: 3,
    stem: "A writer who describes a scene using the five senses is using:",
    options: ["Argument", "Figurative description", "Dialogue", "Summary"],
    correctIndex: 1,
    explanation:
      "Description that appeals to sight, sound, smell, taste and touch is (figurative/descriptive) imagery.",
  },
  {
    topic: "Figures of Speech",
    difficulty: 2,
    stem: "'The clouds cried all night.' This is an example of:",
    options: ["Simile", "Metaphor", "Personification", "Hyperbole"],
    correctIndex: 2,
    explanation: "Giving human ability (crying) to a non-human thing (clouds) is personification.",
  },
  {
    topic: "Figures of Speech",
    difficulty: 2,
    stem: "'As brave as a lion' is a:",
    options: ["Metaphor", "Simile", "Idiom", "Proverb"],
    correctIndex: 1,
    explanation: "A comparison using 'as...as' or 'like' is a simile.",
  },
  {
    topic: "Figures of Speech",
    difficulty: 3,
    stem: "'He is the pillar of the family' is a:",
    options: ["Simile", "Metaphor", "Hyperbole", "Irony"],
    correctIndex: 1,
    explanation: "It calls him a pillar directly, without 'like' or 'as' — a metaphor.",
  },
  {
    topic: "Writing",
    difficulty: 2,
    stem: "The opening paragraph of a formal letter after the addresses and date is the:",
    options: ["Conclusion", "Salutation", "Body", "Postscript"],
    correctIndex: 1,
    explanation: "After the addresses and date comes the salutation (Dear Sir,/Dear Madam,).",
  },
  {
    topic: "Writing",
    difficulty: 2,
    stem: "Which of these is a feature of an informal letter?",
    options: ["Two addresses", "One address (sender's)", "Ref number", "Headings and sub-headings"],
    correctIndex: 1,
    explanation:
      "An informal letter carries only the sender's address and a friendly greeting like 'Dear Ada,'.",
  },
  {
    topic: "Writing",
    difficulty: 3,
    stem: "A debate speech usually ends with:",
    options: ["A new argument", "A summary and conclusion", "A salutation only", "A list of books"],
    correctIndex: 1,
    explanation:
      "Debates close by restating the stand and summarising the arguments — the conclusion.",
  },
  {
    topic: "Listening & Speaking",
    difficulty: 2,
    stem: "The stressed syllable in 'deciSION' pattern: which syllable is stressed in 'record' when used as a noun (a record)?",
    options: ["First — RE-cord", "Second — re-CORD", "Both equally", "None"],
    correctIndex: 0,
    explanation:
      "As a noun, 'record' is stressed on the first syllable: RE-cord. As a verb (to record) it is re-CORD.",
  },
];

const MATHEMATICS: Q[] = [
  {
    topic: "Numbers",
    difficulty: 1,
    stem: "What is 3/4 as a percentage?",
    options: ["34%", "75%", "43%", "0.75%"],
    correctIndex: 1,
    explanation: "3/4 × 100 = 75%.",
  },
  {
    topic: "Numbers",
    difficulty: 1,
    stem: "Express 0.25 as a fraction in its lowest terms.",
    options: ["1/2", "1/4", "25/100", "2/5"],
    correctIndex: 1,
    explanation: "0.25 = 25/100 = 1/4 in lowest terms.",
  },
  {
    topic: "Numbers",
    difficulty: 2,
    stem: "Find the LCM of 12 and 18.",
    options: ["36", "6", "72", "108"],
    correctIndex: 0,
    explanation: "12 = 2²×3, 18 = 2×3². LCM = 2²×3² = 36.",
  },
  {
    topic: "Numbers",
    difficulty: 2,
    stem: "Find the HCF of 24 and 36.",
    options: ["12", "6", "72", "8"],
    correctIndex: 0,
    explanation: "Common factors of 24 and 36 are 1,2,3,4,6,12 — the highest is 12.",
  },
  {
    topic: "Numbers",
    difficulty: 2,
    stem: "Write 45 000 000 in standard form.",
    options: ["45 × 10⁶", "4.5 × 10⁷", "4.5 × 10⁶", "0.45 × 10⁸"],
    correctIndex: 1,
    explanation: "Standard form needs one non-zero digit before the point: 4.5 × 10⁷.",
  },
  {
    topic: "Numbers",
    difficulty: 3,
    stem: "Simplify: (2³ × 2⁴) ÷ 2²",
    options: ["2⁵", "2⁶", "2⁷", "2⁴"],
    correctIndex: 0,
    explanation: "2³×2⁴ = 2⁷; 2⁷ ÷ 2² = 2⁵ = 32.",
  },
  {
    topic: "Fractions",
    difficulty: 2,
    stem: "Simplify 2/3 + 1/6.",
    options: ["3/9", "5/6", "1/2", "4/6"],
    correctIndex: 1,
    explanation: "2/3 = 4/6, and 4/6 + 1/6 = 5/6.",
  },
  {
    topic: "Fractions",
    difficulty: 2,
    stem: "What is 3/5 of 45?",
    options: ["9", "15", "27", "25"],
    correctIndex: 2,
    explanation: "45 ÷ 5 = 9; 9 × 3 = 27.",
  },
  {
    topic: "Fractions",
    difficulty: 3,
    stem: "Simplify 1½ × 2/3.",
    options: ["1", "2/3", "3/2", "1/3"],
    correctIndex: 0,
    explanation: "1½ = 3/2; 3/2 × 2/3 = 6/6 = 1.",
  },
  {
    topic: "Percentages",
    difficulty: 2,
    stem: "A shirt costs ₦2 500 and is sold at a 20% discount. What is the sale price?",
    options: ["₦2 000", "₦2 100", "₦500", "₦2 300"],
    correctIndex: 0,
    explanation: "20% of 2500 = 500; 2500 − 500 = ₦2 000.",
  },
  {
    topic: "Percentages",
    difficulty: 2,
    stem: "A student scored 18 out of 24 in a test. What percentage is this?",
    options: ["68%", "75%", "80%", "72%"],
    correctIndex: 1,
    explanation: "18/24 × 100 = 75%.",
  },
  {
    topic: "Percentages",
    difficulty: 3,
    stem: "The price of a bag rose from ₦8 000 to ₦10 000. Find the percentage increase.",
    options: ["20%", "25%", "30%", "2%"],
    correctIndex: 1,
    explanation: "Increase = 2 000; 2 000/8 000 × 100 = 25%.",
  },
  {
    topic: "Algebra",
    difficulty: 1,
    stem: "If x + 7 = 12, then x =",
    options: ["4", "5", "7", "19"],
    correctIndex: 1,
    explanation: "Subtract 7 from both sides: x = 5.",
  },
  {
    topic: "Algebra",
    difficulty: 2,
    stem: "Simplify 3a + 5b − a + 2b.",
    options: ["2a + 7b", "4a + 7b", "2a + 3b", "3a + 7b"],
    correctIndex: 0,
    explanation: "Collect like terms: 3a − a = 2a; 5b + 2b = 7b.",
  },
  {
    topic: "Algebra",
    difficulty: 2,
    stem: "Solve: 2x − 4 = 10.",
    options: ["x = 3", "x = 5", "x = 7", "x = 8"],
    correctIndex: 2,
    explanation: "2x = 14, so x = 7.",
  },
  {
    topic: "Algebra",
    difficulty: 3,
    stem: "Expand (x + 3)(x + 2).",
    options: ["x² + 5x + 6", "x² + 6x + 5", "x² + x + 6", "x² + 5"],
    correctIndex: 0,
    explanation: "x·x + x·2 + 3·x + 3·2 = x² + 5x + 6.",
  },
  {
    topic: "Geometry",
    difficulty: 1,
    stem: "Angles on a straight line add up to:",
    options: ["90°", "180°", "270°", "360°"],
    correctIndex: 1,
    explanation: "Angles on a straight line are supplementary — they sum to 180°.",
  },
  {
    topic: "Geometry",
    difficulty: 2,
    stem: "Each interior angle of an equilateral triangle is:",
    options: ["60°", "90°", "120°", "45°"],
    correctIndex: 0,
    explanation: "180° ÷ 3 = 60° — all angles of an equilateral triangle are equal.",
  },
  {
    topic: "Geometry",
    difficulty: 2,
    stem: "The sum of interior angles of a quadrilateral is:",
    options: ["180°", "270°", "360°", "540°"],
    correctIndex: 2,
    explanation: "Two triangles make a quadrilateral: 2 × 180° = 360°.",
  },
  {
    topic: "Geometry",
    difficulty: 3,
    stem: "Two angles are complementary. One is 35°. The other is:",
    options: ["145°", "55°", "65°", "45°"],
    correctIndex: 1,
    explanation: "Complementary angles sum to 90°: 90 − 35 = 55°.",
  },
  {
    topic: "Mensuration",
    difficulty: 2,
    stem: "Find the area of a rectangle 12 cm long and 7 cm wide.",
    options: ["38 cm²", "84 cm²", "19 cm²", "72 cm²"],
    correctIndex: 1,
    explanation: "Area = length × breadth = 12 × 7 = 84 cm².",
  },
  {
    topic: "Mensuration",
    difficulty: 2,
    stem: "The perimeter of a square of side 9 cm is:",
    options: ["81 cm", "36 cm", "18 cm", "27 cm"],
    correctIndex: 1,
    explanation: "A square has 4 equal sides: 4 × 9 = 36 cm.",
  },
  {
    topic: "Mensuration",
    difficulty: 3,
    stem: "Find the circumference of a circle of radius 7 cm (take π = 22/7).",
    options: ["44 cm", "154 cm", "22 cm", "14 cm"],
    correctIndex: 0,
    explanation: "C = 2πr = 2 × 22/7 × 7 = 44 cm.",
  },
  {
    topic: "Mensuration",
    difficulty: 3,
    stem: "The area of a triangle with base 10 cm and height 6 cm is:",
    options: ["60 cm²", "30 cm²", "16 cm²", "20 cm²"],
    correctIndex: 1,
    explanation: "Area = ½ × base × height = ½ × 10 × 6 = 30 cm².",
  },
  {
    topic: "Statistics",
    difficulty: 2,
    stem: "Find the mean of 4, 6, 8, 10 and 12.",
    options: ["6", "8", "9", "10"],
    correctIndex: 1,
    explanation: "Sum = 40; 40 ÷ 5 = 8.",
  },
  {
    topic: "Statistics",
    difficulty: 2,
    stem: "Find the median of 3, 9, 4, 7, 5.",
    options: ["5", "4", "7", "9"],
    correctIndex: 0,
    explanation: "Order them: 3, 4, 5, 7, 9 — the middle value is 5.",
  },
  {
    topic: "Statistics",
    difficulty: 3,
    stem: "The mode of 2, 3, 3, 5, 7, 3, 8 is:",
    options: ["3", "2", "5", "8"],
    correctIndex: 0,
    explanation: "3 appears three times — more than any other value.",
  },
  {
    topic: "Ratio & Proportion",
    difficulty: 2,
    stem: "Share ₦600 between Ada and Bola in the ratio 2:3. Ada gets:",
    options: ["₦240", "₦300", "₦360", "₦200"],
    correctIndex: 0,
    explanation: "Total parts = 5; one part = 600 ÷ 5 = 120; Ada = 2 × 120 = ₦240.",
  },
  {
    topic: "Ratio & Proportion",
    difficulty: 3,
    stem: "If 3 pens cost ₦45, what do 7 pens cost?",
    options: ["₦90", "₦105", "₦115", "₦135"],
    correctIndex: 1,
    explanation: "One pen = 45 ÷ 3 = ₦15; 7 × 15 = ₦105.",
  },
  {
    topic: "Simple Equations",
    difficulty: 3,
    stem: "Three times a number plus 4 equals 19. The number is:",
    options: ["3", "4", "5", "6"],
    correctIndex: 2,
    explanation: "3n + 4 = 19 → 3n = 15 → n = 5.",
  },
];

const BASIC_SCIENCE: Q[] = [
  {
    topic: "Living Things",
    difficulty: 1,
    stem: "The basic unit of life is the:",
    options: ["Cell", "Tissue", "Organ", "Nucleus"],
    correctIndex: 0,
    explanation: "The cell is the smallest unit that carries out all life processes.",
  },
  {
    topic: "Living Things",
    difficulty: 2,
    stem: "Which organelle is the 'powerhouse' of the cell?",
    options: ["Nucleus", "Mitochondrion", "Ribosome", "Vacuole"],
    correctIndex: 1,
    explanation: "Mitochondria release energy from food — hence 'powerhouse'.",
  },
  {
    topic: "Living Things",
    difficulty: 2,
    stem: "Green plants make their own food by a process called:",
    options: ["Respiration", "Photosynthesis", "Transpiration", "Digestion"],
    correctIndex: 1,
    explanation: "Photosynthesis uses sunlight, water and carbon dioxide to make glucose.",
  },
  {
    topic: "Living Things",
    difficulty: 2,
    stem: "Which gas do plants take in for photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    correctIndex: 2,
    explanation: "Carbon dioxide + water, with light energy, give glucose and oxygen.",
  },
  {
    topic: "Living Things",
    difficulty: 3,
    stem: "An organism that makes its own food is called:",
    options: ["A heterotroph", "An autotroph", "A saprophyte", "A parasite"],
    correctIndex: 1,
    explanation: "Self-feeders (like green plants) are autotrophs.",
  },
  {
    topic: "Human Body",
    difficulty: 1,
    stem: "Which organ pumps blood around the body?",
    options: ["Lungs", "Liver", "Heart", "Kidney"],
    correctIndex: 2,
    explanation: "The heart is the muscular pump of the circulatory system.",
  },
  {
    topic: "Human Body",
    difficulty: 2,
    stem: "The organ that removes waste from the blood is the:",
    options: ["Kidney", "Heart", "Stomach", "Spleen"],
    correctIndex: 0,
    explanation: "Kidneys filter the blood and make urine.",
  },
  {
    topic: "Human Body",
    difficulty: 2,
    stem: "Digestion of food begins in the:",
    options: ["Stomach", "Mouth", "Small intestine", "Liver"],
    correctIndex: 1,
    explanation: "Saliva in the mouth starts digesting starch — digestion begins in the mouth.",
  },
  {
    topic: "Human Body",
    difficulty: 3,
    stem: "Which blood cells help fight infection?",
    options: ["Red blood cells", "White blood cells", "Platelets", "Plasma"],
    correctIndex: 1,
    explanation: "White blood cells defend the body against germs.",
  },
  {
    topic: "Matter",
    difficulty: 1,
    stem: "Water boiling and turning to steam is a change of:",
    options: ["State", "Element", "Mass", "Colour"],
    correctIndex: 0,
    explanation: "Liquid → gas is a change of state (boiling/evaporation).",
  },
  {
    topic: "Matter",
    difficulty: 2,
    stem: "The three states of matter are:",
    options: ["Solid, liquid, gas", "Water, air, sand", "Hot, warm, cold", "Metal, non-metal, gas"],
    correctIndex: 0,
    explanation: "Matter commonly exists as solid, liquid or gas.",
  },
  {
    topic: "Matter",
    difficulty: 2,
    stem: "Which of these is a chemical change?",
    options: ["Melting ice", "Tearing paper", "Rusting iron", "Dissolving sugar"],
    correctIndex: 2,
    explanation:
      "Rusting forms a new substance (iron oxide) — a chemical change. The others keep the same substance.",
  },
  {
    topic: "Matter",
    difficulty: 3,
    stem: "The smallest particle of an element that still keeps its properties is the:",
    options: ["Molecule", "Atom", "Ion", "Electron"],
    correctIndex: 1,
    explanation: "The atom is the smallest particle of an element.",
  },
  {
    topic: "Energy",
    difficulty: 1,
    stem: "The energy of a moving car is:",
    options: ["Potential energy", "Kinetic energy", "Chemical energy", "Sound energy"],
    correctIndex: 1,
    explanation: "Energy of motion is kinetic energy.",
  },
  {
    topic: "Energy",
    difficulty: 2,
    stem: "Which energy conversion happens in a torch (flashlight)?",
    options: [
      "Light → electrical",
      "Chemical → electrical → light",
      "Heat → light",
      "Sound → electrical",
    ],
    correctIndex: 1,
    explanation:
      "The battery's chemical energy becomes electrical energy, then light (and a little heat).",
  },
  {
    topic: "Energy",
    difficulty: 2,
    stem: "Heat transfer through a metal spoon in hot soup is mainly by:",
    options: ["Conduction", "Convection", "Radiation", "Evaporation"],
    correctIndex: 0,
    explanation: "Heat travels through the solid metal by conduction.",
  },
  {
    topic: "Energy",
    difficulty: 3,
    stem: "Heat from the sun reaches the earth by:",
    options: ["Conduction", "Convection", "Radiation", "Conduction and convection"],
    correctIndex: 2,
    explanation: "Space is empty, so only radiation (infrared) can cross it.",
  },
  {
    topic: "Force & Motion",
    difficulty: 2,
    stem: "The unit of force is the:",
    options: ["Joule", "Newton", "Watt", "Pascal"],
    correctIndex: 1,
    explanation: "Force is measured in newtons (N).",
  },
  {
    topic: "Force & Motion",
    difficulty: 2,
    stem: "Friction always acts:",
    options: ["In the direction of motion", "Against the motion", "Upwards", "Downwards"],
    correctIndex: 1,
    explanation: "Friction opposes relative motion between surfaces.",
  },
  {
    topic: "Force & Motion",
    difficulty: 3,
    stem: "A body moving in a circle at constant speed is accelerating because its:",
    options: ["Speed changes", "Direction changes", "Mass changes", "Energy is constant"],
    correctIndex: 1,
    explanation:
      "Acceleration is a change in velocity; turning changes direction, so velocity changes.",
  },
  {
    topic: "Electricity",
    difficulty: 1,
    stem: "A path through which electric current flows is called a:",
    options: ["Circuit", "Cell", "Filament", "Field"],
    correctIndex: 0,
    explanation: "Current flows around a closed circuit.",
  },
  {
    topic: "Electricity",
    difficulty: 2,
    stem: "Which material allows electricity to pass through it easily?",
    options: ["Rubber", "Copper", "Plastic", "Wood"],
    correctIndex: 1,
    explanation: "Copper is a good conductor; the others are insulators.",
  },
  {
    topic: "Electricity",
    difficulty: 3,
    stem: "In a series circuit with two bulbs, if one bulb blows:",
    options: [
      "The other stays on",
      "The other goes off too",
      "The battery charges",
      "Current increases",
    ],
    correctIndex: 1,
    explanation: "A series circuit has one path — a break anywhere stops all current.",
  },
  {
    topic: "Ecology",
    difficulty: 1,
    stem: "Green plants in a food chain are called:",
    options: ["Consumers", "Producers", "Decomposers", "Predators"],
    correctIndex: 1,
    explanation: "Producers (plants) make food that feeds the rest of the chain.",
  },
  {
    topic: "Ecology",
    difficulty: 2,
    stem: "Organisms that break down dead matter are:",
    options: ["Producers", "Herbivores", "Decomposers", "Carnivores"],
    correctIndex: 2,
    explanation: "Bacteria and fungi decompose dead matter and recycle nutrients.",
  },
  {
    topic: "Ecology",
    difficulty: 3,
    stem: "In the food chain 'grass → grasshopper → frog → snake', the snake is a:",
    options: ["Producer", "Primary consumer", "Secondary consumer", "Tertiary consumer"],
    correctIndex: 3,
    explanation: "Grass produces; grasshopper is primary; frog secondary; snake tertiary consumer.",
  },
  {
    topic: "Health",
    difficulty: 1,
    stem: "Malaria is transmitted by the:",
    options: ["Housefly", "Female Anopheles mosquito", "Tsetse fly", "Blackfly"],
    correctIndex: 1,
    explanation: "The female Anopheles mosquito transmits the malaria parasite.",
  },
  {
    topic: "Health",
    difficulty: 2,
    stem: "Which of these is a personal hygiene habit?",
    options: [
      "Washing hands before eating",
      "Sharing towels",
      "Leaving waste in the open",
      "Stagnant water near the house",
    ],
    correctIndex: 0,
    explanation: "Hand-washing before eating prevents disease spread — a key hygiene habit.",
  },
  {
    topic: "Health",
    difficulty: 2,
    stem: "Vaccination protects the body by:",
    options: [
      "Killing all germs in the air",
      "Making the body produce immunity against a disease",
      "Cooling the body",
      "Cleaning the blood",
    ],
    correctIndex: 1,
    explanation:
      "Vaccines train the immune system to recognise a germ without causing the full disease.",
  },
  {
    topic: "Science & Society",
    difficulty: 3,
    stem: "Which practice best reduces air pollution in a city?",
    options: ["Burning refuse", "Using solar power", "More generator use", "Burning coal"],
    correctIndex: 1,
    explanation: "Solar power is clean — no smoke or exhaust is produced.",
  },
];

const BANK = [
  {
    slug: "english-jss3",
    name: "English Studies",
    classLevel: "jss3",
    department: "junior",
    questions: ENGLISH,
  },
  {
    slug: "mathematics-jss3",
    name: "Mathematics",
    classLevel: "jss3",
    department: "junior",
    questions: MATHEMATICS,
  },
  {
    slug: "basic-science-jss3",
    name: "Basic Science",
    classLevel: "jss3",
    department: "junior",
    questions: BASIC_SCIENCE,
  },
];

async function main() {
  for (const subject of BANK) {
    const s = await prisma.cbtSubject.upsert({
      where: { slug: subject.slug },
      update: {
        name: subject.name,
        classLevel: subject.classLevel,
        department: subject.department,
      },
      create: {
        slug: subject.slug,
        name: subject.name,
        classLevel: subject.classLevel,
        department: subject.department,
      },
    });
    let added = 0;
    for (const q of subject.questions) {
      const exists = await prisma.cbtQuestion.findFirst({
        where: { subjectId: s.id, stem: q.stem },
      });
      if (exists) continue;
      await prisma.cbtQuestion.create({
        data: {
          ...q,
          subjectId: s.id,
          options: q.options,
          status: "published",
          source: "curriculum",
        },
      });
      added += 1;
    }
    console.log(`${subject.name}: +${added} questions (skipped existing)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
