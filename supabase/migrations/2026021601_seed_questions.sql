-- Quizexe Question Seed Data
-- 75 high-quality questions across 5 topics × 3 difficulties (15 questions per topic)

-- ============================================================================
-- GENERAL KNOWLEDGE
-- ============================================================================

-- Easy
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('General Knowledge', 'easy', 'What is the capital of France?', 
 '["London", "Berlin", "Paris", "Madrid"]', 2, 
 'Paris is the capital and most populous city of France.'),

('General Knowledge', 'easy', 'How many continents are there on Earth?', 
 '["5", "6", "7", "8"]', 2, 
 'There are 7 continents: Africa, Antarctica, Asia, Europe, North America, Oceania, and South America.'),

('General Knowledge', 'easy', 'What is the largest ocean on Earth?', 
 '["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"]', 3, 
 'The Pacific Ocean is the largest and deepest ocean, covering more than 30% of Earth''s surface.'),

('General Knowledge', 'easy', 'Which planet is closest to the Sun?', 
 '["Venus", "Mercury", "Earth", "Mars"]', 1, 
 'Mercury is the smallest planet in the Solar System and the closest to the Sun.'),

('General Knowledge', 'easy', 'What primary color when mixed with blue makes green?', 
 '["Red", "Yellow", "Orange", "Purple"]', 1, 
 'Mixing yellow and blue subtractive primaries produces green.');

-- Medium
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('General Knowledge', 'medium', 'In what year did World War II end?', 
 '["1943", "1944", "1945", "1946"]', 2, 
 'World War II ended in 1945 with the surrender of Germany in May and Japan in September.'),

('General Knowledge', 'medium', 'What is the smallest country in the world by area?', 
 '["Monaco", "Vatican City", "San Marino", "Liechtenstein"]', 1, 
 'Vatican City is the smallest country, with an area of approximately 0.44 square kilometers.'),

('General Knowledge', 'medium', 'Which language has the most native speakers worldwide?', 
 '["English", "Mandarin Chinese", "Spanish", "Hindi"]', 1, 
 'Mandarin Chinese has over 900 million native speakers, making it the most spoken first language.'),

('General Knowledge', 'medium', 'What is the capital city of Australia?', 
 '["Sydney", "Melbourne", "Canberra", "Brisbane"]', 2, 
 'Canberra was selected as the capital of Australia in 1908 as a compromise between Sydney and Melbourne.'),

('General Knowledge', 'medium', 'Which element has the chemical symbol "Au"?', 
 '["Silver", "Gold", "Copper", "Aluminum"]', 1, 
 'Gold''s symbol Au comes from the Latin word for gold, "aurum".');

-- Hard
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('General Knowledge', 'hard', 'What is the official language of Brazil?', 
 '["Spanish", "Portuguese", "French", "English"]', 1, 
 'Portuguese is the official language of Brazil, a legacy of Portuguese colonization.'),

('General Knowledge', 'hard', 'Which country has the most time zones?', 
 '["Russia", "USA", "France", "China"]', 2, 
 'France has 12 time zones due to its overseas territories, more than any other country.'),

('General Knowledge', 'hard', 'What is the currency of Switzerland?', 
 '["Euro", "Swiss Franc", "Krone", "Pound"]', 1, 
 'The Swiss Franc (CHF) is the official currency of Switzerland and Liechtenstein.'),

('General Knowledge', 'hard', 'What is the largest landlocked country in the world?', 
 '["Mongolia", "Kazakhstan", "Bolivia", "Chad"]', 1, 
 'Kazakhstan is the world''s largest landlocked country, spanning 2.7 million square kilometers.'),

('General Knowledge', 'hard', 'In which year was the United Nations founded?', 
 '["1919", "1939", "1945", "1950"]', 2, 
 'The UN was established after WWII on October 24, 1945, to prevent future global conflicts.');

-- ============================================================================
-- SCIENCE
-- ============================================================================

-- Easy
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('Science', 'easy', 'What planet is known as the Red Planet?', 
 '["Venus", "Mars", "Jupiter", "Saturn"]', 1, 
 'Mars appears red due to iron oxide (rust) on its surface.'),

('Science', 'easy', 'What is the chemical symbol for water?', 
 '["O2", "H2O", "CO2", "H2"]', 1, 
 'Water is composed of two hydrogen atoms and one oxygen atom (H₂O).'),

('Science', 'easy', 'How many bones are in the adult human body?', 
 '["186", "206", "226", "246"]', 1, 
 'The adult human skeleton has 206 bones, while babies are born with about 270 that fuse over time.'),

('Science', 'easy', 'What gas do plants absorb from the atmosphere for photosynthesis?', 
 '["Oxygen", "Carbon Dioxide", "Nitrogen", "Helium"]', 1, 
 'Plants absorb CO2 during photosynthesis to make sugars.'),

('Science', 'easy', 'Which force keeps us on the ground?', 
 '["Magnetism", "Gravity", "Friction", "Tension"]', 1, 
 'Gravity pulls objects toward the center of the Earth.');

-- Medium
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('Science', 'medium', 'What is the speed of light in vacuum?', 
 '["299,792 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"]', 0, 
 'Light travels at approximately 299,792 kilometers per second in a vacuum.'),

('Science', 'medium', 'What is the powerhouse of the cell?', 
 '["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"]', 2, 
 'Mitochondria generate most of the cell''s ATP (energy) through cellular respiration.'),

('Science', 'medium', 'What is the most abundant gas in Earth''s atmosphere?', 
 '["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"]', 2, 
 'Nitrogen makes up about 78% of Earth''s atmosphere, followed by oxygen at 21%.'),

('Science', 'medium', 'What unit measures electrical resistance?', 
 '["Volt", "Ampere", "Ohm", "Watt"]', 2, 
 'The Ohm (symbol Ω) is the SI unit of electrical resistance.'),

('Science', 'medium', 'What is the hardest natural substance on Earth?', 
 '["Gold", "Iron", "Diamond", "Quartz"]', 2, 
 'Diamond scores 10 on the Mohs scale of mineral hardness.');

-- Hard
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('Science', 'hard', 'What is the half-life of Carbon-14?', 
 '["1,730 years", "5,730 years", "10,730 years", "15,730 years"]', 1, 
 'Carbon-14 has a half-life of approximately 5,730 years, making it useful for radiocarbon dating.'),

('Science', 'hard', 'What particle is responsible for mass according to the Standard Model?', 
 '["Photon", "Electron", "Higgs Boson", "Neutrino"]', 2, 
 'The Higgs boson, discovered in 2012, gives other particles mass through the Higgs field.'),

('Science', 'hard', 'What is the pH of pure water at 25°C?', 
 '["6", "7", "8", "9"]', 1, 
 'Pure water has a neutral pH of 7 at 25°C, meaning equal concentrations of H⁺ and OH⁻ ions.'),

('Science', 'hard', 'What temperature is absolute zero in Celsius?', 
 '["-100°C", "-273.15°C", "-459.67°C", "0°C"]', 1, 
 'Absolute zero is 0 Kelvin or -273.15 degrees Celsius.'),

('Science', 'hard', 'Which enzyme breaks down starch into sugars in human saliva?', 
 '["Pepsin", "Amylase", "Lipase", "Trypsin"]', 1, 
 'Salivary amylase begins carbohydrate digestion in the mouth.');

-- ============================================================================
-- HISTORY
-- ============================================================================

-- Easy
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('History', 'easy', 'Who was the first President of the United States?', 
 '["Thomas Jefferson", "George Washington", "John Adams", "Benjamin Franklin"]', 1, 
 'George Washington served as the first U.S. President from 1789 to 1797.'),

('History', 'easy', 'In which year did the Titanic sink?', 
 '["1910", "1911", "1912", "1913"]', 2, 
 'The RMS Titanic sank on April 15, 1912, after hitting an iceberg on its maiden voyage.'),

('History', 'easy', 'Which ancient wonder is still standing today?', 
 '["Hanging Gardens of Babylon", "Colossus of Rhodes", "Great Pyramid of Giza", "Lighthouse of Alexandria"]', 2, 
 'The Great Pyramid of Giza is the only ancient wonder that remains largely intact.'),

('History', 'easy', 'Who discovered gravity after seeing an apple fall?', 
 '["Albert Einstein", "Isaac Newton", "Galileo Galilei", "Nikola Tesla"]', 1, 
 'Sir Isaac Newton formulated the law of universal gravitation.'),

('History', 'easy', 'Which civilization built the Colosseum in Rome?', 
 '["Ancient Greeks", "Romans", "Egyptians", "Persians"]', 1, 
 'The Colosseum was completed by the Flavian dynasty of Rome in AD 80.');

-- Medium
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('History', 'medium', 'Who wrote the "I Have a Dream" speech?', 
 '["Malcolm X", "Martin Luther King Jr.", "Rosa Parks", "Nelson Mandela"]', 1, 
 'Martin Luther King Jr. delivered this iconic speech during the 1963 March on Washington.'),

('History', 'medium', 'What year did the Berlin Wall fall?', 
 '["1987", "1988", "1989", "1990"]', 2, 
 'The Berlin Wall fell on November 9, 1989, symbolizing the end of the Cold War.'),

('History', 'medium', 'Which empire built Machu Picchu?', 
 '["Aztec", "Maya", "Inca", "Olmec"]', 2, 
 'Machu Picchu was built by the Inca Empire in the 15th century in Peru.'),

('History', 'medium', 'Who was the first female Prime Minister of the United Kingdom?', 
 '["Theresa May", "Margaret Thatcher", "Angela Merkel", "Indira Gandhi"]', 1, 
 'Margaret Thatcher served as UK Prime Minister from 1979 to 1990.'),

('History', 'medium', 'Which war was fought between the North and South regions in the USA?', 
 '["Revolutionary War", "American Civil War", "War of 1812", "Mexican-American War"]', 1, 
 'The American Civil War was fought from 1861 to 1865 over state rights and slavery.');

-- Hard
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('History', 'hard', 'What was the name of the first artificial satellite launched into space?', 
 '["Explorer 1", "Sputnik 1", "Vanguard 1", "Telstar 1"]', 1, 
 'Sputnik 1 was launched by the Soviet Union on October 4, 1957, starting the Space Age.'),

('History', 'hard', 'Who was the longest-reigning British monarch before Elizabeth II?', 
 '["Queen Victoria", "King George III", "King Henry VIII", "Queen Elizabeth I"]', 0, 
 'Queen Victoria reigned for 63 years (1837-1901) before Elizabeth II surpassed her record.'),

('History', 'hard', 'What treaty ended World War I?', 
 '["Treaty of Paris", "Treaty of Versailles", "Treaty of Ghent", "Treaty of Vienna"]', 1, 
 'The Treaty of Versailles was signed on June 28, 1919, officially ending WWI.'),

('History', 'hard', 'Who was the first Emperor of China?', 
 '["Wu Zetian", "Qin Shi Huang", "Kublai Khan", "Han Wudi"]', 1, 
 'Qin Shi Huang unified China in 221 BC and established the Qin dynasty.'),

('History', 'hard', 'Which naval battle in 1805 confirmed British naval supremacy over France?', 
 '["Battle of Waterloo", "Battle of Trafalgar", "Battle of Midway", "Battle of Jutland"]', 1, 
 'Admiral Lord Nelson defeated the French and Spanish fleets at Trafalgar in 1805.');

-- ============================================================================
-- POP CULTURE
-- ============================================================================

-- Easy
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('Pop Culture', 'easy', 'Who played Iron Man in the Marvel Cinematic Universe?', 
 '["Chris Evans", "Chris Hemsworth", "Robert Downey Jr.", "Mark Ruffalo"]', 2, 
 'Robert Downey Jr. portrayed Tony Stark/Iron Man from 2008 to 2019.'),

('Pop Culture', 'easy', 'What is the name of Harry Potter''s owl?', 
 '["Errol", "Pigwidgeon", "Hedwig", "Fawkes"]', 2, 
 'Hedwig is Harry''s loyal snowy owl, a gift from Hagrid for his 11th birthday.'),

('Pop Culture', 'easy', 'Which streaming service produced "Stranger Things"?', 
 '["Hulu", "Netflix", "Disney+", "Amazon Prime"]', 1, 
 'Stranger Things is a Netflix original series that premiered in 2016.'),

('Pop Culture', 'easy', 'What color are the Simpsons characters?', 
 '["Blue", "Green", "Yellow", "Orange"]', 2, 
 'The Simpsons creators chose bright yellow to catch viewers'' attention.'),

('Pop Culture', 'easy', 'Who sings the hit single "Bad Guy"?', 
 '["Taylor Swift", "Billie Eilish", "Ariana Grande", "Dua Lipa"]', 1, 
 'Billie Eilish released "Bad Guy" in 2019, winning multiple Grammy Awards.');

-- Medium
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('Pop Culture', 'medium', 'What year did the first iPhone release?', 
 '["2005", "2006", "2007", "2008"]', 2, 
 'Apple released the first iPhone on June 29, 2007, revolutionizing smartphones.'),

('Pop Culture', 'medium', 'Who directed "The Dark Knight" trilogy?', 
 '["Zack Snyder", "Christopher Nolan", "Tim Burton", "James Gunn"]', 1, 
 'Christopher Nolan directed the critically acclaimed Dark Knight trilogy (2005-2012).'),

('Pop Culture', 'medium', 'What is the best-selling video game of all time?', 
 '["Grand Theft Auto V", "Tetris", "Minecraft", "Wii Sports"]', 2, 
 'Minecraft has sold over 300 million copies, making it the best-selling game ever.'),

('Pop Culture', 'medium', 'Which pop icon is known as the "King of Pop"?', 
 '["Elvis Presley", "Michael Jackson", "Prince", "Freddie Mercury"]', 1, 
 'Michael Jackson is globally recognized as the King of Pop.'),

('Pop Culture', 'medium', 'What fictional kingdom is the setting for Disney''s "Frozen"?', 
 '["Arendelle", "Genovia", "Aldovia", "Duloc"]', 0, 
 'Elsa and Anna rule the Nordic-inspired kingdom of Arendelle.');

-- Hard
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('Pop Culture', 'hard', 'What was the first feature-length animated movie ever released?', 
 '["Fantasia", "Snow White and the Seven Dwarfs", "Pinocchio", "Bambi"]', 1, 
 'Snow White and the Seven Dwarfs (1937) was Disney''s first full-length animated feature.'),

('Pop Culture', 'hard', 'Which band has the most Grammy Awards?', 
 '["The Beatles", "U2", "Beyoncé", "Quincy Jones"]', 1, 
 'U2 has won 22 Grammy Awards, the most for any band in history.'),

('Pop Culture', 'hard', 'What is the highest-grossing film of all time (not adjusted for inflation)?', 
 '["Avengers: Endgame", "Avatar", "Titanic", "Star Wars: The Force Awakens"]', 1, 
 'Avatar (2009) holds the record with over $2.9 billion in worldwide box office revenue.'),

('Pop Culture', 'hard', 'What was the first video game played in space?', 
 '["Tetris", "Pac-Man", "Space Invaders", "Pong"]', 0, 
 'Russian cosmonaut Aleksandr A. Serebrov played Game Boy Tetris in space in 1993.'),

('Pop Culture', 'hard', 'Who was the first rap group inducted into the Rock and Roll Hall of Fame?', 
 '["N.W.A", "Run-D.M.C.", "Grandmaster Flash and the Furious Five", "Beastie Boys"]', 2, 
 'Grandmaster Flash and the Furious Five were inducted in 2007.');

-- ============================================================================
-- SPORTS
-- ============================================================================

-- Easy
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('Sports', 'easy', 'How many players are on a soccer team on the field?', 
 '["9", "10", "11", "12"]', 2, 
 'Each soccer team has 11 players on the field, including the goalkeeper.'),

('Sports', 'easy', 'What sport is played at Wimbledon?', 
 '["Golf", "Tennis", "Cricket", "Badminton"]', 1, 
 'Wimbledon is the oldest tennis tournament in the world, held annually in London.'),

('Sports', 'easy', 'How many points is a touchdown worth in American football?', 
 '["3", "6", "7", "8"]', 1, 
 'A touchdown is worth 6 points, with the option for an extra point or two-point conversion.'),

('Sports', 'easy', 'In bowling, what is the score of a perfect game?', 
 '["200", "250", "300", "400"]', 2, 
 'Rolling 12 consecutive strikes in ten-pin bowling yields a maximum score of 300.'),

('Sports', 'easy', 'How long is a standard marathon?', 
 '["20 miles", "26.2 miles", "30 miles", "13.1 miles"]', 1, 
 'A standard marathon covers 26.2 miles or 42.195 kilometers.');

-- Medium
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('Sports', 'medium', 'Which country has won the most FIFA World Cups?', 
 '["Germany", "Argentina", "Brazil", "Italy"]', 2, 
 'Brazil has won the FIFA World Cup 5 times (1958, 1962, 1970, 1994, 2002).'),

('Sports', 'medium', 'What is the diameter of a basketball hoop in inches?', 
 '["16 inches", "18 inches", "20 inches", "22 inches"]', 1, 
 'A regulation basketball hoop has an 18-inch diameter rim.'),

('Sports', 'medium', 'Who holds the record for most Olympic gold medals?', 
 '["Usain Bolt", "Michael Phelps", "Simone Biles", "Carl Lewis"]', 1, 
 'Michael Phelps won 23 Olympic gold medals in swimming across four Olympic Games.'),

('Sports', 'medium', 'Which tennis tournament is played on clay courts?', 
 '["US Open", "Wimbledon", "French Open", "Australian Open"]', 2, 
 'The French Open (Roland Garros) is the only Grand Slam tournament played on clay.'),

('Sports', 'medium', 'How many overs does each team get in a T20 cricket match?', 
 '["10", "20", "50", "100"]', 1, 
 'In Twenty20 cricket, each team bats for a maximum of 20 overs.');

-- Hard
INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES
('Sports', 'hard', 'What is the only sport to have been played on the moon?', 
 '["Baseball", "Golf", "Frisbee", "Javelin"]', 1, 
 'Alan Shepard hit two golf balls on the moon during the Apollo 14 mission in 1971.'),

('Sports', 'hard', 'In what year were women first allowed to compete in the Olympic marathon?', 
 '["1972", "1976", "1980", "1984"]', 3, 
 'Women''s marathon was added to the Olympics in 1984 at the Los Angeles Games.'),

('Sports', 'hard', 'What is the maximum break in snooker?', 
 '["147", "155", "167", "180"]', 0, 
 'A maximum break of 147 is achieved by potting all reds with blacks, then all colors in order.'),

('Sports', 'hard', 'Which driver holds the record for the most Formula 1 World Championship titles?', 
 '["Ayrton Senna", "Michael Schumacher & Lewis Hamilton", "Sebastian Vettel", "Max Verstappen"]', 1, 
 'Michael Schumacher and Lewis Hamilton are tied with 7 World Championships each.'),

('Sports', 'hard', 'What country won the first ever FIFA World Cup in 1930?', 
 '["Uruguay", "Argentina", "Brazil", "France"]', 0, 
 'Uruguay won the inaugural World Cup on home soil, defeating Argentina 4-2 in the final.');
