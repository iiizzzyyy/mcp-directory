// Logging utility for tools detection
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Logger for tools detection operations
 * 
 * Records detection activities in the database for monitoring and analytics
 */
export class ToolsDetectionLogger {
  /**
   * Log a tools detection operation
   * 
   * @param serverId Server ID
   * @param detectionSource Detection method used (standard_mcp_api, alternative_api, github_repository)
   * @param toolsDetected Number of tools detected
   * @param durationMs Duration of the detection in milliseconds
   * @param error Optional error message if detection failed
   */
  static async logDetection(
    serverId: string, 
    detectionSource: string, 
    toolsDetected: number, 
    durationMs: number,
    error?: string
  ): Promise<void> {
    try {
      const { error: insertError } = await supabase
        .from('tools_detection_logs')
        .insert({
          server_id: serverId,
          detection_source: detectionSource,
          tools_detected: toolsDetected,
          duration_ms: durationMs,
          error: error,
          success: !error
        });
      
      if (insertError) {
        console.error('Error logging detection:', insertError);
      }
      
      // Update the server's last_tools_scan timestamp
      const { error: updateError } = await supabase
        .from('servers')
        .update({ 
          last_tools_scan: new Date().toISOString() 
        })
        .eq('id', serverId);
      
      if (updateError) {
        console.error('Error updating last_tools_scan:', updateError);
      }
    } catch (err) {
      console.error('Failed to log detection:', err);
    }
  }
  
  /**
   * Get recent detection logs
   * 
   * @param limit Maximum number of logs to return
   * @param offset Offset for pagination
   * @returns Detection logs
   */
  static async getRecentLogs(
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('tools_detection_logs')
        .select(`
          id,
          server_id,
          detection_source,
          tools_detected,
          duration_ms,
          error,
          success,
          created_at,
          servers:server_id(name)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('Error fetching detection logs:', error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('Failed to get detection logs:', err);
      return [];
    }
  }
  
  /**
   * Get detection statistics
   * 
   * @param days Number of days to include in statistics
   * @returns Detection statistics
   */
  static async getStatistics(days: number = 7): Promise<any> {
    try {
      // Calculate date range
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get logs within date range
      const { data, error } = await supabase
        .from('tools_detection_logs')
        .select('detection_source, tools_detected, success, duration_ms, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate);
      
      if (error) {
        console.error('Error fetching detection statistics:', error);
        return {
          total: 0,
          success_rate: 0,
          avg_tools: 0,
          avg_duration_ms: 0,
          by_source: {}
        };
      }
      
      // Calculate statistics
      const logs = data || [];
      const total = logs.length;
      const successful = logs.filter(log => log.success).length;
      const successRate = total > 0 ? (successful / total) * 100 : 0;
      
      // Calculate average tools detected
      const totalTools = logs.reduce((sum, log) => sum + (log.tools_detected || 0), 0);
      const avgTools = total > 0 ? totalTools / total : 0;
      
      // Calculate average duration
      const totalDuration = logs.reduce((sum, log) => sum + (log.duration_ms || 0), 0);
      const avgDuration = total > 0 ? totalDuration / total : 0;
      
      // Group by detection source
      const bySource = logs.reduce((acc: Record<string, number>, log) => {
        const source = log.detection_source || 'unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});
      
      return {
        total,
        success_rate: Math.round(successRate * 100) / 100,
        avg_tools: Math.round(avgTools * 100) / 100,
        avg_duration_ms: Math.round(avgDuration),
        by_source: bySource
      };
    } catch (err) {
      console.error('Failed to get detection statistics:', err);
      return {
        total: 0,
        success_rate: 0,
        avg_tools: 0,
        avg_duration_ms: 0,
        by_source: {}
      };
    }
  }
}
