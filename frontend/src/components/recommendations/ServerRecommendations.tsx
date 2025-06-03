import React, { useEffect, useState } from 'react';
import { ServerRecommendation } from './RecommendationCard';
import RecommendationCard from './RecommendationCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';

// Environment-aware API URL
const getApiUrl = () => {
  // Use environment variable if available, otherwise fallback to production URL
  return process.env.NEXT_PUBLIC_SUPABASE_URL 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/server-recommendations`
    : 'https://nryytfezkmptcmpawlva.supabase.co/functions/v1/server-recommendations';
};

interface ServerRecommendationsProps {
  contextServerId?: string;
  limit?: number;
  categories?: string[];
  tags?: string[];
  excludeIds?: string[];
  compact?: boolean;
  title?: string;
  className?: string;
}

interface RecommendationResponse {
  recommendations: ServerRecommendation[];
  recommendation_context: {
    personalized: boolean;
    based_on_server: string | null;
    filters_applied: Record<string, any>;
  };
}

/**
 * ServerRecommendations - Displays a list of recommended servers
 * 
 * @param props - Component props
 * @returns A component that displays server recommendations
 */
const ServerRecommendations: React.FC<ServerRecommendationsProps> = ({
  contextServerId,
  limit = 3,
  categories = [],
  tags = [],
  excludeIds = [],
  compact = false,
  title = "Recommended Servers",
  className = '',
}) => {
  const [recommendations, setRecommendations] = useState<ServerRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [personalized, setPersonalized] = useState<boolean>(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (contextServerId) params.append('context_server_id', contextServerId);
        if (limit) params.append('limit', limit.toString());
        if (categories && categories.length) params.append('categories', categories.join(','));
        if (tags && tags.length) params.append('tags', tags.join(','));
        if (excludeIds && excludeIds.length) params.append('excludeIds', excludeIds.join(','));
        
        // Get auth token if user is logged in
        let headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        // Add auth token if available (for personalized recommendations)
        const token = localStorage.getItem('supabase.auth.token');
        if (token) {
          try {
            const parsedToken = JSON.parse(token);
            if (parsedToken?.currentSession?.access_token) {
              headers['Authorization'] = `Bearer ${parsedToken.currentSession.access_token}`;
            }
          } catch (e) {
            console.warn('Failed to parse auth token for recommendations', e);
          }
        }
        
        // Fetch recommendations
        const response = await fetch(`${getApiUrl()}?${params.toString()}`, {
          method: 'GET',
          headers,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
        }
        
        const data: RecommendationResponse = await response.json();
        
        // Update state with recommendations
        setRecommendations(data.recommendations || []);
        setPersonalized(data.recommendation_context.personalized);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError((err as Error).message);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [contextServerId, limit, categories.join(','), tags.join(','), excludeIds.join(',')]);
  
  // Don't render anything if there are no recommendations and we're not loading
  if (!loading && recommendations.length === 0 && !error) {
    return null;
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center">
        <h3 className="text-lg font-medium flex items-center">
          <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
          {title}
          {personalized && (
            <span className="ml-2 text-xs text-purple-500 font-normal">
              (Personalized)
            </span>
          )}
        </h3>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(limit).fill(0).map((_, i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <div className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="bg-slate-50 p-4">
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-red-500">
          Error loading recommendations: {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((recommendation) => (
            <RecommendationCard 
              key={recommendation.id}
              recommendation={recommendation}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ServerRecommendations;
