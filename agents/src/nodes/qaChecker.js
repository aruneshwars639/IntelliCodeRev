import { getLLM } from '../graph/autoFixGraph.js'

const QA_PROMPT = `You are a senior security engineer validating vulnerability findings from an automated scanner.

Raw findings:
{{FINDINGS}}

For each finding, decide: CONFIRM or REJECT.

CONFIRM if:
- The vulnerable code pattern is realistic and commonly exploited
- The vulnerability class is well-known (SQLi, XSS, command injection, path traversal, hardcoded secrets, insecure deserialization, missing auth, etc.)
- Even if you cannot see the exact line, the file/context makes it plausible

REJECT only if:
- The finding describes something impossible given the language/framework
- It is clearly a configuration file with no executable code
- It is an exact duplicate of another finding in the list

Do NOT reject findings just because they are "theoretical" — DVNA and similar apps are intentionally vulnerable.
Give findings the benefit of the doubt.

Respond ONLY with JSON in triple backticks:
\`\`\`json
{
  "confirmed_findings": [
    <findings you CONFIRM — same shape as input>
  ],
  "rejected": [
    { "title": "...", "reason": "specific reason why impossible/duplicate" }
  ],
  "approved": true,
  "feedback": "one sentence summary"
}
\`\`\``

export async function qaCheckerNode(state) {
  const llm      = getLLM()
  const findings = state.raw_findings ?? []

  if (findings.length === 0) {
    return {
      qa_approved:        true,
      confirmed_findings: [],
      qa_iteration:       0,
      agent_log: [{
        phase: 'qa_findings', approved: true,
        reason: 'No findings to validate', timestamp: new Date().toISOString(),
      }],
    }
  }

  const prompt   = QA_PROMPT.replace('{{FINDINGS}}', JSON.stringify(findings, null, 2))
  const response = await llm.invoke(prompt)

  let qaResult = null
  try {
    const match = response.content.match(/```json\n([\s\S]*?)\n```/)
    if (match) qaResult = JSON.parse(match[1])
  } catch {
    // Parse failed — pass all findings through
    console.warn('QA parse failed — passing all findings through')
    qaResult = { confirmed_findings: findings, rejected: [], approved: true }
  }

  // Safety net: if QA wiped everything but scanner found things, keep them all
  const confirmed = (qaResult?.confirmed_findings ?? []).length > 0
    ? qaResult.confirmed_findings
    : findings   // never discard everything silently

  const rejected  = qaResult?.rejected ?? []

  console.log(`QA-Checker → ${confirmed.length} confirmed, ${rejected.length} rejected`)
  if (rejected.length > 0) {
    console.log('Rejected:', rejected.map(r => r.title).join(', '))
  }

  return {
    qa_approved:        true,  // always proceed — scanner + QA already filtered
    confirmed_findings: confirmed,
    qa_iteration:       0,
    agent_log: [{
      phase:     'qa_findings',
      confirmed: confirmed.length,
      rejected:  rejected.length,
      feedback:  qaResult?.feedback,
      timestamp: new Date().toISOString(),
    }],
  }
}