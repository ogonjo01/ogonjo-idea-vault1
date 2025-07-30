// ogonjo-web-app/src/types/CourseTypes.ts
// Centralized interfaces for Business Short Courses.
// Defines the structure of courses, chapters, and quizzes used throughout the web app.

/**
 * Represents a single quiz question within a chapter.
 */
export interface QuizQuestion {
  /** The text of the quiz question */
  question: string;
  /** Available answer options */
  options: string[];
  /** Index of the correct answer within the options array */
  correctAnswerIndex: number;
}

/**
 * Represents a chapter within a course, which may include an optional quiz.
 */
export interface Chapter {
  /** Unique identifier for the chapter */
  id: string;
  /** Title of the chapter */
  title: string;
  /** Main content text of the chapter */
  text: string;
  /** Optional quiz questions for the chapter */
  quiz?: QuizQuestion[];
  /** Indicates if the chapter is locked behind a subscription or enrollment */
  isLocked: boolean;
}

/**
 * Represents a full course with metadata, content structure, and statistics.
 */
export interface Course {
  /** Unique identifier for the course */
  id: string;
  /** Title of the course */
  title: string;
  /** Category or topic of the course */
  category: string;
  /** Short description (used in card previews) */
  shortDescription: string;
  /** Detailed description (used on the course detail page) */
  longDescription: string;
  /** Total estimated duration (e.g., "3h 20m") */
  duration: string;
  /** Price string (e.g., "$49.99" or "Free") */
  price: string;
  /** URL to the course cover image */
  imageUrl: string;
  /** Name of the course instructor */
  instructor: string;
  /** List of key learning outcomes for the course */
  learningOutcomes: string[];
  /** Structured chapters within the course */
  chapters: Chapter[];
  /** Number of views (used for "Most Viewed" sorting) */
  views: number;
  /** Number of likes (used for "Most Liked" sorting) */
  likes: number;
  /** ISO string timestamp for creation date (used for "Latest Courses") */
  createdAt: string;
  /** Calculated composite score for popularity-based sorting */
  popularityScore: number;
}
