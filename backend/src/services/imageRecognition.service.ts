import { env } from '../config/env';
import { ImageSignature } from '../models/ImageSignature';
import { LostPetReport } from '../models/LostPetReport';
import { FoundAnimalReport } from '../models/FoundAnimalReport';

/**
 * Image Recognition Matching.
 *
 * Pipeline (see docs/data-flow-diagrams.md, DFD Level 2):
 *   1. preprocess image (resize / normalize)
 *   2. extract a feature embedding with an on-device/edge model (MobileNet v3)
 *   3. pull the candidate pool: opposite report type, still `active`, inside radius
 *   4. cosine-similarity score each candidate
 *   5. return the top-N above IR_MATCH_THRESHOLD
 *
 * The embedding step is intentionally pluggable - wire it to a TensorFlow.js
 * model, an ONNX runtime, or a self-hosted inference endpoint. No third-party
 * animal database is queried (Limitation #3).
 */
export interface EmbeddingProvider {
  embed(imageBuffer: Buffer): Promise<number[]>;
}

// TODO: replace with a real model runner (tfjs-node / onnxruntime-node).
const placeholderProvider: EmbeddingProvider = {
  async embed(): Promise<number[]> {
    throw new Error('EmbeddingProvider not configured - see imageRecognition.service.ts');
  },
};

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export interface MatchResult {
  reportId: string;
  score: number;
}

export function createImageRecognitionService(provider: EmbeddingProvider = placeholderProvider) {
  return {
    async indexImage(params: {
      sourceType: 'lost' | 'found' | 'shelter_animal';
      sourceId: string;
      imageUrl: string;
      imageBuffer: Buffer;
    }): Promise<void> {
      const embedding = await provider.embed(params.imageBuffer);
      await ImageSignature.create({
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        imageUrl: params.imageUrl,
        embedding,
        model: env.imageRecognition.model,
      });
    },

    /** Find candidate matches for a freshly filed report. */
    async findMatches(params: {
      queryEmbedding: number[];
      against: 'lost' | 'found';
      candidateIds: string[];
    }): Promise<MatchResult[]> {
      const signatures = await ImageSignature.find({
        sourceType: params.against,
        sourceId: { $in: params.candidateIds },
      }).lean();

      const byReport = new Map<string, number>();
      for (const sig of signatures) {
        const score = cosineSimilarity(params.queryEmbedding, sig.embedding as number[]);
        const key = String(sig.sourceId);
        if (score > (byReport.get(key) ?? 0)) byReport.set(key, score);
      }

      return [...byReport.entries()]
        .filter(([, score]) => score >= env.imageRecognition.matchThreshold)
        .map(([reportId, score]) => ({ reportId, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, env.imageRecognition.maxResults);
    },
  };
}

export { LostPetReport, FoundAnimalReport };
export const imageRecognitionService = createImageRecognitionService();
