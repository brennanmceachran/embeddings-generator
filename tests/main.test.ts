import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from 'vitest'
import {walk} from '../src/sources/util'
import {MarkdownSource} from '../src/sources/markdown'
import {encode} from 'gpt-tokenizer'

// shows how the runner will run a javascript action with env / stdout protocol
// test('test runs', () => {
//   process.env['INPUT_MILLISECONDS'] = '500'
//   const np = process.execPath
//   const ip = path.join(__dirname, '..', 'dist', 'index.js')
//   const options: cp.ExecFileSyncOptions = {
//     env: process.env
//   }
//   console.log(cp.execFileSync(np, [ip], options).toString())
// })

const TESTROOT = './tests/test-files'

test('test runs', () => {
  expect(true).toBe(true)
})

test('it can walk through files', async () => {
  const entries = await walk(TESTROOT)
  expect(entries.length).toBe(4)
})

test('it can find markdown sources', async () => {
  const embeddingSources = (await walk(TESTROOT))
    .filter(({path}) => /\.mdx?$/.test(path))
    .map(entry => new MarkdownSource('markdown', entry.path))

  expect(embeddingSources.length).toBe(4)
})

test('it can parse and chunk markdown sources', async () => {
  const embeddingSources = (await walk(TESTROOT))
    .filter(({path}) => /\.mdx?$/.test(path))
    .map(entry => new MarkdownSource('markdown', entry.path))

  embeddingSources[0].load().then(({checksum, meta, sections}) => {
    expect(Object.keys(meta).length).toBe(0)
    expect(sections.length).toBe(0)
  })
  embeddingSources[1].load().then(({checksum, meta, sections}) => {
    expect(Object.keys(meta).length).toBe(1)
    expect(meta.slug).toBe('fourth-file')
    expect(sections.length).toBe(1)
  })
  embeddingSources[2].load().then(({checksum, meta, sections}) => {
    expect(Object.keys(meta).length).toBe(0)
    expect(sections.length).toBe(0)
  })
  embeddingSources[3].load().then(({checksum, meta, sections}) => {
    expect(meta.title).toBe('Third File')
    expect(sections.length).toBe(2)
    const encoded = encode(sections[0].content)
    expect(encoded.length).toBeGreaterThan(350)
    expect(encoded.length).toBeLessThanOrEqual(400)
    expect(sections[0].content.slice(0, 10)).toBe('# Projects')
    expect(sections[0].heading).toBe('Projects')
    expect(sections[0].slug).toBe('projects')
  })
})
