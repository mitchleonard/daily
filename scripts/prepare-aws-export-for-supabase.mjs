import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const [sourceDirectory, outputDirectory] = process.argv.slice(2)

if (!sourceDirectory || !outputDirectory) {
  throw new Error('Usage: node scripts/prepare-aws-export-for-supabase.mjs <aws-export-directory> <output-directory>')
}

const source = resolve(sourceDirectory)
const output = resolve(outputDirectory)

function unmarshallValue(attribute) {
  const [type, value] = Object.entries(attribute)[0]

  switch (type) {
    case 'S': return value
    case 'N': return Number(value)
    case 'NULL': return null
    case 'BOOL': return value
    case 'L': return value.map(unmarshallValue)
    case 'M': return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, unmarshallValue(nested)]))
    default: throw new Error(`Unsupported DynamoDB attribute type: ${type}`)
  }
}

function unmarshallItem(item) {
  return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, unmarshallValue(value)]))
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replaceAll("'", "''")}'`
}

function sqlJson(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`
}

function habitRow(habit) {
  return `(${sqlString(habit.userId)}, ${sqlString(habit.id)}, null, ${sqlString(habit.name)}, ${sqlString(habit.icon)}, ${sqlString(habit.color)}, ${sqlJson(habit.scheduleDays)}, ${sqlString(habit.startDate)}::date, ${sqlString(habit.createdAt)}::timestamptz, ${sqlString(habit.updatedAt)}::timestamptz, ${habit.archivedAt ? `${sqlString(habit.archivedAt)}::timestamptz` : 'null'}, ${habit.sortOrder})`
}

function logRow(log) {
  return `(${sqlString(log.userId)}, ${sqlString(log.id)}, null, ${sqlString(log.habitId)}, ${sqlString(log.date)}::date, ${sqlString(log.status)}, ${sqlString(log.createdAt)}::timestamptz, ${sqlString(log.updatedAt)}::timestamptz)`
}

function chunks(values, size) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size))
}

async function readExport(filename) {
  const document = JSON.parse(await readFile(`${source}/${filename}`, 'utf8'))
  if (!Array.isArray(document.Items)) throw new Error(`${filename} does not contain DynamoDB Items`)
  return document.Items.map(unmarshallItem)
}

const [habits, logs] = await Promise.all([
  readExport('habits-dynamodb.json'),
  readExport('logs-dynamodb.json'),
])

const requiredHabitFields = ['userId', 'id', 'name', 'icon', 'color', 'scheduleDays', 'startDate', 'createdAt', 'updatedAt', 'sortOrder']
const requiredLogFields = ['userId', 'id', 'habitId', 'date', 'status', 'createdAt', 'updatedAt']

for (const [label, records, fields] of [
  ['habit', habits, requiredHabitFields],
  ['log', logs, requiredLogFields],
]) {
  for (const [index, record] of records.entries()) {
    for (const field of fields) {
      if (record[field] === undefined) throw new Error(`${label} ${index} is missing ${field}`)
    }
  }
}

await mkdir(output, { recursive: true })

const legacyUserIds = [...new Set([...habits, ...logs].map((record) => record.userId))].sort()
const identitySql = `insert into private.daily_identity_mappings (legacy_cognito_user_id)\nvalues\n${legacyUserIds.map((id) => `(${sqlString(id)})`).join(',\n')}\non conflict (legacy_cognito_user_id) do nothing;\n`
await writeFile(`${output}/00-identity-mappings.sql`, identitySql)

const habitSql = `insert into public.habits (legacy_cognito_user_id, id, user_id, name, icon, color, schedule_days, start_date, created_at, updated_at, archived_at, sort_order)\nvalues\n${habits.map(habitRow).join(',\n')}\non conflict (legacy_cognito_user_id, id) do update set\n  name = excluded.name, icon = excluded.icon, color = excluded.color, schedule_days = excluded.schedule_days,\n  start_date = excluded.start_date, created_at = excluded.created_at, updated_at = excluded.updated_at,\n  archived_at = excluded.archived_at, sort_order = excluded.sort_order;\n`
await writeFile(`${output}/01-habits.sql`, habitSql)

for (const [index, logChunk] of chunks(logs, 400).entries()) {
  const logSql = `insert into public.habit_logs (legacy_cognito_user_id, id, user_id, habit_id, date, status, created_at, updated_at)\nvalues\n${logChunk.map(logRow).join(',\n')}\non conflict (legacy_cognito_user_id, id) do update set\n  habit_id = excluded.habit_id, date = excluded.date, status = excluded.status,\n  created_at = excluded.created_at, updated_at = excluded.updated_at;\n`
  await writeFile(`${output}/${String(index + 2).padStart(2, '0')}-logs.sql`, logSql)
}

console.log(JSON.stringify({
  source: basename(source),
  habits: habits.length,
  logs: logs.length,
  legacyUsers: legacyUserIds.length,
  files: 2 + Math.ceil(logs.length / 400),
}, null, 2))
