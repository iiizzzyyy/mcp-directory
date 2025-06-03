import React from 'react';
import { Sparkles } from 'lucide-react';
import ServerRecommendations from '@/components/recommendations/ServerRecommendations';

interface RecommendedServersSectionProps {
  className?: string;
}

/**
 * RecommendedServersSection - Component for the Discover page showing personalized recommendations
 * Part of the XOM-103 Server Recommendation Engine ticket
 */
const RecommendedServersSection: React.FC<RecommendedServersSectionProps> = ({ className = '' }) => {
  return (
    <section className={`py-6 ${className}`}>
      <div className="container px-4 md:px-6">
        <div className="flex items-center mb-8">
          <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
          <h2 className="text-2xl font-bold tracking-tight">Discover New Servers</h2>
        </div>
        
        <div className="mb-12">
          <ServerRecommendations 
            title="Recommended For You"
            limit={6}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category-specific recommendations */}
          <div>
            <ServerRecommendations 
              title="Top API Servers"
              categories={['API']}
              limit={3}
              compact={true}
            />
          </div>
          <div>
            <ServerRecommendations 
              title="Top Data Processing Servers"
              categories={['Data Processing']}
              limit={3}
              compact={true}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecommendedServersSection;
