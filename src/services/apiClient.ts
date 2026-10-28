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
  private static token: string | null = null;

  static setToken(token: string) {
    this.token = token;
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
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

  // Learning Generator & Section 5.6 Test Suite
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

  // System Integration Test (Section 7.5)
  static async runIntegrationTest(): Promise<IntegrationSuiteResult> {
    const data = await this.request<{ integrationSuite: IntegrationSuiteResult }>('/system/integration-test');
    return data.integrationSuite;
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

  // Quizzes
  static async submitQuizAttempt(docId: string, answers: any[], totalQuestions: number): Promise<any> {
    return this.request(`/quizzes/${docId}/attempt`, {
      method: 'POST',
      body: JSON.stringify({ answers, totalQuestions })
    });
  }

  // Lecturer Courses
  static async getCourses(): Promise<LecturerCourse[]> {
    const data = await this.request<{ courses: LecturerCourse[] }>('/lecturer/courses');
    return data.courses;
  }

  static async togglePublishCourse(courseId: string): Promise<any> {
    return this.request(`/lecturer/courses/${courseId}/toggle-publish`, {
      method: 'POST'
    });
  }
}
