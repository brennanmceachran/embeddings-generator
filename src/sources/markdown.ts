import {encode, decode} from 'gpt-tokenizer'
import matter from 'gray-matter'
import {createHash} from 'crypto'
import {readFile} from 'fs/promises'
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
    const cleanedHeader = heading.replace(/\[#(.*)\]/, '').trim()
    return {
      heading: cleanedHeader,
      customAnchor
    }
  }
  return {
    heading: heading.trim()
  }
}

/**
 * Processes MDX content for search indexing.
 * It extracts metadata, strips it of all JSX,
 * and splits it into sub-sections based on criteria.
 */
export function processMdxForSearch(
  content: string,
  fileMeta: object = {}
): ProcessedMdx {
  const checksum = createHash('sha256').update(content).digest('base64')
  const {content: rawContent, data: metadata} = matter(
    content.replace(/^\s+|\s+$/g, '').trim() // Remove leading/trailing whitespace
  )

  const serializableMeta: Json =
    metadata &&
    JSON.parse(
      JSON.stringify({
        ...fileMeta,
        ...metadata
      })
    )

  if (!rawContent || !rawContent.trim()) {
    return {
      checksum,
      meta: serializableMeta,
      sections: []
    }
  }

  // We want to chunk this into 400 token chunks, w/ 100 token overlap
  const contentTokens = encode(rawContent)
  const chunks = []
  const chunkSize = 400
  const overlap = 0

  // Chunk the content
  // - We want to chunk the content into 400 token chunks
  // - We also want to overlap each chunk
  // - This is because we want to ensure that we don't cut off any meaningful content
  for (let i = 0; i < contentTokens.length; i += chunkSize - overlap) {
    chunks.push(contentTokens.slice(i, i + chunkSize))
  }

  // Now we need to decode these chunks
  const decodedChunks = chunks.map(decode)

  let chunkStart = 0
  let chunkEnd = 0
  const priorHeadingStack: Section['meta']['chunk']['currentHeadingStack'] = {
    h1: null,
    h2: null,
    h3: null,
    h4: null,
    h5: null,
    h6: null
  }

  const sections: Section[] = decodedChunks.map(chunkText => {
    chunkStart = chunkEnd
    chunkEnd += chunkText.split(/\r\n|\r|\n/).length // Count the number of lines in the chunk

    const localSerializableMeta: Section['meta'] = JSON.parse(
      JSON.stringify({
        file: serializableMeta,
        // filter out nulls
        chunk: {
          currentHeadingStack: Object.keys(priorHeadingStack).reduce(
            (acc, key) => {
              if (priorHeadingStack[key]) {
                acc[key] = priorHeadingStack[key]
              }
              return acc
            },
            {}
          ),
          lineStart: chunkStart,
          lineEnd: chunkEnd
        }
      })
    )
    const text = chunkText.replace(/^\s+|\s+$/g, '').trim() // Remove leading/trailing whitespace

    // Parse the markdown content
    const localTree = fromMarkdown(text, {
      extensions: [mdxjs()],
      mdastExtensions: [mdxFromMarkdown()]
    })

    const headings = localTree.children.filter(node => node.type === 'heading')

    const {heading, customAnchor} = headings?.[0]
      ? parseHeading(toString(headings[0]))
      : {}

    headings.forEach(heading => {
      // Update the prior heading stack
      const {depth} = heading
      const key = `h${depth}` as keyof typeof priorHeadingStack
      priorHeadingStack[key] = null
      priorHeadingStack[key] = parseHeading(toString(heading))

      // Reset all headings deeper than this one
      for (let i = depth + 1; i <= 6; i++) {
        const key = `h${i}` as keyof typeof priorHeadingStack
        priorHeadingStack[key] = null
      }
    })

    return {
      content: text,
      heading: heading,
      slug: customAnchor,
      meta: localSerializableMeta
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

    const {checksum, meta, sections} = processMdxForSearch(contents, {
      parent: this.parentPath,
      path: this.path
    })

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
