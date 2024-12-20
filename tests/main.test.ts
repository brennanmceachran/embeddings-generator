import {expect, suite, test} from 'vitest'
import {walk} from '../src/sources/util'
import {MarkdownSource} from '../src/sources/markdown'
import {encode} from 'gpt-tokenizer'

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

suite('it can parse and chunk markdown sources', async () => {
  const embeddingSources = (await walk(TESTROOT))
    .filter(({path}) => /\.mdx?$/.test(path))
    .map(entry => new MarkdownSource('markdown', entry.path))

  const emptyMDX = embeddingSources.find(
    ({path}) => path === 'tests/test-files/empty'
  )
  const emptyMD = embeddingSources.find(
    ({path}) => path === 'tests/test-files/test-folder/empty'
  )
  const longMDX = embeddingSources.find(
    ({path}) => path === 'tests/test-files/test-folder/long'
  )
  const longMD = embeddingSources.find(
    ({path}) => path === 'tests/test-files/full'
  )

  test('it can parse an empty mdx file', async () => {
    emptyMDX.load().then(({meta, sections}) => {
      expect(Object.keys(meta).length).toBe(0)
      expect(sections.length).toBe(0)
    })
  })
  test('it can parse an empty md file', async () => {
    longMD.load().then(({meta, sections}) => {
      expect(Object.keys(meta).length).toBe(1)
      expect(meta.slug).toBe('second-file-md')
      expect(sections.length).toBe(1)
      expect(sections[0].content.slice(-1)).toBe('`')
    })
  })
  test('it can parse an empty ', async () => {
    emptyMD.load().then(({meta, sections}) => {
      expect(Object.keys(meta).length).toBe(0)
      expect(sections.length).toBe(0)
    })
  })
  test('it can parse a long mdx file', async () => {
    longMDX.load().then(({meta, sections}) => {
      expect(meta.title).toBe('long mdx file')
      expect(sections.length).toBe(2)
      const encoded = encode(sections[0].content)
      expect(encoded.length).toBeGreaterThan(350)
      expect(encoded.length).toBeLessThanOrEqual(400)
      expect(sections[0].content.slice(0, 10)).toBe('# Projects')
      expect(sections[0].heading).toBe('Projects')
      expect(sections[0].slug).toBe('projects')
    })
  })
})
