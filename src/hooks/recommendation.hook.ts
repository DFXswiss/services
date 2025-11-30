import { useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { CreateRecommendation, Recommendation } from 'src/dto/recommendation.dto';

interface RecommendationInterface {
  getRecommendations: () => Promise<Recommendation[]>;
  createRecommendation: (data: CreateRecommendation) => Promise<Recommendation>;
  confirmRecommendation: (recommendation: Recommendation) => Promise<void>;
  rejectRecommendation: (recommendation: Recommendation) => Promise<void>;
}

export default function useRecommendation(): RecommendationInterface {
  const { call } = useApi();

  async function getRecommendations(): Promise<Recommendation[]> {
    return call<Recommendation[]>({
      url: 'recommendation',
      method: 'GET',
    });
  }

  async function createRecommendation(data: CreateRecommendation): Promise<Recommendation> {
    return call<Recommendation>({
      url: 'recommendation',
      method: 'POST',
      data,
    });
  }

  async function confirmRecommendation(recommendation: Recommendation): Promise<void> {
    return call<void>({
      url: `recommendation/${recommendation.id}/confirm`,
      method: 'PUT',
    });
  }

  async function rejectRecommendation(recommendation: Recommendation): Promise<void> {
    return call<void>({
      url: `recommendation/${recommendation.id}/reject`,
      method: 'PUT',
    });
  }

  return useMemo(
    () => ({ getRecommendations, createRecommendation, confirmRecommendation, rejectRecommendation }),
    [call],
  );
}
