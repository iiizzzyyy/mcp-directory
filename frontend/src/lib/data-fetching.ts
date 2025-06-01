/**
 * Data fetching utilities for server components
 * Provides standardized error handling and response formatting
 */
import { createServerComponentSupabaseClient, createServerSupabaseClient } from './supabase-server';
import { Server, HealthStatus } from './types/index';
import { cache } from 'react';
import { notFound } from 'next/navigation';

/**
 * Interface for pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface for server filtering parameters
 */
export interface FilterParams {
  category?: string;
  tag?: string;
  query?: string;
}

/**
 * Interface for pagination metadata
 */
export interface PaginationMeta {
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Interface for server search response
 */
export interface ServersResponse {
  servers: Server[];
  pagination: PaginationMeta;
  error?: string;
}

/**
 * Get a server by ID, slug, or name
 * Uses React cache() for request deduplication
 */
export const getServerDetail = cache(async (idOrSlug: string): Promise<Server | null> => {
  console.log(`Fetching server details for ID: ${idOrSlug}`);
  try {
    // Try to get Supabase client with auth context first
    let supabase;
    try {
      supabase = createServerComponentSupabaseClient();
    } catch (error) {
      // Fallback to anonymous client if auth is not available
      console.log('Falling back to anonymous Supabase client');
      supabase = createServerSupabaseClient();
    }

    // First try to get by ID
    let { data: server, error } = await supabase
      .from('servers')
      .select('*')
      .eq('id', idOrSlug)
      .maybeSingle();

    // If not found by ID, try by slug
    if (!server && !error) {
      ({ data: server, error } = await supabase
        .from('servers')
        .select('*')
        .eq('slug', idOrSlug)
        .maybeSingle());
    }

    // If still not found, try by name (case insensitive)
    if (!server && !error) {
      ({ data: server, error } = await supabase
        .from('servers')
        .select('*')
        .ilike('name', idOrSlug)
        .maybeSingle());
    }

    if (error) {
      console.error('Error fetching server from Supabase:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    return server;
  } catch (error) {
    console.error('Error in getServerDetail:', error);
    throw error;
  }
});

/**
 * Get a list of servers with pagination and filtering
 * Uses React cache() for request deduplication
 */
export const getServers = cache(async (
  pagination: PaginationParams = {},
  filters: FilterParams = {}
): Promise<ServersResponse> => {
  const {
    page = 1,
    pageSize = 12,
    sortBy = 'stars',
    sortOrder = 'desc'
  } = pagination;

  const { category, tag, query } = filters;

  try {
    // Try to get Supabase client with auth context first
    let supabase;
    try {
      supabase = createServerComponentSupabaseClient();
    } catch (error) {
      // Fallback to anonymous client if auth is not available
      console.log('Falling back to anonymous Supabase client for servers list');
      supabase = createServerSupabaseClient();
    }

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Build query
    let queryBuilder = supabase
      .from('servers')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + pageSize - 1);
    
    // Apply filters if present
    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }
    
    if (tag) {
      queryBuilder = queryBuilder.contains('tags', [tag]);
    }
    
    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }
    
    // Execute query
    const { data: servers, error, count } = await queryBuilder;
    
    if (error) {
      console.error('Error fetching servers:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    return {
      servers: servers || [],
      pagination: {
        totalCount,
        currentPage: page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    console.error('Error in getServers:', error);
    throw error;
  }
});
