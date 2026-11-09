/**
 * Deterministic, content-based urgency. Incident and deadline signals take
 * precedence over friendly wording; length, punctuation and local time do not.
 * This is an English heuristic, not a replacement for human incident review.
 */
export function calculateUrgency(message) {
  if (typeof message !== 'string' || !message.trim()) return 'Low'

  const text = message.toLowerCase().replace(/[’]/g, "'")
  // Remove explicit denials before matching, without suppressing other incidents
  // in the same message ("No outage, but the database connection is lost").
  const activeText = text
    .replace(/\b(?:not urgent|no (?:outage|emergency|data loss|security breach)|no rush)\b/g, '')
    .replace(/\b(?:server|site|website|service|system|database|production)(?: is| are)? not down\b/g, '')

  const criticalSignals = [
    /\b(?:server|site|website|service|system|database|production)\s+(?:(?:is|are|has been|went)\s+)?(?:down|offline|unavailable)\b/,
    /\b(?:database\s+)?connection\s+(?:is\s+)?lost\b/,
    /\b(?:outage|emergency|data loss|security breach|urgent|asap|immediately)\b/,
    /\b(?:losing|lost)\s+(?:customer\s+)?data\b/,
    /\b(?:all (?:users|customers)|everyone)\b.{0,40}\b(?:can't|cannot|unable to)\s+(?:log in|login|access)\b/,
  ]
  if (criticalSignals.some(pattern => pattern.test(activeText))) return 'High'

  // A polite request can still describe a real support problem.
  const problemSignals = /\b(?:failed|failing|error|bug|broken|crash(?:ing|ed)?|slow|timing out|timeout|not working|won't load|can't access|cannot access|can't log in|cannot log in|unable to)\b/
  if (problemSignals.test(text)) return 'Medium'

  // Routine questions, feedback, feature requests and greetings need no rush.
  const routineSignals = /\b(?:thank(?:s| you)?|appreciate|happy|love|great|excellent|wonderful|positive feedback|nice design|feature|could you add|business hours|how|what|when|where|hi|hello|hey)\b/
  if (routineSignals.test(text) || text.includes('?') || /\b(?:not urgent|no rush|no outage)\b/.test(text)) return 'Low'

  // Keep unfamiliar support content visible for ordinary review.
  return 'Medium'
}
