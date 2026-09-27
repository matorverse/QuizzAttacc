// Curated offline trivia question deck for local tavern duels and connectivity fallback

export interface OfflineQuestion {
    id: string
    topic: string
    difficulty: 'easy' | 'medium' | 'hard'
    question_text: string
    options: string[]
    correct_answer_index: number
    explanation: string
}

export const OFFLINE_QUESTIONS: OfflineQuestion[] = [
    // General Knowledge
    {
        id: 'q-gk-1',
        topic: 'General Knowledge',
        difficulty: 'easy',
        question_text: 'What nuts are traditionally used in the production of marzipan?',
        options: ['Peanuts', 'Walnuts', 'Pistachios', 'Almonds'],
        correct_answer_index: 3,
        explanation: 'Almonds are the essential ingredient ground into marzipan paste.',
    },
    {
        id: 'q-gk-2',
        topic: 'General Knowledge',
        difficulty: 'easy',
        question_text: 'In which cardinal direction does the Sun rise from on Earth?',
        options: ['West', 'South', 'East', 'North'],
        correct_answer_index: 2,
        explanation: 'Due to Earth’s counter-clockwise rotation, the Sun always rises in the East.',
    },
    {
        id: 'q-gk-3',
        topic: 'General Knowledge',
        difficulty: 'easy',
        question_text: 'How many colors are traditionally counted in a standard rainbow?',
        options: ['8', '7', '10', '9'],
        correct_answer_index: 1,
        explanation: 'Isaac Newton defined 7 rainbow colors: Red, Orange, Yellow, Green, Blue, Indigo, and Violet.',
    },
    {
        id: 'q-gk-4',
        topic: 'General Knowledge',
        difficulty: 'medium',
        question_text: 'What alcoholic spirit is primarily flavored with juniper berries?',
        options: ['Gin', 'Rum', 'Tequila', 'Vodka'],
        correct_answer_index: 0,
        explanation: 'Gin derives its predominant piney flavor from juniper berries (Juniperus communis).',
    },
    {
        id: 'q-gk-5',
        topic: 'General Knowledge',
        difficulty: 'medium',
        question_text: 'What was the original working name of the search engine Google in 1996?',
        options: ['BackRub', 'Netscape Navigator', 'SearchPro', 'CatMassage'],
        correct_answer_index: 0,
        explanation: 'Larry Page and Sergey Brin originally called their search engine BackRub because it analyzed back links.',
    },
    {
        id: 'q-gk-6',
        topic: 'General Knowledge',
        difficulty: 'hard',
        question_text: 'Which typographical symbol was historically considered the 27th letter of the English alphabet?',
        options: ['Ampersand (&)', 'Pilcrow (¶)', 'Tilde (~)', 'Interrobang (‽)'],
        correct_answer_index: 0,
        explanation: 'The ampersand (&) was recited at the end of the alphabet as "and per se and".',
    },

    // Science
    {
        id: 'q-sci-1',
        topic: 'Science',
        difficulty: 'easy',
        question_text: 'What is the chemical symbol for table salt (Sodium Chloride)?',
        options: ['NaCl', 'KCl', 'H2O', 'CO2'],
        correct_answer_index: 0,
        explanation: 'NaCl stands for Sodium (Na) and Chlorine (Cl).',
    },
    {
        id: 'q-sci-2',
        topic: 'Science',
        difficulty: 'easy',
        question_text: 'What is the closest planet to the Sun in our Solar System?',
        options: ['Venus', 'Mars', 'Mercury', 'Earth'],
        correct_answer_index: 2,
        explanation: 'Mercury orbits closest to the Sun at an average distance of ~58 million km.',
    },
    {
        id: 'q-sci-3',
        topic: 'Science',
        difficulty: 'medium',
        question_text: 'What organelle is known as the powerhouse of eukaryotic cells?',
        options: ['Ribosome', 'Mitochondria', 'Golgi apparatus', 'Nucleus'],
        correct_answer_index: 1,
        explanation: 'Mitochondria generate most of the cell’s supply of adenosine triphosphate (ATP).',
    },
    {
        id: 'q-sci-4',
        topic: 'Science',
        difficulty: 'medium',
        question_text: 'What is the most abundant gas in Earth’s atmosphere by volume?',
        options: ['Oxygen', 'Carbon Dioxide', 'Argon', 'Nitrogen'],
        correct_answer_index: 3,
        explanation: 'Nitrogen makes up roughly 78.08% of Earth’s atmosphere.',
    },
    {
        id: 'q-sci-5',
        topic: 'Science',
        difficulty: 'hard',
        question_text: 'What subatomic particle was discovered by J.J. Thomson in 1897 using cathode ray tubes?',
        options: ['Proton', 'Neutron', 'Electron', 'Quark'],
        correct_answer_index: 2,
        explanation: 'J.J. Thomson discovered the electron, the first subatomic particle identified.',
    },

    // History
    {
        id: 'q-hist-1',
        topic: 'History',
        difficulty: 'easy',
        question_text: 'Who was the first President of the United States under the Constitution?',
        options: ['Thomas Jefferson', 'George Washington', 'John Adams', 'Alexander Hamilton'],
        correct_answer_index: 1,
        explanation: 'George Washington served as the first U.S. President from 1789 to 1797.',
    },
    {
        id: 'q-hist-2',
        topic: 'History',
        difficulty: 'easy',
        question_text: 'In which year did the Titanic sink in the North Atlantic Ocean?',
        options: ['1912', '1905', '1920', '1898'],
        correct_answer_index: 0,
        explanation: 'The RMS Titanic struck an iceberg and sank on April 15, 1912.',
    },
    {
        id: 'q-hist-3',
        topic: 'History',
        difficulty: 'medium',
        question_text: 'Which ancient wonder was located in Alexandria, Egypt and guided sailors safely into harbor?',
        options: ['Colossus of Rhodes', 'Lighthouse of Alexandria', 'Hanging Gardens', 'Temple of Artemis'],
        correct_answer_index: 1,
        explanation: 'The Pharos of Alexandria was a towering lighthouse built by the Ptolemaic Kingdom.',
    },
    {
        id: 'q-hist-4',
        topic: 'History',
        difficulty: 'medium',
        question_text: 'The Magna Carta was signed by King John of England in which year?',
        options: ['1066', '1215', '1492', '1348'],
        correct_answer_index: 1,
        explanation: 'The Magna Carta was granted at Runnymede near Windsor on June 15, 1215.',
    },
    {
        id: 'q-hist-5',
        topic: 'History',
        difficulty: 'hard',
        question_text: 'Which Roman Emperor officially made Christianity the state religion with the Edict of Thessalonica in 380 AD?',
        options: ['Constantine the Great', 'Theodosius I', 'Marcus Aurelius', 'Justinian I'],
        correct_answer_index: 1,
        explanation: 'Emperor Theodosius I made Nicene Christianity the official state religion of the Roman Empire.',
    },

    // Pop Culture
    {
        id: 'q-pop-1',
        topic: 'Pop Culture',
        difficulty: 'easy',
        question_text: 'What is the name of the hobbit who inherits the One Ring in "The Lord of the Rings"?',
        options: ['Samwise Gamgee', 'Frodo Baggins', 'Bilbo Baggins', 'Pippin Took'],
        correct_answer_index: 1,
        explanation: 'Frodo Baggins is tasked with bringing the One Ring to Mount Doom.',
    },
    {
        id: 'q-pop-2',
        topic: 'Pop Culture',
        difficulty: 'easy',
        question_text: 'Which British rock band released the iconic 1969 album "Abbey Road"?',
        options: ['The Rolling Stones', 'The Beatles', 'Queen', 'The Who'],
        correct_answer_index: 1,
        explanation: 'The Beatles released Abbey Road featuring the famous zebra crossing cover.',
    },
    {
        id: 'q-pop-3',
        topic: 'Pop Culture',
        difficulty: 'medium',
        question_text: 'In the Marvel Cinematic Universe, what is the fictional African nation ruled by King T’Challa?',
        options: ['Latveria', 'Sokovia', 'Wakanda', 'Genosha'],
        correct_answer_index: 2,
        explanation: 'Wakanda is the technologically advanced homeland of Black Panther.',
    },
    {
        id: 'q-pop-4',
        topic: 'Pop Culture',
        difficulty: 'medium',
        question_text: 'What was the first feature-length animated film released by Walt Disney Studios in 1937?',
        options: ['Pinocchio', 'Snow White and the Seven Dwarfs', 'Bambi', 'Fantasia'],
        correct_answer_index: 1,
        explanation: 'Snow White and the Seven Dwarfs premiered in December 1937 as Disney’s first feature.',
    },
    {
        id: 'q-pop-5',
        topic: 'Pop Culture',
        difficulty: 'hard',
        question_text: 'Who directed the 1982 cult sci-fi film "Blade Runner" starring Harrison Ford?',
        options: ['Stanley Kubrick', 'James Cameron', 'Ridley Scott', 'Steven Spielberg'],
        correct_answer_index: 2,
        explanation: 'Ridley Scott directed Blade Runner, loosely adapted from Philip K. Dick’s novel.',
    },

    // Sports
    {
        id: 'q-sp-1',
        topic: 'Sports',
        difficulty: 'easy',
        question_text: 'How many players are on the court for one team in a regulation basketball game?',
        options: ['6', '5', '7', '4'],
        correct_answer_index: 1,
        explanation: 'Basketball is played with 5 players per team on the court.',
    },
    {
        id: 'q-sp-2',
        topic: 'Sports',
        difficulty: 'easy',
        question_text: 'In bowling, what term refers to knocking down all 10 pins with your first roll?',
        options: ['Spare', 'Strike', 'Split', 'Turkey'],
        correct_answer_index: 1,
        explanation: 'A strike scores 10 points plus the pins knocked down in the next two rolls.',
    },
    {
        id: 'q-sp-3',
        topic: 'Sports',
        difficulty: 'medium',
        question_text: 'Which nation has won the most FIFA World Cup tournaments in history?',
        options: ['Germany', 'Italy', 'Brazil', 'Argentina'],
        correct_answer_index: 2,
        explanation: 'Brazil has won 5 FIFA World Cup titles (1958, 1962, 1970, 1994, 2002).',
    },
    {
        id: 'q-sp-4',
        topic: 'Sports',
        difficulty: 'medium',
        question_text: 'In tennis, what specific score term represents zero points?',
        options: ['Deuce', 'Love', 'Fault', 'Nil'],
        correct_answer_index: 1,
        explanation: 'Love is derived from the French phrase "l’oeuf" (the egg), symbolizing zero.',
    },
    {
        id: 'q-sp-5',
        topic: 'Sports',
        difficulty: 'hard',
        question_text: 'How many meters is an official Olympic swimming pool in length?',
        options: ['25 meters', '50 meters', '75 meters', '100 meters'],
        correct_answer_index: 1,
        explanation: 'An Olympic-size pool measures exactly 50 meters in length.',
    },
]

export function getOfflineQuestions(topic?: string, difficulty?: string, count: number = 5): OfflineQuestion[] {
    let pool = [...OFFLINE_QUESTIONS]

    if (topic) {
        const byTopic = pool.filter((q) => q.topic.toLowerCase() === topic.toLowerCase())
        if (byTopic.length >= count) {
            pool = byTopic
        }
    }

    if (difficulty) {
        const byDiff = pool.filter((q) => q.difficulty === difficulty)
        if (byDiff.length >= count) {
            pool = byDiff
        }
    }

    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }

    return pool.slice(0, count)
}
