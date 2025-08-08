// TipTapEditor.tsx
import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';

interface TipTapEditorProps {
  content: string;
  setContent: (content: string) => void;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({ content, setContent }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Link,
      Highlight,
      Image,
    ],
    content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ marginBottom: 8 }}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}>Underline</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()}>Highlight</button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}>Strike</button>

        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()}>Left</button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()}>Center</button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()}>Right</button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('justify').run()}>Justify</button>

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>

        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Enter image URL');
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
        >
          Add Image
        </button>

        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Enter link URL');
            if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }}
        >
          Add Link
        </button>

        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()}>Remove Link</button>

        <button type="button" onClick={() => editor.chain().focus().clearNodes().run()}>Clear Format</button>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        style={{ border: '1px solid #ccc', borderRadius: 4, minHeight: 300, padding: 10 }}
      />
    </div>
  );
};

export default TipTapEditor;
