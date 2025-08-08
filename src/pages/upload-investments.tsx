import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import 'highlight.js/styles/github.css'
import { syntax } from '@/types/quillSyntax'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import debounce from 'lodash/debounce'

// Custom hook for debounced reading stats
function useReadingStats(text: string) {
  const [stats, setStats] = useState({ words: 0, minutes: 0 })

  const calculateStats = useCallback(() => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim()
    const words = cleanText.split(/\s+/).length
    const minutes = Math.max(1, Math.round(words / 200))
    setStats({ words, minutes })
  }, [text])

  const debouncedCalculateStats = useCallback(debounce(calculateStats, 300), [calculateStats])

  useEffect(() => {
    debouncedCalculateStats()
  }, [text, debouncedCalculateStats])

  return stats
}

export default function UploadStrategyPage() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Mixed Assets')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const quillRef = useRef<ReactQuill>(null)
  const { words, minutes } = useReadingStats(content)

  const modules = {
    syntax,
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ]
  }

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ]

  const handleEnhance = async () => {
    setEnhancing(true)
    setError(null)
    try {
      const r = await fetch('/.netlify/functions/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: title, steps: content })
      })
      if (!r.ok) throw new Error('Enhancement failed')
      const { enhanced_description, enhanced_steps } = await r.json()
      setTitle(enhanced_description)
      setContent(enhanced_steps.map((s: any) => s.description).join('\n'))
    } catch (err) {
      console.error(err)
      setError('Enhancement failed. Please try again.')
    } finally {
      setEnhancing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return nav('/auth?mode=signIn')
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!content.trim()) {
      setError('Content is required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.from('inv_investment_strategies').insert([{
        id: crypto.randomUUID(),
        title: title.trim(),
        category,
        description: content.slice(0, 200),
        strategy_steps: content,
        user_id: user.id
      }])
      if (error) throw error
      alert('Uploaded successfully!')
      nav('/dashboard')
    } catch (err) {
      console.error(err)
      setError('Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-4">Upload Investment Strategy</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="flex gap-4 mb-2 text-sm text-gray-600">
        <span>{words} words</span>
        <span>~{minutes} min read</span>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleEnhance}
          disabled={enhancing}
          className={`px-3 py-1 rounded text-white ${enhancing ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {enhancing ? 'Enhancing…' : '✨ AI Enhance'}
        </button>
        <button
          onClick={() => setPreviewMode(!previewMode)}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {previewMode ? 'Edit' : 'Preview'}
        </button>
      </div>

      <div className="space-y-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
        <input
          id="title"
          type="text"
          placeholder="Strategy title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded"
          required
        />

        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
        <select
          id="category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded"
        >
          <option>Mixed Assets</option>
          <option>Real Estate</option>
          <option>Cryptocurrency</option>
          <option>Stocks</option>
          <option>Private Equity</option>
        </select>

        {previewMode ? (
          <div className="prose" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
        ) : (
          <>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
            <ReactQuill
              ref={quillRef}
              value={content}
              onChange={setContent}
              modules={modules}
              formats={formats}
              theme="snow"
              className="h-80 bg-white"
            />
          </>
        )}

        <button
          onClick={handleSubmit}
          className={`px-6 py-2 rounded text-white ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
          disabled={loading}
        >
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </div>
  )
}