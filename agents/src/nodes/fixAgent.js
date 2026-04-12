import { getLLM }           from '../graph/autoFixGraph.js'
import { fetchSingleFile }  from '../tools/repoCrawler.js'

const FIX_PROMPT = `You are an expert security engineer writing a precise, minimal code fix.

File: {{FILE_PATH}}
Vulnerability: {{TITLE}}
CWE: {{CWE}}
Description: {{DESCRIPTION}}
Vulnerable code snippet:
\`\`\`
{{VULNERABLE_CODE}}
\`\`\`

Full file content:
\`\`\`
{{FULL_CONTENT}}
\`\`\`

Write a fix that:
1. Resolves ONLY this specific vulnerability
2. Preserves all existing functionality and logic
3. Matches the existing code style exactly
4. Is as minimal as possible — touch only what needs changing

Respond ONLY with JSON in triple backticks:
\`\`\`json
{
  "fixedContent": "<complete fixed file content — the entire file>",
  "rationale": "one sentence: what changed and why it fixes the vulnerability",
  "linesChanged": [<list of line numbers modified>]
}
\`\`\``

export async function fixAgentNode(state) {
  const llm    = getLLM()
  const fixes  = []
  const failed = []

  const toFix = (state.confirmed_findings ?? [])
    .filter(f => f.severity === 'critical' || f.severity === 'warning')

  // If retrying, only retry the ones that failed syntax check
  const failedPaths = new Set(
    (state.invalid_fixes ?? []).map(f => f.filePath)
  )
  const targets = state.fix_retry_count > 0
    ? toFix.filter(f => failedPaths.has(f.file))
    : toFix

  for (const finding of targets) {
    try {
      const fullFile = await fetchSingleFile({
        owner:  state.owner,
        repo:   state.repo,
        path:   finding.file,
        ref:    state.branch ?? 'main',
        userId: state.userId,
      })

      const prompt = FIX_PROMPT
        .replace(/{{FILE_PATH}}/g,      finding.file)
        .replace('{{TITLE}}',           finding.title)
        .replace('{{CWE}}',             finding.cwe ?? 'N/A')
        .replace('{{DESCRIPTION}}',     finding.description)
        .replace('{{VULNERABLE_CODE}}', finding.vulnerable_code ?? '')
        .replace('{{FULL_CONTENT}}',    fullFile.content)

      const response  = await llm.invoke(prompt)
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/)
      if (!jsonMatch) throw new Error('No JSON returned by fix agent')

      const fix = JSON.parse(jsonMatch[1])

      fixes.push({
        filePath:     finding.file,
        fixedContent: fix.fixedContent,
        rationale:    fix.rationale,
        linesChanged: fix.linesChanged ?? [],
        title:        finding.title,
        severity:     finding.severity,
        cwe:          finding.cwe,
        lineStart:    finding.line_start,
        description:  finding.description,
        originalSha:  fullFile.sha,
      })
    } catch (err) {
      console.warn(`Fix failed for ${finding.file}:`, err.message)
      failed.push({ finding, error: err.message })
    }
  }

  console.log(`Fix agent → ${fixes.length} fixes, ${failed.length} failed`)

  return {
    proposed_fixes:  fixes,
    fix_failures:    failed,
    fix_retry_count: (state.fix_retry_count ?? 0) + 1,
    current_phase:   'fix',
    agent_log: [{
      phase: 'fix', generated: fixes.length,
      failed: failed.length, timestamp: new Date().toISOString(),
    }],
  }
}
