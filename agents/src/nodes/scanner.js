import { getLLM } from '../graph/autoFixGraph.js'

const SCANNER_PROMPT = `You are a security-focused code scanner. Analyse this source file for security vulnerabilities.

File: {{FILE_PATH}}
Language: {{LANGUAGE}}

\`\`\`
{{CODE}}
\`\`\`

Look for:
- SQL/command injection, XSS
- Hardcoded secrets, API keys, passwords
- Insecure auth/authorisation logic
- Unsafe eval, deserialization
- Path traversal
- Missing input validation
- Sensitive data exposure

Respond ONLY with a JSON array inside triple backticks:
\`\`\`json
[
  {
    "title": "short name",
    "description": "why this is dangerous",
    "severity": "critical" | "warning" | "info",
    "file": "{{FILE_PATH}}",
    "line_start": <number or null>,
    "line_end": <number or null>,
    "cwe": "CWE-XXX or null",
    "vulnerable_code": "exact vulnerable snippet",
    "suggestion": "one sentence fix"
  }
]
\`\`\`

If no vulnerabilities found respond with: \`\`\`json [] \`\`\`
Only include real, exploitable issues. No false positives.`

const LANG_MAP = {
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript',
  ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', go: 'Go', java: 'Java',
  rb: 'Ruby', php: 'PHP', cs: 'C#',
  cpp: 'C++', c: 'C',
}

export async function scannerNode(state) {
  const llm        = getLLM()
  const allFindings = []

  for (const file of (state.filesToScan ?? [])) {
    const ext  = file.path.split('.').pop().toLowerCase()
    const lang = LANG_MAP[ext] ?? 'unknown'

    const prompt = SCANNER_PROMPT
      .replace(/{{FILE_PATH}}/g, file.path)
      .replace('{{LANGUAGE}}',  lang)
      .replace('{{CODE}}',      file.content)

    try {
      const response  = await llm.invoke(prompt)
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        const findings = JSON.parse(jsonMatch[1])
        allFindings.push(...findings)
      }
    } catch (err) {
      console.warn(`Scanner failed on ${file.path}:`, err.message)
    }
  }

  console.log(`Scanner → ${allFindings.length} raw findings from ${(state.filesToScan ?? []).length} files`)

  return {
    raw_findings:  allFindings,
    current_phase: 'scan',
    agent_log: [{
      phase:         'scan',
      files_scanned: (state.filesToScan ?? []).length,
      raw_count:     allFindings.length,
      timestamp:     new Date().toISOString(),
    }],
  }
}
