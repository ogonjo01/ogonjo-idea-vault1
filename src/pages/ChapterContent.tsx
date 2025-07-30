// src/pages/ChapterContent.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, useAuth } from '../services/supabase';
import { Theme } from '../constants/Theme';
import { Course, Chapter, QuizQuestion } from '../types/CourseTypes';
import './ChapterContent.css';

const ChapterContent: React.FC = () => {
  const { courseId, chapterId, chapterIndex: chapterIndexStr } = useParams<{
    courseId: string;
    chapterId: string;
    chapterIndex: string;
  }>();
  const chapterIndex = parseInt(chapterIndexStr, 10);
  const navigate = useNavigate();
  const { session } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isChapterCompleted, setIsChapterCompleted] = useState<boolean>(false);
  const [currentQuizQuestionIndex, setCurrentQuizQuestionIndex] = useState<number>(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [confirmedAnswerIndex, setConfirmedAnswerIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  const [isCurrentQuestionCorrectlyAnswered, setIsCurrentQuestionCorrectlyAnswered] = useState<boolean>(false);

  const hasQuiz = chapter?.quiz && chapter.quiz.length > 0;
  const currentQuestion = hasQuiz ? chapter!.quiz[currentQuizQuestionIndex] : null;

  // Update chapter completion in Supabase
  const updateChapterCompletionInDb = useCallback(
    async (chapterIdToMark: string, courseIdToMark: string) => {
      if (!session?.user?.id) {
        console.warn('Cannot update chapter completion: User not logged in.');
        return;
      }
      try {
        const { data: enrollmentData, error: fetchEnrollmentError } = await supabase
          .from('course_enrollments')
          .select('id, completed_chapters')
          .eq('user_id', session.user.id)
          .eq('course_id', courseIdToMark)
          .single();

        if (fetchEnrollmentError) {
          console.error('Error fetching enrollment for auto-completion:', fetchEnrollmentError.message);
          alert('You must be enrolled in this course to track completion.');
          return;
        }

        const currentCompleted = enrollmentData.completed_chapters || [];
        if (!currentCompleted.includes(chapterIdToMark)) {
          const updated = [...currentCompleted, chapterIdToMark];
          const { error: updateError } = await supabase
            .from('course_enrollments')
            .update({ completed_chapters: updated })
            .eq('id', enrollmentData.id);

          if (updateError) {
            console.error('Error updating completed chapters in DB:', updateError.message);
            alert('Failed to save chapter completion.');
          } else {
            setIsChapterCompleted(true);
          }
        } else {
          setIsChapterCompleted(true);
        }
      } catch (err: any) {
        console.error('Unexpected error in updateChapterCompletionInDb:', err.message);
      }
    },
    [session?.user?.id]
  );

  // The missing handler
  const handleMarkChapterComplete = useCallback(async () => {
    if (!chapter || !course) return;
    await updateChapterCompletionInDb(chapter.id, course.id);
  }, [chapter, course, updateChapterCompletionInDb]);

  // Fetch course and chapter data
  useEffect(() => {
    const fetchChapterContent = async () => {
      setIsLoading(true);
      if (!session?.user?.id) {
        alert('Please log in to view chapter content.');
        navigate('/ideas');
        setIsLoading(false);
        return;
      }

      const { data: courseData, error: courseError } = await supabase
        .from<Course>('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError || !courseData) {
        console.error('Error fetching course for chapter:', courseError?.message);
        alert('Course not found or failed to load chapter.');
        navigate('/ideas');
        setIsLoading(false);
        return;
      }

      setCourse(courseData);
      const foundChapter = (courseData.chapters as Chapter[]).find(ch => ch.id === chapterId);
      if (!foundChapter) {
        alert('Chapter not found within this course.');
        navigate('/ideas');
        setIsLoading(false);
        return;
      }

      // Normalize quiz correctAnswerIndex to number
      if (foundChapter.quiz) {
        foundChapter.quiz = foundChapter.quiz.map(q => ({
          ...q,
          correctAnswerIndex: Number((q as any).correctAnswerIndex)
        }));
      }
      setChapter(foundChapter);

      // Check completion status
      const { data: enrollData, error: enrollError } = await supabase
        .from('course_enrollments')
        .select('completed_chapters')
        .eq('user_id', session.user.id)
        .eq('course_id', courseId)
        .single();

      const completed = enrollError && enrollError.code !== 'PGRST116'
        ? []
        : enrollData?.completed_chapters || [];

      const already = completed.includes(chapterId);
      setIsChapterCompleted(already);

      // Auto‑complete if no quiz
      if (!foundChapter.quiz?.length && !already) {
        await updateChapterCompletionInDb(chapterId, courseId);
      }

      setIsLoading(false);
    };

    fetchChapterContent();
  }, [courseId, chapterId, navigate, session?.user?.id, updateChapterCompletionInDb]);

  // Quiz handlers
  const handleAnswerSelect = useCallback((idx: number) => {
    setSelectedAnswerIndex(idx);
    setShowFeedback(false);
    setConfirmedAnswerIndex(null);
    setIsCurrentQuestionCorrectlyAnswered(false);
  }, []);

  const handleConfirmAnswer = useCallback(() => {
    if (selectedAnswerIndex === null) {
      alert('Please select an answer before confirming.');
      return;
    }
    setConfirmedAnswerIndex(selectedAnswerIndex);
    setShowFeedback(true);
    setIsCurrentQuestionCorrectlyAnswered(
      selectedAnswerIndex === currentQuestion!.correctAnswerIndex
    );
  }, [selectedAnswerIndex, currentQuestion]);

  const goToNextQuizQuestion = useCallback(async () => {
    if (!isCurrentQuestionCorrectlyAnswered) {
      alert('Please answer correctly to proceed.');
      return;
    }
    if (chapter && chapter.quiz && currentQuizQuestionIndex >= chapter.quiz.length - 1) {
      setIsQuizCompleted(true);
      alert('You have finished the quiz.');
      await updateChapterCompletionInDb(chapter.id, course!.id);
    } else {
      setCurrentQuizQuestionIndex(i => i + 1);
    }
    setSelectedAnswerIndex(null);
    setConfirmedAnswerIndex(null);
    setShowFeedback(false);
    setIsCurrentQuestionCorrectlyAnswered(false);
  }, [
    chapter,
    currentQuizQuestionIndex,
    isCurrentQuestionCorrectlyAnswered,
    updateChapterCompletionInDb,
    course
  ]);

  // Chapter navigation
  const goToPreviousChapter = useCallback(() => {
    if (course && chapterIndex > 0) {
      const prev = course.chapters[chapterIndex - 1];
      navigate(`/course/${course.id}/chapters/${prev.id}/${chapterIndex - 1}`);
    } else {
      navigate(`/course/${courseId}`);
    }
  }, [course, chapterIndex, navigate, courseId]);

  const goToNextChapter = useCallback(() => {
    if (!isChapterCompleted) {
      alert('Please mark complete before moving on.');
      return;
    }
    if (course && chapterIndex < course.chapters.length - 1) {
      const next = course.chapters[chapterIndex + 1];
      navigate(`/course/${course.id}/chapters/${next.id}/${chapterIndex + 1}`);
    } else {
      alert('All chapters done!');
      navigate('/ideas');
    }
  }, [course, chapterIndex, navigate, isChapterCompleted]);

  if (isLoading || !chapter || !course) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading chapter content...</p>
      </div>
    );
  }

  const correctAns =
    confirmedAnswerIndex !== null &&
    currentQuestion &&
    confirmedAnswerIndex === currentQuestion.correctAnswerIndex;
  const incorrectAns =
    confirmedAnswerIndex !== null &&
    currentQuestion &&
    confirmedAnswerIndex !== currentQuestion.correctAnswerIndex;

  return (
    <div className="chapter-content-container">
      <div className="header">
        <button className="back-button" onClick={() => navigate(`/course/${courseId}`)}>
          ← Back
        </button>
        <h1 className="header-title">{chapter.title}</h1>
        <button
          className={`mark-complete-button ${isChapterCompleted ? 'completed' : ''}`}
          onClick={handleMarkChapterComplete}
          disabled={isLoading || isChapterCompleted}
        >
          {isChapterCompleted ? '✓ Completed' : 'Mark Complete'}
        </button>
      </div>

      <div className="section-container">
        <p className="chapter-text">{chapter.text}</p>
      </div>

      {hasQuiz && (
        <div className="quiz-container">
          <h2 className="quiz-title">Quiz!</h2>
          <p className="question-text">
            {currentQuizQuestionIndex + 1}. {currentQuestion?.question}
          </p>
          {currentQuestion?.options.map((opt, idx) => (
            <button
              key={idx}
              className={`option-button ${
                selectedAnswerIndex === idx ? 'selected' : ''
              } ${showFeedback && idx === currentQuestion.correctAnswerIndex ? 'correct' : ''} ${
                showFeedback && selectedAnswerIndex === idx && idx !== currentQuestion.correctAnswerIndex
                  ? 'incorrect'
                  : ''
              }`}
              onClick={() => handleAnswerSelect(idx)}
              disabled={isQuizCompleted || (showFeedback && isCurrentQuestionCorrectlyAnswered)}
            >
              {opt}
            </button>
          ))}
          {!showFeedback && selectedAnswerIndex !== null && !isQuizCompleted && (
            <button className="confirm-button" onClick={handleConfirmAnswer}>
              Confirm Answer
            </button>
          )}
          {showFeedback && (
            <div className="feedback-container">
              {correctAns ? (
                <p className="correct-feedback">Correct! 🎉</p>
              ) : (
                <p className="incorrect-feedback">Incorrect. Try again.</p>
              )}
              {isCurrentQuestionCorrectlyAnswered && (
                <button className="next-question-button" onClick={goToNextQuizQuestion}>
                  {currentQuizQuestionIndex < chapter.quiz!.length - 1 ? 'Next' : 'Finish Quiz'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="navigation-buttons-container">
        <button className="nav-button" onClick={goToPreviousChapter} disabled={chapterIndex === 0}>
          ← Previous
        </button>
        <button className="nav-button" onClick={goToNextChapter} disabled={!isChapterCompleted}>
          Next →
        </button>
      </div>
    </div>
  );
};

export default ChapterContent;
