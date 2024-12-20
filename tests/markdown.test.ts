import {describe, expect, test} from 'vitest'
import {processMdxForSearch} from '../src/sources/markdown'

describe('processMdxForSearch', () => {
  test('should generate correct localSerializableMeta for simple markdown', () => {
    const result = processMdxForSearch(content)
    const section = result.sections[0]

    expect(section.meta.chunk.currentHeadingStack).toEqual({})
    expect(section.meta.chunk.lineStart).toBe(0)
    expect(section.meta.chunk.lineEnd).toBe(34)
  })

  test('should filter out nulls in currentHeadingStack', () => {
    const result = processMdxForSearch(content)
    const lastSection = result.sections[result.sections.length - 1]

    expect(lastSection.meta.chunk.currentHeadingStack).toEqual({
      h1: {heading: 'Heading 8'},
      h2: {heading: 'Heading 9'},
      h3: {heading: 'Heading 10'}
    })
    expect(lastSection.meta.chunk.currentHeadingStack.h6).toBeUndefined()
  })

  test('should handle multiple chunks correctly', () => {
    const result = processMdxForSearch(content)
    expect(result.sections.length).toBeGreaterThan(0)

    const section = result.sections[1]
    expect(section.meta.chunk.lineStart).toBeGreaterThan(0)
    expect(section.meta.chunk.lineEnd).toBeGreaterThan(
      section.meta.chunk.lineStart
    )
  })

  test('should handle empty content', () => {
    const content = ''
    const result = processMdxForSearch(content)

    expect(result.sections.length).toBe(0)
  })

  test('should handle content with custom anchors', () => {
    const content = '### Heading with anchor [#custom-anchor]\n\nContent here.'
    const result = processMdxForSearch(content)
    const section = result.sections[0]

    expect(section.heading).toEqual('Heading with anchor')
    expect(section.slug).toEqual('custom-anchor')
  })
})

const content = `
# Heading 1
Some content will be here. It might have a few other things [like this](https://example.com) in itSome content will be here. It might have a few other things [like this](https://example.com) in itSome content will be here. It might have a few other things [like this](https://example.com) in it
> Wow, a blockquote!

Skip:
- [Heading](#custom-anchor)

## Heading 2
more contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore contentmore content

### Heading 3
even more content

###### Heading 4
the end of this

# Heading 5
And even more here

## Heading 6[custom-anchor]
and more content and more content and more content

### Heading 7
and more content and more content and more content

# Heading 8
Some content will be here. It might have a few other things [like this](https://example.com) in itSome content will be here. It might have a few other things [like this](https://example.com) in itSome content will be here. It might have a few other things [like this](https://example.com) in it
> Wow, a blockquote!

## Heading 9
and more content and more content and more contentand more content and more content and more contentand more content and more content and more contentand more content and more content and more contentSome content will be here. It might have a few other things [like this](https://example.com) in it

### Heading 10
and more content and more content and more contentand more content and more content and more contentand more content and more content and more contentand more content and more content and more contentSome content will be here. It might have a few other things [like this](https://example.com) in it

###### Heading 11
and more content and more content and more contentand more content and more content and more contentand more content and more content and more contentand more content and more content and more contentSome content will be here. It might have a few other things [like this](https://example.com) in it

# Heading 12
and more content and more content and more contentand more content and more content and more contentand more content and more content and more contentand more content and more content and more contentSome content will be here. It might have a few other things [like this](https://example.com) in it

## Heading 13
and more content and more content and more contentand more content and more content and more contentand more content and more content and more contentand more content and more content and more contentSome content will be here. It might have a few other things [like this](https://example.com) in it

### Heading 14
and more content and more content and more contentand more content and more content and more contentand more content and more content and more contentand more content and more content and more contentSome content will be here. It might have a few other things [like this](https://example.com) in it
`
