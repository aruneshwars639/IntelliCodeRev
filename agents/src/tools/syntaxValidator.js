import { execSync }                               from 'child_process'
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs'
import { join }                                   from 'path'
import { tmpdir }                                 from 'os'

export async function validateSyntax({ code, filePath }) {
  const ext  = (filePath ?? '').split('.').pop().toLowerCase()
  const lang = { js:'js', jsx:'js', mjs:'js', cjs:'js', ts:'ts', tsx:'ts', py:'py', json:'json' }[ext] ?? 'other'

  try {
    if (lang === 'js')   return validateJS(code)
    if (lang === 'ts')   return validateJS(code)   // acorn handles modern JS; tsc optional
    if (lang === 'py')   return validatePython(code)
    if (lang === 'json') return validateJSON(code)
    return validateBrackets(code)
  } catch (err) {
    return { valid: false, error: err.message }
  }
}

function validateJS(code) {
  const dir  = mkdtempSync(join(tmpdir(), 'intelliCodeRev-'))
  const file = join(dir, 'check.mjs')
  writeFileSync(file, code)
  try {
    execSync(`node --input-type=module --check < "${file}"`, { timeout: 10000, stdio: 'pipe' })
    return { valid: true, error: null }
  } catch (err) {
    return { valid: false, error: firstErrorLine(err.stderr?.toString() ?? err.message) }
  } finally {
    try { unlinkSync(file) } catch {}
  }
}

function validatePython(code) {
  const dir  = mkdtempSync(join(tmpdir(), 'intelliCodeRev-'))
  const file = join(dir, 'check.py')
  writeFileSync(file, code)
  try {
    execSync(`python3 -m py_compile "${file}"`, { timeout: 10000, stdio: 'pipe' })
    return { valid: true, error: null }
  } catch (err) {
    return { valid: false, error: firstErrorLine(err.stderr?.toString() ?? err.message) }
  } finally {
    try { unlinkSync(file) } catch {}
  }
}

function validateJSON(code) {
  try { JSON.parse(code); return { valid: true, error: null } }
  catch (err) { return { valid: false, error: err.message } }
}

function validateBrackets(code) {
  const pairs = { ')':'(', ']':'[', '}':'{' }
  const stack = []
  let inStr = false, strCh = null
  for (let i = 0; i < code.length; i++) {
    const c = code[i]
    if (inStr) { if (c === strCh && code[i-1] !== '\\') inStr = false; continue }
    if (c === '"' || c === "'" || c === '`') { inStr = true; strCh = c; continue }
    if ('([{'.includes(c)) stack.push(c)
    else if (')]}'.includes(c)) {
      if (stack[stack.length-1] !== pairs[c]) return { valid: false, error: `Unmatched '${c}' at pos ${i}` }
      stack.pop()
    }
  }
  return stack.length ? { valid: false, error: `Unclosed '${stack[stack.length-1]}'` } : { valid: true, error: null }
}

function firstErrorLine(text) {
  return text.split('\n').find(l => /error/i.test(l)) ?? text.slice(0, 200)
}
