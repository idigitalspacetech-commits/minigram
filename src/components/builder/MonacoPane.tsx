'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'

// Load Monaco only on the client — it cannot run server-side
const MonacoEditor = dynamic(
  () => import('@monaco-editor/react').then(m => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#1e1e1e]">
        <div className="flex items-center gap-3 text-sm text-[#6A737D]">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Loading editor...
        </div>
      </div>
    ),
  }
)

const LANG_MAP: Record<string, string> = {
  'miniapp_html':              'html',
  'bot_py':                    'python',
  'scheduler_py':              'python',
  'requirements_txt':          'plaintext',
  'env_example':               'ini',
  'setup_md':                  'markdown',
  'tonconnect_manifest_json':  'json',
}

interface MonacoPaneProps {
  fileKey: string
  content: string
  onChange?: (value: string) => void
  readOnly?: boolean
}

export function MonacoPane({ fileKey, content, onChange, readOnly = false }: MonacoPaneProps) {
  const editorRef = useRef<unknown>(null)
  const language  = LANG_MAP[fileKey] ?? 'plaintext'

  function handleMount(editor: unknown) {
    editorRef.current = editor
    // Auto-format on mount for supported languages
    if (['html','json'].includes(language)) {
      setTimeout(() => {
        (editor as { getAction: (id: string) => { run: () => void } })
          .getAction('editor.action.formatDocument')?.run()
      }, 300)
    }
  }

  return (
    <MonacoEditor
      height="100%"
      language={language}
      value={content}
      theme="vs-dark"
      onChange={v => onChange?.(v ?? '')}
      onMount={handleMount}
      options={{
        readOnly,
        fontSize: 13,
        fontFamily: '"DM Mono", "Fira Code", "Cascadia Code", monospace',
        fontLigatures: true,
        lineHeight: 22,
        padding: { top: 20, bottom: 20 },
        minimap: { enabled: true, scale: 0.75 },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        wrappingIndent: 'indent',
        renderWhitespace: 'selection',
        renderLineHighlight: 'all',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        suggest: { showKeywords: true },
        quickSuggestions: { other: true, comments: false, strings: false },
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
          useShadows: false,
        },
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        glyphMargin: false,
        folding: true,
        foldingHighlight: true,
        showFoldingControls: 'mouseover',
        stickyScroll: { enabled: true },
        colorDecorators: true,
      }}
    />
  )
}
