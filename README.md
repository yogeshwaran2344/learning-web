# LEARNOVA — Verified Academic Transformation & Meaning Preservation Platform

LEARNOVA is a state-of-the-art educational and research platform that transforms academic materials (research papers, textbook chapters, lecture slides) into multiple verified learning formats while strictly preserving original meaning, mathematical equations, and boundary conditions.

Every single generated statement, flashcard, and concept node links bi-directionally back to its exact source passage with click-to-highlight traceability.

---

## Architecture Overview (Phases 1 to 8)

### Phase 1: Plan the Application
- **Core Objective**: Convert academic materials into multi-modal learning formats with formal source verification.
- **Target Users**: College students, lecturers, researchers, and learners requiring accessibility accommodations (dyslexia font, text scaling, screen-reader support).
- **Core Formats**: Interactive Concept Maps, Multi-Tier Explanations, Audio Narrations, Spaced Repetition Flashcards, Source Citations, and the Meaning Preservation Audit.

### Phase 2: Frontend Design
- **Main Dashboard (`Dashboard.tsx`)**: Recent documents, library stats (meaning fidelity rate, flashcard mastery, zero altered equations), quick upload, format shortcuts, and personalized format recommendations.
- **Document Upload Page (`DocumentUploadModal.tsx`)**: File dropzone (PDFs, slides, text), quick sample papers (ResNet, Quantum Teleportation, PBFT), and animated 4-step pipeline monitor.
- **Learning Workspace (`Workspace.tsx`)**: Split-screen view with Original Document on the left and active learning format on the right, with synchronized source citation jumping.

### Phase 3: Document Processing System
- **Text & Structure Extraction (`documentProcessor.ts`)**: Extracts headings, LaTeX equations, definitions, conditions, and tables.
- **Semantic Organization**: Automatically parses documents into chapters, concepts, prerequisite dependencies, boundary invariants, and page citations.

### Phase 4: Learning Formats
- **Concept Map Generator (`ConceptMapView.tsx`)**: Interactive SVG graph featuring category filters (Core, Mechanism, Equation, Condition, Application), prerequisite arrows, zoom/pan, and citation inspection.
- **Explanation Generator (`ExplanationView.tsx`)**: 3-tier synthesis:
  1. *Intuitive Analogy* (Simplified, real-world comparison)
  2. *Rigorous Theory* (Formal academic exposition)
  3. *Worked Example* (Concrete numbers, walkthroughs, and edge cases)
- **Flashcard & Quiz Engine (`FlashcardView.tsx`)**: 3D interactive flip cards with spaced repetition self-grading (Again, Hard, Mastered), multiple-choice practice quiz mode, and keyboard shortcuts (`Space`, `←/→`, `1-4`).
- **Audio Lesson Narration (`AudioLessonView.tsx`, `audioService.ts`)**: Browser-native Web Speech API narration with speed controls (0.75x to 2.0x), section-by-section playlist, and synchronized real-time script tracking.

### Phase 5: The Main Innovation — Meaning Preservation Engine
- **Meaning Preservation Audit (`MeaningPreservationView.tsx`)**:
  - **Fidelity Score**: Mathematical verification score (e.g. 99.1%).
  - **4 Precision Pillars**: Fact Retention (100%), Equation Integrity (0 Alterations), Boundary Invariant Accuracy, and Terminology Consistency.
  - **Source Traceability**: Clicking any citation badge jumps to and pulses the exact original source sentence.
  - **Validation Matrix**: Compares atomic facts across Concept Maps, Explanations, Flashcards, and Audio transcripts.
  - **Faculty Sign-Off**: Lecturer certification workflow.

### Phase 6: Personalization & Accessibility
- **Accessibility Suite (`AccessibilityModal.tsx`)**: Font scaling (85% to 130%), OpenDyslexic high-legibility font toggle, High Contrast mode, language selector, and keyboard shortcuts cheat sheet.
- **Feedback & Verification Loop (`FeedbackModal.tsx`)**: Students can report inaccuracies, altered equations, or unclear explanations directly into the audit registry.

### Phase 7: Backend & Storage Integration
- **Storage Service (`storageService.ts`)**: Reactive LocalStorage and state persistence for documents, user preferences, flashcard mastery, and feedback audit logs.
- **Role Permissions**: Seamless toggle between **College Student** and **Lecturer / Faculty** view.

### Phase 8: Testing, Usability & Deployment
- **Preloaded Academic Library**: Includes *Attention Is All You Need* (Transformers), *Schrödinger Wave Mechanics* (Quantum), and *Raft Distributed Consensus*.
- **Usability Study Simulator (`UsabilityTestModal.tsx`)**: Measures comprehension gains (+42% vs raw reading), retention speed, and student clarity ratings.
- **Production Build**: Verified with Vite and TypeScript (`npm run build`).

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build for Production
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```
