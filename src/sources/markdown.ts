import {encode, decode} from 'gpt-tokenizer'
import matter from 'gray-matter'
import {createHash} from 'crypto'
import {readFile} from 'fs/promises'
import GithubSlugger from 'github-slugger'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {mdxFromMarkdown} from 'mdast-util-mdx'
import {toString} from 'mdast-util-to-string'
import {mdxjs} from 'micromark-extension-mdxjs'
import {BaseSource, Json, Section} from './base'

/**
 * Parses a markdown heading which can optionally
 * contain a custom anchor in the format:
 *
 * ```markdown
 * ### My Heading [#my-custom-anchor]
 * ```
 */
export function parseHeading(heading: string): {
  heading: string
  customAnchor?: string
} {
  const match = heading.match(/(.*) *\[#(.*)\]/)
  if (match) {
    const [, heading, customAnchor] = match
    return {heading, customAnchor}
  }
  return {heading}
}

/**
 * Processes MDX content for search indexing.
 * It extracts metadata, strips it of all JSX,
 * and splits it into sub-sections based on criteria.
 */
export function processMdxForSearch(content: string): ProcessedMdx {
  const checksum = createHash('sha256').update(content).digest('base64')
  const {content: rawContent, data: metadata} = matter(
    content.replace(/^\s+|\s+$/g, '').trim() // Remove leading/trailing whitespace
  )

  const serializableMeta: Json =
    metadata && JSON.parse(JSON.stringify(metadata))

  if (!rawContent || !rawContent.trim()) {
    return {
      checksum,
      meta: serializableMeta,
      sections: []
    }
  }

  const slugger = new GithubSlugger()

  // We want to chunk this into 400 token chunks, w/ 100 token overlap
  const contentTokens = encode(rawContent)
  const chunks = []
  const chunkSize = 400
  const overlap = 100

  // Chunk the content
  // - We want to chunk the content into 400 token chunks
  // - We also want to overlap each chunk
  // - This is because we want to ensure that we don't cut off any meaningful content
  for (let i = 0; i < contentTokens.length; i += chunkSize - overlap) {
    chunks.push(contentTokens.slice(i, i + chunkSize))
  }

  // Now we need to decode these chunks
  const decodedChunks = chunks.map(decode)

  let lineNumStart = 0
  let lineNumEnd = 0

  const sections: Section[] = decodedChunks.map((chunkText, i, chunkArray) => {
    lineNumStart = lineNumEnd
    lineNumEnd += chunkText.split(/\r\n|\r|\n/).length // Count the number of lines in the chunk

    const text = chunkText.replace(/^\s+|\s+$/g, '').trim() // Remove leading/trailing whitespace

    const localTree = fromMarkdown(text, {
      extensions: [mdxjs()],
      mdastExtensions: [mdxFromMarkdown()]
    })

    const headings = localTree.children.filter(node => node.type === 'heading')

    const {heading, customAnchor} = headings?.[0]
      ? parseHeading(toString(headings[0]))
      : {}

    const slug = customAnchor ?? heading ? slugger.slug(heading) : null

    return {
      content: text,
      heading: heading ? heading : undefined,
      slug: slug ? slug : undefined,
      localTree,
      lineNumEnd,
      lineNumStart
    }
  })

  return {
    checksum,
    meta: serializableMeta,
    sections
  }
}

export type ProcessedMdx = {
  checksum: string
  meta: Json
  sections: Section[]
}

export class MarkdownSource extends BaseSource {
  type = 'markdown' as const

  constructor(
    source: string,
    public filePath: string,
    public parentFilePath?: string
  ) {
    const path = filePath.replace(/^pages/, '').replace(/\.mdx?$/, '')
    const parentPath = parentFilePath
      ?.replace(/^pages/, '')
      .replace(/\.mdx?$/, '')

    super(source, path, parentPath)
  }

  async load() {
    const contents = await readFile(this.filePath, 'utf8')

    const {checksum, meta, sections} = processMdxForSearch(contents)

    this.checksum = checksum
    this.meta = meta
    this.sections = sections

    return {
      checksum,
      meta,
      sections
    }
  }
}
