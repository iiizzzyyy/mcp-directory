import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, TrendingUp, UsersRound, TagIcon } from 'lucide-react';
import Link from 'next/link';

// Define the recommendation factor types
export type RecommendationFactor = 
  | 'similar_to_viewed'
  | 'popular_in_category' 
  | 'similar_tags'
  | 'frequently_used_together'
  | 'rising_popularity'
  | 'compatible_with_environment';

// Define the server recommendation interface
export interface ServerRecommendation {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  similarity_score: number;
  popularity: number;
  recommendation_factors: RecommendationFactor[];
}

interface RecommendationCardProps {
  recommendation: ServerRecommendation;
  compact?: boolean;
  className?: string;
}

/**
 * RecommendationCard - Displays a recommended server with visual indicators for why it was recommended
 * 
 * @param props - Component props
 * @returns A styled recommendation card component
 */
export const RecommendationCard: React.FC<RecommendationCardProps> = ({ 
  recommendation, 
  compact = false,
  className = '' 
}) => {
  // Get the appropriate icon and text for each recommendation factor
  const getFactorInfo = (factor: RecommendationFactor) => {
    switch (factor) {
      case 'similar_to_viewed':
        return { icon: <UsersRound className="h-3 w-3 mr-1" />, text: 'Similar to viewed' };
      case 'popular_in_category':
        return { icon: <TrendingUp className="h-3 w-3 mr-1" />, text: 'Popular in category' };
      case 'similar_tags':
        return { icon: <TagIcon className="h-3 w-3 mr-1" />, text: 'Similar tags' };
      case 'frequently_used_together':
        return { icon: <UsersRound className="h-3 w-3 mr-1" />, text: 'Used together' };
      case 'rising_popularity':
        return { icon: <TrendingUp className="h-3 w-3 mr-1" />, text: 'Rising popularity' };
      case 'compatible_with_environment':
        return { icon: <Sparkles className="h-3 w-3 mr-1" />, text: 'Compatible' };
      default:
        return { icon: <Sparkles className="h-3 w-3 mr-1" />, text: 'Recommended' };
    }
  };

  // Format the similarity score as a percentage
  const formatSimilarity = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };
  
  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${className}`}>
      <CardHeader className={`${compact ? 'p-4 pb-2' : 'p-6 pb-3'}`}>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className={`${compact ? 'text-base' : 'text-xl'} font-medium`}>
              {recommendation.name}
            </CardTitle>
            {recommendation.category && (
              <Badge variant="outline" className="mt-1">
                {recommendation.category}
              </Badge>
            )}
          </div>
          {!compact && recommendation.similarity_score > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2 bg-green-100 hover:bg-green-100 text-green-800"
            >
              {formatSimilarity(recommendation.similarity_score)} match
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={`${compact ? 'px-4 py-2' : 'px-6 py-2'}`}>
        {!compact && recommendation.description && (
          <CardDescription className="line-clamp-2">
            {recommendation.description}
          </CardDescription>
        )}
        
        <div className="flex flex-wrap gap-1 mt-2">
          {recommendation.recommendation_factors.slice(0, compact ? 1 : 2).map((factor, index) => {
            const { icon, text } = getFactorInfo(factor);
            return (
              <Badge key={index} variant="secondary" className="text-xs flex items-center">
                {icon}
                {text}
              </Badge>
            );
          })}
          
          {recommendation.tags && recommendation.tags.slice(0, compact ? 1 : 2).map((tag, index) => (
            <Badge key={`tag-${index}`} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className={`bg-slate-50 ${compact ? 'px-4 py-2' : 'px-6 py-3'}`}>
        <Link href={`/servers/${recommendation.id}`} className="w-full">
          <Button 
            variant="ghost" 
            className="w-full justify-between hover:bg-white hover:text-black border border-slate-200"
          >
            View server
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default RecommendationCard;
