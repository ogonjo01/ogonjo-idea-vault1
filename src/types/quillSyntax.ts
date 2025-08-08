// src/types/quillSyntax.ts
import Quill from 'quill'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'  // or any theme you like

// Register Quill’s built-in syntax module to use our hljs highlighter
Quill.register('modules/syntax', Quill.import('modules/syntax'))

export const syntax = {
  highlight: (text: string) => {
    const result = hljs.highlightAuto(text)
    return result.value
  },
}
