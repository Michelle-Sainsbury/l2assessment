import { readFileSync } from 'node:fs'
import { calculateUrgency } from '../src/utils/urgencyScorer.js'

const { testMessages } = JSON.parse(readFileSync(new URL('../sample-messages.json', import.meta.url)))
const extra = [
  'Please help, our production server is down. Thank you!',
  'THANK YOU FOR THE EXCELLENT HELP!!!',
  "Thanks, but I can't access the dashboard",
  'No outage, thank you!',
  'Security breach detected',
]
console.table([
  ...testMessages.map(({ id, message }) => ({ example: `Sample ${id}`, message, urgency: calculateUrgency(message) })),
  ...extra.map((message, index) => ({ example: `New ${index + 1}`, message, urgency: calculateUrgency(message) })),
])
