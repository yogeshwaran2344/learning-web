import { DocumentAnnotation } from '../types';

export class AnnotationService {
  private static STORAGE_KEY_PREFIX = 'learnova_annotations_';

  public static getAnnotations(documentId: string): DocumentAnnotation[] {
    try {
      const raw = localStorage.getItem(`${this.STORAGE_KEY_PREFIX}${documentId}`);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static saveAnnotations(documentId: string, annotations: DocumentAnnotation[]): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY_PREFIX}${documentId}`, JSON.stringify(annotations));
    } catch (e) {
      console.warn('Failed to save annotations to localStorage:', e);
    }
  }

  public static addAnnotation(documentId: string, annotation: Omit<DocumentAnnotation, 'id' | 'createdAt' | 'documentId'>): DocumentAnnotation {
    const list = this.getAnnotations(documentId);
    const newAnno: DocumentAnnotation = {
      ...annotation,
      documentId,
      id: `anno-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    list.push(newAnno);
    this.saveAnnotations(documentId, list);
    return newAnno;
  }

  public static removeAnnotation(documentId: string, annotationId: string): void {
    const list = this.getAnnotations(documentId).filter(a => a.id !== annotationId);
    this.saveAnnotations(documentId, list);
  }
}
