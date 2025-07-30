
// ogonjo-web-app/src/pages/CourseDetail.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Theme } from '../constants/Theme';
//import { Course, Chapter } from '../types/CourseTypes';
import { supabase, useAuth } from '../services/supabase';
import './CourseDetail.css';

const CourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState<boolean>(false);
  const [isChaptersExpanded, setIsChaptersExpanded] = useState<boolean>(true);
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);

  // Fetch Course Data, Increment Views, Check Like/Enroll/Save Status
  useEffect(() => {
    const fetchCourseDetailsAndStatus = async () => {
      setIsLoading(true);
      if (!user?.id) {
        alert('Login Required: Please log in to view course details and interact.');
        navigate('/courses');
        setIsLoading(false);
        return;
      }

      const { data: courseData, error: fetchError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (fetchError) {
        console.error('Error fetching course:', fetchError.message);
        alert('Error: Course not found or failed to load.');
        navigate('/courses');
        setIsLoading(false);
        return;
      }

      if (courseData) {
        setCourse(courseData as Course);
        setIsSubscribed(Math.random() > 0.5);

        // Increment views
        const { data: updatedViewsData, error: updateViewsError } = await supabase
          .from('courses')
          .update({ views: (courseData.views || 0) + 1 })
          .eq('id', courseId)
          .select('views')
          .single();
        if (updateViewsError) console.error('Error incrementing views:', updateViewsError.message);
        else if (updatedViewsData) setCourse(prev => (prev ? { ...prev, views: updatedViewsData.views } : null));

        // Check like status
        const { data: likeData, error: likeError } = await supabase
          .from('course_likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();
        setIsLiked(!!likeData && likeError?.code !== 'PGRST116');

        // Check enrollment status with completed chapters
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('course_enrollments')
          .select('id, completed_chapters')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();
        setIsEnrolled(!!enrollmentData && enrollmentError?.code !== 'PGRST116');
        if (enrollmentData?.completed_chapters) setCompletedChapters(enrollmentData.completed_chapters);

        // Check saved status
        const { data: savedData, error: savedError } = await supabase
          .from('saved_courses')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();
        setIsSaved(!!savedData && savedError?.code !== 'PGRST116');
      } else {
        alert('Error: Course not found.');
        navigate('/courses');
      }
      setIsLoading(false);
    };

    fetchCourseDetailsAndStatus();
  }, [courseId, navigate, user?.id]);

  // Handle Like/Unlike
  const handleLikeToggle = useCallback(async () => {
    if (!user?.id || !course) return;
    setIsLoading(true);
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('course_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', course.id);
        if (error) throw error;
        setIsLiked(false);
        const { data, error: updateError } = await supabase
          .from('courses')
          .update({ likes: Math.max(0, course.likes - 1) })
          .eq('id', course.id)
          .select('likes')
          .single();
        if (updateError) console.error('Error decrementing likes:', updateError.message);
        else if (data) setCourse(prev => (prev ? { ...prev, likes: data.likes } : null));
        alert('Unliked: Course unliked successfully!');
      } else {
        const { error } = await supabase
          .from('course_likes')
          .insert({ user_id: user.id, course_id: course.id });
        if (error) throw error;
        setIsLiked(true);
        const { data, error: updateError } = await supabase
          .from('courses')
          .update({ likes: (course.likes || 0) + 1 })
          .eq('id', course.id)
          .select('likes')
          .single();
        if (updateError) console.error('Error incrementing likes:', updateError.message);
        else if (data) setCourse(prev => (prev ? { ...prev, likes: data.likes } : null));
        alert('Liked: Course liked successfully!');
      }
    } catch (error: any) {
      console.error('Like toggle error:', error.message);
      alert('Error: Failed to toggle like.');
    } finally {
      setIsLoading(false);
    }
  }, [isLiked, course, user?.id]);

  // Handle Enroll/Unenroll
  const handleEnrollToggle = useCallback(async () => {
    if (!user?.id || !course) return;
    setIsLoading(true);
    try {
      if (isEnrolled) {
        const { error } = await supabase
          .from('course_enrollments')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', course.id);
        if (error) throw error;
        setIsEnrolled(false);
        const { data, error: updateError } = await supabase
          .from('courses')
          .update({ enrollment_count: Math.max(0, (course.enrollment_count || 0) - 1) })
          .eq('id', course.id)
          .select('enrollment_count')
          .single();
        if (updateError) console.error('Error decrementing enrollment:', updateError.message);
        else if (data) setCourse(prev => (prev ? { ...prev, enrollment_count: data.enrollment_count } : null));
        alert('Unenrolled: You have unenrolled from the course.');
      } else {
        const { error } = await supabase
          .from('course_enrollments')
          .insert({ user_id: user.id, course_id: course.id, completed_chapters: [] });
        if (error) throw error;
        setIsEnrolled(true);
        const { data, error: updateError } = await supabase
          .from('courses')
          .update({ enrollment_count: (course.enrollment_count || 0) + 1 })
          .eq('id', course.id)
          .select('enrollment_count')
          .single();
        if (updateError) console.error('Error incrementing enrollment:', updateError.message);
        else if (data) setCourse(prev => (prev ? { ...prev, enrollment_count: data.enrollment_count } : null));
        alert('Enrolled: You have successfully enrolled in this course.');
      }
    } catch (error: any) {
      console.error('Enroll toggle error:', error.message);
      alert('Error: Failed to toggle enrollment.');
    } finally {
      setIsLoading(false);
      setShowEnrollmentModal(false);
    }
  }, [isEnrolled, course, user?.id]);

  // Handle Save/Unsave
  const handleSaveToggle = useCallback(async () => {
    if (!user?.id || !course) return;
    setIsLoading(true);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_courses')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', course.id);
        if (error) throw error;
        setIsSaved(false);
        alert('Unsaved: Course removed from your saved list.');
      } else {
        const { error } = await supabase
          .from('saved_courses')
          .insert({ user_id: user.id, course_id: course.id });
        if (error) throw error;
        setIsSaved(true);
        alert('Saved: Course added to your saved list.');
      }
    } catch (error: any) {
      console.error('Save toggle error:', error.message);
      alert('Error: Failed to toggle save.');
    } finally {
      setIsLoading(false);
    }
  }, [isSaved, course, user?.id]);

  // Handle Share
  const onShare = useCallback(async () => {
    if (!course) {
      alert('Error: Course data not loaded for sharing.');
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Learn ${course.title}`,
          text: `Check out this amazing course: ${course.title} by ${course.instructor}!`,
          url: `${window.location.origin}/courses/${course.id}`,
        });
      } else {
        const shareText = `Check out this amazing course: ${course.title} by ${course.instructor}! ${window.location.origin}/courses/${course.id}`;
        await navigator.clipboard.writeText(shareText);
        alert('Course link copied to clipboard!');
      }
    } catch (error: any) {
      console.error('Share error:', error);
      alert('Share Error: Could not share the course.');
    }
  }, [course]);

  // Handle Chapter Navigation
  const handleChapterPress = useCallback(
    (chapter: Chapter, chapterIndex: number) => {
      if (!isEnrolled) {
        setShowEnrollmentModal(true);
        return;
      }

      const isUserSubscribed = isSubscribed;
      if (chapter.isLocked && !isUserSubscribed) {
        alert('Chapter Locked: This chapter requires a premium subscription. Please subscribe to unlock all content!');
      } else {
        navigate(`/course/${courseId}/chapters/${chapter.id}`, {
          state: { chapterIndex, isEnrolled },
        });
      }
    },
    [courseId, isSubscribed, navigate, isEnrolled]
  );

  // Update Completed Chapters
  const updateCompletedChapters = useCallback(async (chapterId: string) => {
    if (!isEnrolled || !user?.id || !course) return;
    const newCompleted = completedChapters.includes(chapterId)
      ? completedChapters
      : [...completedChapters, chapterId];
    setCompletedChapters(newCompleted);
    await supabase
      .from('course_enrollments')
      .update({ completed_chapters: newCompleted })
      .eq('user_id', user.id)
      .eq('course_id', course.id);
  }, [isEnrolled, user?.id, course, completedChapters]);

  if (isLoading || !course) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading course details...</p>
      </div>
    );
  }

  const progress = isEnrolled ? (completedChapters.length / course.chapters.length) * 100 : 0;

  return (
    <div className="course-detail-container">
      <img src={course.imageUrl} alt={course.title} className="course-image" />
      <div className="course-header-content">
        <h1 className="course-title">{course.title}</h1>
        <p className="course-instructor">Instructor: {course.instructor}</p>
        <div className="course-info-row">
          <i className="ion-time-outline" />
          <span className="course-info-text">{course.duration}</span>
          <i className="ion-pricetag-outline" />
          <span className="course-price">{course.price}</span>
        </div>
        <div className="stats-and-actions-row">
          <div className="stats-group">
            <i className="ion-eye-outline" />
            <span className="stats-text">{course.views}</span>
            <i className="ion-heart-outline" />
            <span className="stats-text">{course.likes}</span>
            <i className="ion-people-outline" />
            <span className="enrollment-count-text">{course.enrollment_count || 0} enrolled</span>
          </div>
          <div className="action-buttons-group">
            <button className="action-button" onClick={onShare} disabled={isLoading}>
              <i className="ion-share-social-outline" />
              <span className="action-button-text">Share</span>
            </button>
            <button
              className={`action-button ${isSaved ? 'action-button-active' : ''}`}
              onClick={handleSaveToggle}
              disabled={isLoading}
            >
              <i className={isSaved ? 'ion-bookmark' : 'ion-bookmark-outline'} />
              <span className={`action-button-text ${isSaved ? 'action-button-text-active' : ''}`}>
                {isSaved ? 'Saved' : 'Save'}
              </span>
            </button>
            <button
              className={`action-button enroll-button ${isEnrolled ? 'enroll-button-active' : 'enroll-button-prominent'}`}
              onClick={handleEnrollToggle}
              disabled={isLoading}
            >
              <i className={isEnrolled ? 'ion-checkmark-circle' : 'ion-play-circle-outline'} />
              <span className={`action-button-text ${isEnrolled ? 'action-button-text-active' : 'enroll-button-prominent-text'}`}>
                {isEnrolled ? 'Enrolled' : 'Enroll Now'}
              </span>
            </button>
            <button
              className={`action-button like-button ${isLiked ? 'liked-button' : ''}`}
              onClick={handleLikeToggle}
              disabled={isLoading}
            >
              <i className={isLiked ? 'ion-heart' : 'ion-heart-outline'} />
              <span className={`action-button-text ${isLiked ? 'liked-button-text' : ''}`}>
                {isLiked ? 'Liked' : 'Like'}
              </span>
            </button>
          </div>
        </div>
        {isEnrolled && (
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
            <span className="progress-text">{Math.round(progress)}% Completed</span>
          </div>
        )}
      </div>
      <div className="section-container">
        <h2 className="section-title">About This Course</h2>
        <p className="course-description">{course.longDescription}</p>
      </div>
      <div className="section-container">
        <h2 className="section-title">What You'll Learn</h2>
        {course.learningOutcomes.map((outcome, index) => (
          <div key={index} className="outcome-item">
            <i className="ion-checkmark-circle outcome-icon" />
            <span className="outcome-text">{outcome}</span>
          </div>
        ))}
      </div>
      <div className="section-container">
        <div className="section-header" onClick={() => setIsChaptersExpanded(!isChaptersExpanded)}>
          <h2 className="section-title">Course Chapters</h2>
          <i className={`ion-${isChaptersExpanded ? 'chevron-up' : 'chevron-down'}`} />
        </div>
        {isChaptersExpanded && (
          <>
            {course.chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                className={`chapter-item ${(!isEnrolled || (chapter.isLocked && !isSubscribed)) ? 'locked-chapter-item' : ''}`}
                onClick={() => {
                  handleChapterPress(chapter, index);
                  if (isEnrolled && !chapter.isLocked && !isSubscribed) updateCompletedChapters(chapter.id);
                }}
                disabled={!isEnrolled && chapter.isLocked}
              >
                <div className="chapter-title-container">
                  <span className="chapter-number">Chapter {index + 1}:</span>
                  <span className="chapter-title-text">{chapter.title}</span>
                </div>
                {(!isEnrolled || (chapter.isLocked && !isSubscribed)) && <i className="ion-lock-closed" />}
                {isEnrolled && !chapter.isLocked && <i className="ion-chevron-forward" />}
                {isEnrolled && completedChapters.includes(chapter.id) && <i className="ion-checkmark-circle" />}
              </button>
            ))}
          </>
        )}
      </div>
      {!isSubscribed && (
        <button
          className="subscribe-button"
          onClick={() => alert('Subscription: Redirecting to subscription page to unlock all chapters!')}
        >
          <i className="ion-star" />
          <span className="subscribe-button-text">Unlock All Chapters (Premium)</span>
        </button>
      )}
      {showEnrollmentModal && (
        <div className="modal-overlay" onClick={() => setShowEnrollmentModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <i className="ion-information-circle-outline modal-icon" />
            <h2 className="modal-title">Enrollment Required</h2>
            <p className="modal-message">
              You must enroll in "{course.title}" to access its chapters and track your progress.
            </p>
            <div className="modal-buttons-container">
              <button
                className="modal-button modal-cancel-button"
                onClick={() => setShowEnrollmentModal(false)}
              >
                <span className="modal-button-text">Maybe Later</span>
              </button>
              <button className="modal-button modal-enroll-button" onClick={handleEnrollToggle}>
                <span className="modal-button-text">Enroll Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
