import {
  AcademicDocument,
  SavedItem,
  LecturerCourse,
  MeaningPreservationReport,
  AppLanguage,
  StudioTab,
  DifficultyLevel,
  FormatVerificationResult,
  GeneratorTestSuiteResult,
  VerificationMetricReport,
  IntegrationSuiteResult
} from '../types';
import { StorageService } from './storageService';

const API_BASE = '/api';

export class ApiClient {
  private static token: string | null = localStorage.getItem('learnova_auth_token') || localStorage.getItem('learnlens_auth_token');

  static setToken(token: string) {
    this.token = token;
    localStorage.setItem('learnova_auth_token', token);
  }

  static getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('learnova_auth_token') || localStorage.getItem('learnlens_auth_token');
    }
    // If in development mode and token is missing, auto-bind default student session
    if (!this.token && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      this.token = 'token_demo_pooja_session';
      localStorage.setItem('learnova_auth_token', this.token);
    }
    return this.token;
  }

  static logout() {
    this.token = null;
    localStorage.removeItem('learnova_auth_token');
    localStorage.removeItem('learnlens_auth_token');
    localStorage.removeItem('learnova_current_user');
    localStorage.removeItem('learnlens_current_user');
  }

  // Authentication
  static async login(email: string, password?: string): Promise<{ user: any; token: string }> {
    const data = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      this.setToken(data.token);
      localStorage.setItem('learnova_current_user', JSON.stringify(data.user));
    }
    return data;
  }

  static async register(
    name: string,
    email: string,
    password?: string,
    role: string = 'student',
    lecturerInviteKey?: string
  ): Promise<{ user: any; token: string }> {
    const data = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, lecturerInviteKey })
    });
    if (data.token) {
      this.setToken(data.token);
      localStorage.setItem('learnova_current_user', JSON.stringify(data.user));
    }
    return data;
  }

  static async getMe(): Promise<any> {
    try {
      const data = await this.request<{ user: any }>('/auth/me');
      if (data?.user) {
        localStorage.setItem('learnova_current_user', JSON.stringify(data.user));
      }
      return data.user;
    } catch {
      this.logout();
      return null;
    }
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      // Auto-recover from 401 in development mode if session expired or lost
      if (res.status === 401 && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        console.warn('[ApiClient] 401 session expired or invalid in dev mode. Auto-recovering student session...');
        try {
          const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'alex.rivera@university.edu', password: 'student123' })
          });
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            if (loginData?.token) {
              this.setToken(loginData.token);
              // Retry with fresh token
              const retryHeaders = {
                ...headers,
                'Authorization': `Bearer ${loginData.token}`
              };
              const retryRes = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: retryHeaders
              });
              if (retryRes.ok) {
                return retryRes.json();
              }
            }
          }
        } catch (recoverErr) {
          console.warn('[ApiClient] Auto-reauthentication attempt failed:', recoverErr);
        }
      }

      if (res.status === 401) {
        this.logout();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('learnova_auth_required'));
        }
      }
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Request failed with status ${res.status}`);
    }

    return res.json();
  }

  // Health
  static async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  // Documents
  static async getDocuments(): Promise<AcademicDocument[]> {
    const data = await this.request<{ documents: any[] }>('/documents');
    return (data.documents || []).map(d => StorageService.sanitizeDocument(d));
  }

  static async getDocumentById(id: string): Promise<any> {
    return this.request(`/documents/${id}`);
  }

  static async getExtraction(id: string): Promise<any> {
    return this.request(`/documents/${id}/extraction`);
  }

  static async getExtractionBenchmark(): Promise<any> {
    return this.request('/extraction/benchmark');
  }

  static async uploadDocument(formData: FormData): Promise<any> {
    return this.request('/documents/upload', {
      method: 'POST',
      body: formData
    });
  }

  static async renameDocument(id: string, title: string): Promise<any> {
    return this.request(`/documents/${id}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ title })
    });
  }

  static async deleteDocument(id: string): Promise<any> {
    return this.request(`/documents/${id}`, {
      method: 'DELETE'
    });
  }

  static async clearAllDocuments(): Promise<any> {
    return this.request('/documents/clear-all', {
      method: 'POST'
    });
  }

  // Learning Generator & Section 5.6 Test Suite
  static async getMaterials(documentId: string): Promise<any[]> {
    const data = await this.request<{ materials: any[] }>(`/documents/${documentId}/materials`);
    return data.materials || [];
  }

  static async generateMaterial(
    documentId: string,
    formatType: StudioTab,
    language: AppLanguage,
    difficulty: DifficultyLevel = 'intermediate',
    forceRegenerate: boolean = false
  ): Promise<{ material: any; verification?: FormatVerificationResult; cached: boolean }> {
    return this.request(`/documents/${documentId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ formatType, language, difficulty, forceRegenerate })
    });
  }

  static async runGeneratorTestSuite(documentId: string): Promise<GeneratorTestSuiteResult> {
    const data = await this.request<{ testResult: GeneratorTestSuiteResult }>(`/documents/${documentId}/test-generator`, {
      method: 'POST'
    });
    return data.testResult;
  }

  // Source Verification & Meaning Preservation Engine (Phase 6)
  static async getVerification(documentId: string): Promise<MeaningPreservationReport> {
    const data = await this.request<{ verification: MeaningPreservationReport }>(`/documents/${documentId}/verification`);
    return data.verification;
  }

  static async getVerificationBenchmark(): Promise<VerificationMetricReport> {
    const data = await this.request<{ benchmark: VerificationMetricReport }>('/verification/benchmark');
    return data.benchmark;
  }

  static async correctVerificationItem(
    docId: string,
    factId: string,
    correctedText: string,
    userNotes?: string
  ): Promise<any> {
    return this.request(`/verification/${docId}/item/${factId}/correct`, {
      method: 'POST',
      body: JSON.stringify({ correctedText, userNotes })
    });
  }

  static async flagVerificationItem(
    docId: string,
    factId: string,
    reason: string,
    userComment?: string
  ): Promise<any> {
    return this.request(`/verification/${docId}/item/${factId}/flag`, {
      method: 'POST',
      body: JSON.stringify({ reason, userComment })
    });
  }

  static async getDeliberateTests(): Promise<any> {
    const data = await this.request<{ deliberateTests: any }>('/verification/deliberate-tests');
    return data.deliberateTests;
  }

  // System Integration & 20-Point Test Tracker
  static async runIntegrationTest(): Promise<IntegrationSuiteResult> {
    const data = await this.request<{ integrationSuite: IntegrationSuiteResult }>('/system/integration-test');
    return data.integrationSuite;
  }

  static async getSystemTestTracker(): Promise<any> {
    const data = await this.request<{ testTracker: any }>('/system/test-tracker');
    return data.testTracker;
  }

  // Step 3: Explain This Feature
  static async explainThis(payload: {
    documentId: string;
    selectionText: string;
    contextSnippet?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    language?: string;
    pageNumber?: number;
    sectionTitle?: string;
  }): Promise<any> {
    const data = await this.request<{ explanation: any }>('/learning/explain-this', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.explanation;
  }

  // Step 7: Ask Follow-up Question
  static async askQuestion(payload: {
    documentId: string;
    question: string;
    currentSectionTitle?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    language?: string;
    pageNumber?: number;
  }): Promise<any> {
    const data = await this.request<{ response: any }>('/learning/ask-question', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.response;
  }

  // Saved Items
  static async getSavedItems(): Promise<SavedItem[]> {
    const data = await this.request<{ savedItems: SavedItem[] }>('/saved');
    return data.savedItems;
  }

  static async addSavedItem(item: Partial<SavedItem>): Promise<SavedItem> {
    const data = await this.request<{ item: SavedItem }>('/saved', {
      method: 'POST',
      body: JSON.stringify(item)
    });
    return data.item;
  }

  static async removeSavedItem(id: string): Promise<boolean> {
    const data = await this.request<{ success: boolean }>(`/saved/${id}`, {
      method: 'DELETE'
    });
    return data.success;
  }

  // Quizzes & Analytics
  static async submitQuizAttempt(docId: string, answers: any[], totalQuestions: number): Promise<any> {
    return this.request(`/quizzes/${docId}/attempt`, {
      method: 'POST',
      body: JSON.stringify({ answers, totalQuestions })
    });
  }

  static async getDocQuizAnalytics(docId: string): Promise<any> {
    const data = await this.request<{ analytics: any }>(`/quizzes/${docId}/analytics`);
    return data.analytics;
  }

  // Lecturer Courses & Analytics
  static async getCourses(): Promise<LecturerCourse[]> {
    const data = await this.request<{ courses: LecturerCourse[] }>('/lecturer/courses');
    return data.courses;
  }

  static async togglePublishCourse(courseId: string): Promise<any> {
    return this.request(`/lecturer/courses/${courseId}/toggle-publish`, {
      method: 'POST'
    });
  }

  static async getCourseQuizAnalytics(courseId: string): Promise<any> {
    const data = await this.request<{ analytics: any }>(`/lecturer/courses/${courseId}/analytics`);
    return data.analytics;
  }

  static async assignDocToCourse(courseId: string, documentId: string): Promise<any> {
    return this.request(`/lecturer/courses/${courseId}/documents`, {
      method: 'POST',
      body: JSON.stringify({ documentId })
    });
  }

  static async removeDocFromCourse(courseId: string, documentId: string): Promise<any> {
    return this.request(`/lecturer/courses/${courseId}/documents/${documentId}`, {
      method: 'DELETE'
    });
  }

  // Faculty Grounding Actions
  static async approveVerificationItem(docId: string, factId: string, facultyNotes?: string): Promise<any> {
    return this.request(`/verification/${docId}/item/${factId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ facultyNotes })
    });
  }

  static async rejectVerificationItem(docId: string, factId: string, facultyNotes?: string): Promise<any> {
    return this.request(`/verification/${docId}/item/${factId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ facultyNotes })
    });
  }

  // Feedback System (Step 39)
  static async submitFeedback(report: {
    documentId: string;
    formatType: string;
    itemIdentifier?: string;
    reason: string;
    userComment: string;
    sourcePassage?: string;
  }): Promise<any> {
    return this.request('/feedback', {
      method: 'POST',
      body: JSON.stringify(report)
    });
  }

  static async getFeedbackReports(documentId?: string, status?: string): Promise<any[]> {
    let url = '/feedback';
    const params = new URLSearchParams();
    if (documentId) params.append('documentId', documentId);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;
    const data = await this.request<{ reports: any[] }>(url);
    return data.reports || [];
  }

  static async updateFeedbackStatus(id: string, status: string, notes?: string): Promise<any> {
    return this.request(`/feedback/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNotes: notes })
    });
  }

  // Student Progress (Step 37)
  static async getStudentProgress(): Promise<any> {
    const data = await this.request<{ progress: any }>('/student/progress');
    return data.progress;
  }

  // AI Model Status & Configuration
  static async getAiStatus(): Promise<{
    geminiConfigured: boolean;
    openaiConfigured: boolean;
    activeProvider: string;
    mode: string;
    modelName: string;
  }> {
    const data = await this.request<{ status: any }>('/system/ai-status');
    return data.status;
  }

  static async setAiConfig(provider: 'gemini' | 'openai', apiKey: string): Promise<any> {
    return this.request('/system/ai-config', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey })
    });
  }

  // Document Export (Step 38)
  static getExportUrl(docId: string, format: string = 'pdf', type: string = 'notes', language: string = 'English'): string {
    const token = this.getToken();
    return `${API_BASE}/documents/${docId}/export?format=${format}&type=${type}&language=${encodeURIComponent(language)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  }
}
