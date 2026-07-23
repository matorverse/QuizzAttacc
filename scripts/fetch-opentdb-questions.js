import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CATEGORY_MAP = [
  { topic: 'General Knowledge', categoryIds: [9, 22] }, // General Knowledge, Geography
  { topic: 'Science', categoryIds: [17, 18, 19] },       // Science & Nature, Computers, Mathematics
  { topic: 'History', categoryIds: [23, 20] },           // History, Mythology
  { topic: 'Pop Culture', categoryIds: [11, 12, 14, 15] },// Film, Music, Television, Video Games
  { topic: 'Sports', categoryIds: [21] },                // Sports
]

const DIFFICULTIES = ['easy', 'medium', 'hard']

function decodeHTMLEntities(text) {
  if (!text) return ''
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&deg;/g, '°')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&aacute;/g, 'á')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uuml;/g, 'ü')
    .replace(/&shy;/g, '')
    .replace(/&hellip;/g, '…')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
}

function escapeSQL(text) {
  return text.replace(/'/g, "''")
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchCategoryQuestions(categoryId, difficulty, retries = 3) {
  const url = `https://opentdb.com/api.php?amount=30&category=${categoryId}&difficulty=${difficulty}&type=multiple`
  console.log(`Fetching category ${categoryId} (${difficulty})...`)
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 429 || res.status === 503) {
        console.warn(`Rate limited (attempt ${attempt}/${retries}). Waiting 6 seconds...`)
        await delay(6000)
        continue
      }
      if (!res.ok) {
        console.warn(`HTTP error ${res.status}: ${res.statusText}`)
        return []
      }
      const data = await res.json()
      if (data.response_code === 0 && data.results) {
        return data.results
      } else if (data.response_code === 5) {
        console.warn(`Rate limited by OpenTDB (code 5). Waiting 6s...`)
        await delay(6000)
        continue
      }
      return []
    } catch (err) {
      console.error(`Fetch error (attempt ${attempt}):`, err.message)
      await delay(3000)
    }
  }
  return []
}

async function main() {
  const allQuestions = []
  const questionTextsSeen = new Set()

  for (const group of CATEGORY_MAP) {
    const topicName = group.topic
    console.log(`\n========================================`)
    console.log(`Processing Topic: ${topicName}`)
    console.log(`========================================`)

    for (const catId of group.categoryIds) {
      for (const diff of DIFFICULTIES) {
        const rawList = await fetchCategoryQuestions(catId, diff)
        
        for (const item of rawList) {
          const qText = decodeHTMLEntities(item.question).trim()
          if (!qText || questionTextsSeen.has(qText.toLowerCase())) continue
          questionTextsSeen.add(qText.toLowerCase())

          const correctAns = decodeHTMLEntities(item.correct_answer).trim()
          const incorrects = item.incorrect_answers.map(a => decodeHTMLEntities(a).trim())

          const options = [correctAns, ...incorrects]
          for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[options[i], options[j]] = [options[j], options[i]]
          }

          const correctIndex = options.indexOf(correctAns)

          allQuestions.push({
            topic: topicName,
            difficulty: diff,
            questionText: qText,
            options,
            correctAnswerIndex: correctIndex,
            explanation: `${correctAns} is the correct answer.`,
          })
        }

        // Wait 5.5 seconds between OpenTDB API requests to prevent 429 rate limits
        await delay(5500)
      }
    }
  }

  console.log(`\nTotal unique trivia questions collected: ${allQuestions.length}`)

  let sqlContent = `-- Quizexe OpenTDB Questions Seed Migration\n`
  sqlContent += `-- Generated ${new Date().toISOString()} from Open Trivia Database\n`
  sqlContent += `-- Total Questions: ${allQuestions.length}\n\n`

  const chunkSize = 25
  for (let i = 0; i < allQuestions.length; i += chunkSize) {
    const chunk = allQuestions.slice(i, i + chunkSize)
    sqlContent += `INSERT INTO questions (topic, difficulty, question_text, options, correct_answer_index, explanation) VALUES\n`
    
    const rows = chunk.map(q => {
      const topic = escapeSQL(q.topic)
      const diff = q.difficulty
      const qText = escapeSQL(q.questionText)
      const optionsJson = escapeSQL(JSON.stringify(q.options))
      const correctIdx = q.correctAnswerIndex
      const explanation = escapeSQL(q.explanation)

      return `('${topic}', '${diff}', '${qText}', '${optionsJson}', ${correctIdx}, '${explanation}')`
    })

    sqlContent += rows.join(',\n') + ';\n\n'
  }

  const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', '2026021601_seed_questions.sql')
  fs.writeFileSync(outputPath, sqlContent, 'utf-8')
  console.log(`Successfully written ${allQuestions.length} OpenTDB questions to: ${outputPath}`)
}

main()
