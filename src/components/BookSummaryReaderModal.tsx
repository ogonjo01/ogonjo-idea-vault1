import React, { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  summaryTitle: string;
  bookAuthor: string;
  fullHtmlContent: string;  // The full continuous HTML content to display
}

const BookSummaryReaderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  summaryTitle,
  bookAuthor,
  fullHtmlContent,
}) => {
  useEffect(() => {
    // Prevent background scroll when modal open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" style={styles.modal}>
        <header style={styles.header}>
          <h2 id="modal-title" style={styles.title}>{summaryTitle}</h2>
          <p style={styles.author}>by {bookAuthor}</p>
          <button onClick={onClose} aria-label="Close summary" style={styles.closeButton}>
            &times;
          </button>
        </header>
        <article
          style={styles.content}
          dangerouslySetInnerHTML={{ __html: fullHtmlContent }}
        />
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(5px)',
    zIndex: 999,
    cursor: 'pointer',
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '90vw',
    maxWidth: 800,
    maxHeight: '80vh',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: '2rem 2.5rem 2rem 2.5rem',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
    overflowY: 'auto',
    zIndex: 1000,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: '#334155',
  },
  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: '#f8fafc',
    paddingBottom: '1rem',
    marginBottom: '1rem',
    borderBottom: '2px solid #3b82f6',
    zIndex: 10,
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    margin: 0,
    color: '#1e40af',
  },
  author: {
    fontSize: '1rem',
    marginTop: 4,
    color: '#64748b',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    background: 'transparent',
    border: 'none',
    fontSize: 28,
    cursor: 'pointer',
    color: '#64748b',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  content: {
    fontSize: '1rem',
    lineHeight: 1.6,
    color: '#475569',
  },
};

export default BookSummaryReaderModal;
