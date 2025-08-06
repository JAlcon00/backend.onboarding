import { geminiClient } from '../utils/gemini';
import Document from '../modules/documento/documento.model';
import { ValidationError } from '../types/errors';

class GeminiService {
  private geminiClient = geminiClient;

  async analyzeDocument(documentId: string): Promise<any> {
    try {
      const document = await Document.findByPk(documentId);
      if (!document) {
        throw new ValidationError('Document not found');
      }

      const analysisResult = await this.geminiClient.post('/analyze', {
        content: document.archivo_url,
      });

      return analysisResult.data;
    } catch (error) {
      console.error('Error analyzing document:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();