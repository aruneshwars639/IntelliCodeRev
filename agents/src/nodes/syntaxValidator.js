import { validateSyntax } from '../tools/syntaxValidator.js'

export async function syntaxValidatorNode(state) {
  const validFixes   = []
  const invalidFixes = []

  for (const fix of (state.proposed_fixes ?? [])) {
    const result = await validateSyntax({
      code:     fix.fixedContent,
      filePath: fix.filePath,
    })

    if (result.valid) {
      validFixes.push(fix)
      console.log(`Syntax OK: ${fix.filePath}`)
    } else {
      invalidFixes.push({ ...fix, syntaxError: result.error })
      console.warn(`Syntax error in ${fix.filePath}: ${result.error}`)
    }
  }

  const needsRetry = invalidFixes.length > 0 && (state.fix_retry_count ?? 0) < 2

  console.log(`Syntax validator → ${validFixes.length} valid, ${invalidFixes.length} invalid`)

  return {
    valid_fixes:     validFixes,
    invalid_fixes:   invalidFixes,
    needs_fix_retry: needsRetry,
    current_phase:   'syntax_check',
    agent_log: [{
      phase:    'syntax_check',
      valid:    validFixes.length,
      invalid:  invalidFixes.length,
      errors:   invalidFixes.map(f => ({ file: f.filePath, error: f.syntaxError })),
      timestamp: new Date().toISOString(),
    }],
  }
}
