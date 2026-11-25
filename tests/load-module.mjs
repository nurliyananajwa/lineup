import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Keep unit tests runnable on the same Node versions as Next.js; no TS loader
// or extra test dependencies are needed. The separate typecheck checks types.
export async function loadModule(path) {
  const source = await readFile(new URL(`../src/lib/${path}.ts`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
