import React, { useState, useRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import 'highlight.js/styles/github.css'
import { syntax } from '@/types/quillSyntax'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'

function useReadingStats(text: string) {
  const words = text.replace(/<[^>]+>/g, '').trim().split(/\s+/).length
  const minutes = Math.max(1, Math.round(words / 200))
  return { words, minutes }
}

export default function UploadStrategyPage() {
  const { user } = useAuth()
  const nav = useNavigate()

  // Metadata fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('📈 Stocks & ETFs')
  const [affiliateLink, setAffiliateLink] = useState('')
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Medium' | 'High' | ''>('')
  const [expectedReturns, setExpectedReturns] = useState('')
  const [duration, setDuration] = useState('')

  // Rich text content
  const [content, setContent] = useState('')
  const quillRef = useRef<ReactQuill>(null)

  const { words, minutes } = useReadingStats(content)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return nav('/auth?mode=signIn')
    if (!title.trim()) return setError('Title is required')
    if (!description.trim()) return setError('Description is required')
    if (!content.trim()) return setError('Content is required')

    setLoading(true)
    setError(null)

    try {
      const sanitizedContent = DOMPurify.sanitize(content)
      const sanitizedDescription = description.trim()
      const steps = sanitizedContent
        .split('\n')
        .filter(line => line.trim())
        .map(desc => ({ description: desc.trim() }))

      const payload = {
        title: title.trim(),
        category,
        description: sanitizedDescription,
        affiliate_link: affiliateLink || null,
        views: 0,
        likes: 0,
        risk_level: riskLevel || null,
        expected_returns: expectedReturns || null,
        strategy_steps: { steps },
        is_active: true,
        user_id: user.id,
        duration: duration || null
      }

      const { error: insertError } = await supabase
        .from('inv_investment_strategies')
        .insert([payload])
      if (insertError) throw insertError

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
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">Upload Investment Strategy</h1>
      {error && <div className="text-red-500">{error}</div>}

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span>{words} words</span>
        <span>~{minutes} min read</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            required
          />

          <textarea
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-4 py-2 border rounded h-24"
            required
          />

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-4 py-2 border rounded"
          >
            <option>📈 Stocks & ETFs</option>
            <option>🏘 Real Estate</option>
            <option>💰 Crypto & Blockchain</option>
            <option>🧾 Bonds & Fixed Income</option>
            <option>🏦 Cash & Safe Instruments</option>
            <option>⚖️ Commodities & Metals</option>
            <option>🧪 Alternatives (VC, Art, etc.)</option>
            <option>👵 Retirement & Long-Term</option>
            <option>🐣 Beginner’s Corner</option>
            <option>📰 Market News & Trends</option>
          </select>

          <input
            type="url"
            placeholder="Affiliate Link (optional)"
            value={affiliateLink}
            onChange={e => setAffiliateLink(e.target.value)}
            className="w-full px-4 py-2 border rounded"
          />

          <select
            value={riskLevel}
            onChange={e => setRiskLevel(e.target.value as 'Low' | 'Medium' | 'High' | '')}
            className="w-full px-4 py-2 border rounded"
          >
            <option value="">Risk Level</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <input
            type="text"
            placeholder="Expected Returns (e.g., 5-10% annually)"
            value={expectedReturns}
            onChange={e => setExpectedReturns(e.target.value)}
            className="w-full px-4 py-2 border rounded"
          />

          <input
            type="text"
            placeholder="Duration (e.g., 6 months)"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-full px-4 py-2 border rounded"
          />
        </div>

        {/* Content Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <ReactQuill
            ref={quillRef}
            value={content}
            onChange={setContent}
            modules={modules}
            formats={formats}
            theme="snow"
            className="h-64 bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-2 rounded text-white ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </div>
  )
}
