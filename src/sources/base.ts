export type Json = Record<
  string,
  string | number | boolean | null | Json[] | {[key: string]: Json}
>

export type Section = {
  content: string
  heading?: string
  slug?: string
  meta: {
    chunkStart: number
    chunkEnd: number
    currentHeadingStack?: {
      h1?: null | {
        heading: string
        customAnchor?: string
      }
      h2?: null | {
        heading: string
        customAnchor?: string
      }
      h3?: null | {
        heading: string
        customAnchor?: string
      }
      h4?: null | {
        heading: string
        customAnchor?: string
      }
      h5?: null | {
        heading: string
        customAnchor?: string
      }
      h6?: null | {
        heading: string
        customAnchor?: string
      }
    }
  } & Json
}

export abstract class BaseSource {
  checksum?: string
  meta?: Json
  sections?: Section[]

  constructor(
    public source: string,
    public path: string,
    public parentPath?: string
  ) {}

  abstract load(): Promise<{checksum: string; meta?: Json; sections: Section[]}>
}
