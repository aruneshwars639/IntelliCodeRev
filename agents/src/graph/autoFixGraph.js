import { StateGraph, END } from '@langchain/langgraph'
import { ChatGroq }        from '@langchain/groq'
import 'dotenv/config'

import { scannerNode }         from '../nodes/scanner.js'
import { qaCheckerNode }       from '../nodes/qaChecker.js'
import { fixAgentNode }        from '../nodes/fixAgent.js'
import { syntaxValidatorNode } from '../nodes/syntaxValidator.js'
import { prCreatorNode }       from '../nodes/prCreator.js'

// Swap LLM provider via env — add more cases as needed
export function getLLM(opts = {}) {
  const model = process.env.LLM_MODEL || 'llama-3.1-70b-versatile'
  return new ChatGroq({ model, temperature: 0.1, ...opts })
}

// Full graph state definition
const graphState = {
  jobId:               { value: (_, b) => b ?? '' },
  userId:              { value: (_, b) => b ?? '' },
  owner:               { value: (_, b) => b ?? '' },
  repo:                { value: (_, b) => b ?? '' },
  branch:              { value: (_, b) => b ?? 'main' },
  filesToScan:         { value: (_, b) => b ?? [] },
  raw_findings:        { value: (_, b) => b ?? [] },
  confirmed_findings:  { value: (_, b) => b ?? [] },
  proposed_fixes:      { value: (_, b) => b ?? [] },
  fix_failures:        { value: (_, b) => b ?? [] },
  valid_fixes:         { value: (_, b) => b ?? [] },
  invalid_fixes:       { value: (_, b) => b ?? [] },
  needs_fix_retry:     { value: (_, b) => b ?? false },
  pr_result:           { value: (_, b) => b ?? null },
  pr_error:            { value: (_, b) => b ?? null },
  current_phase:       { value: (_, b) => b ?? 'scan' },
  qa_iteration:        { value: (a, b) => b ?? a ?? 0 },
  qa_approved:         { value: (_, b) => b ?? false },
  fix_retry_count:     { value: (a, b) => b ?? a ?? 0 },
  agent_log:           { value: (a, b) => [...(a ?? []), ...(b ?? [])] },
}

// After QA validates findings — proceed or re-scan
function routeAfterFindingsQA(state) {
  if (!state.qa_approved && state.qa_iteration < 3) return 'scanner'
  if ((state.confirmed_findings ?? []).length === 0)  return END
  return 'fix_agent'
}

// After syntax check — retry fix or open PR
function routeAfterSyntax(state) {
  if (state.needs_fix_retry && state.fix_retry_count < 2) return 'fix_agent'
  if ((state.valid_fixes ?? []).length === 0)             return END
  return 'pr_creator'
}

export function buildAutoFixGraph() {
  const graph = new StateGraph({ channels: graphState })

  graph.addNode('scanner',          scannerNode)
  graph.addNode('qa_findings',      qaCheckerNode)
  graph.addNode('fix_agent',        fixAgentNode)
  graph.addNode('syntax_validator', syntaxValidatorNode)
  graph.addNode('pr_creator',       prCreatorNode)

  graph.setEntryPoint('scanner')

  graph.addEdge('scanner',   'qa_findings')

  graph.addConditionalEdges('qa_findings', routeAfterFindingsQA, {
    scanner:   'scanner',
    fix_agent: 'fix_agent',
    [END]:     END,
  })

  graph.addEdge('fix_agent', 'syntax_validator')

  graph.addConditionalEdges('syntax_validator', routeAfterSyntax, {
    fix_agent:  'fix_agent',
    pr_creator: 'pr_creator',
    [END]:      END,
  })

  graph.addEdge('pr_creator', END)

  return graph.compile()
}

/*
  Pipeline:
  filesToScan
    → [scanner]         find raw vulnerabilities per file
    → [qa_findings]     filter false positives (QA pass 1)
    → [fix_agent]       write code patches
    → [syntax_validator] real AST parser check
    → [pr_creator]      create branch + open GitHub PR
*/
