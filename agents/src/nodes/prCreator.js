import { createFixPR } from '../tools/prCreator.js'

export async function prCreatorNode(state) {
  const validFixes = state.valid_fixes ?? []

  if (validFixes.length === 0) {
    return {
      pr_result:     null,
      current_phase: 'pr_creation',
      agent_log: [{
        phase: 'pr_creation', skipped: true,
        reason: 'No valid fixes passed syntax validation',
        timestamp: new Date().toISOString(),
      }],
    }
  }

  try {
    const result = await createFixPR({
      owner:      state.owner,
      repo:       state.repo,
      baseBranch: state.branch ?? 'main',
      fixes:      validFixes,
      findings:   state.confirmed_findings ?? [],
      userId:     state.userId,
      jobId:      state.jobId,
    })

    console.log(`PR created → ${result.prUrl}`)

    return {
      pr_result:     result,
      current_phase: 'pr_creation',
      agent_log: [{
        phase: 'pr_creation', prUrl: result.prUrl,
        prNumber: result.prNumber, appliedFixes: result.appliedFixes,
        timestamp: new Date().toISOString(),
      }],
    }
  } catch (err) {
    console.error('PR creation failed:', err.message)
    return {
      pr_result:     null,
      pr_error:      err.message,
      current_phase: 'pr_creation',
      agent_log: [{ phase: 'pr_creation', error: err.message, timestamp: new Date().toISOString() }],
    }
  }
}
