interface HeadingScrollDetail {
  text: string
  level: number
}

interface SyncScrollDetail {
  source: 'editor' | 'preview'
  percentage: number
}

declare global {
  const __APP_VERSION__: string

  interface Window {
    isExternalScrollSync?: boolean
    find(text: string, caseSensitive?: boolean, backwards?: boolean, wrapAround?: boolean, wholeWord?: boolean, searchInFrames?: boolean, showDialog?: boolean): boolean
  }

  interface WindowEventMap {
    'scroll-to-heading': CustomEvent<HeadingScrollDetail>
    'sync-scroll': CustomEvent<SyncScrollDetail>
    'request-scroll-sync': CustomEvent<undefined>
    'find-navigate': CustomEvent<FindNavigateDetail>
    'find-highlights': CustomEvent<FindHighlightsDetail>
    'find-clear': CustomEvent<undefined>
  }
}

interface FindNavigateDetail {
  offset: number
  length: number
  occurrence: number
}

interface FindHighlightsDetail {
  matches: Array<{ from: number; to: number }>
}

export {}
