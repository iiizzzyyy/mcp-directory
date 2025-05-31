"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { Loader2 as LoaderCircle, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Form data interface for server submission
 */
interface FormData {
  name: string;
  description: string;
  github_url: string;
  tags: string;
  category: string;
  install_method: string;
}

/**
 * GitHub repository interface
 */
interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  topics?: string[];
}

/**
 * GitHub-powered server submission form component
 * Allows developers to submit MCP servers for approval
 * 
 * @returns Server submission form component
 */
export function SubmitServerForm() {
  // Authentication state
  const { user, session, signIn, signInWithOAuth } = useAuth();
  
  // Form state
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>();
  
  // Component state
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(false);
  
  // Watch github_url to detect changes
  const githubUrl = watch('github_url');

  /**
   * Fetch user's GitHub repositories when authenticated
   */
  const fetchUserRepos = async (): Promise<void> => {
    if (!user || !session) return;

    try {
      setIsLoadingRepos(true);
      
      // Check if user has GitHub identity linked
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const userData = await response.json();
      const githubIdentity = userData.identities?.find((identity: any) => identity.provider === 'github');
      
      if (!githubIdentity) {
        console.log('No GitHub identity linked');
        return;
      }
      
      // Fetch repositories using GitHub API access token from auth
      const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
        headers: {
          'Authorization': `token ${githubIdentity.access_token}`
        }
      });
      
      if (!reposResponse.ok) {
        throw new Error('Failed to fetch repositories');
      }
      
      const repos = await reposResponse.json();
      setUserRepos(repos);
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  /**
   * Handle GitHub login
   */
  const handleGitHubLogin = async (): Promise<void> => {
    try {
      await signInWithOAuth('github');
    } catch (error) {
      console.error('Error signing in with GitHub:', error);
      setErrorMessage('Failed to sign in with GitHub');
    }
  };

  /**
   * Pre-fill form data from selected GitHub repository
   * @param repo The selected GitHub repository
   */
  const prefillFromRepo = (repo: GitHubRepo): void => {
    setValue('name', repo.name || '');
    setValue('description', repo.description || '');
    setValue('github_url', repo.html_url || '');
    
    // Set tags from GitHub topics if available
    if (repo.topics && repo.topics.length > 0) {
      setValue('tags', repo.topics.join(', '));
    }
    
    setSelectedRepo(repo);
  };

  /**
   * Handle repository selection change
   * @param e The change event
   */
  const handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const selectedRepoUrl = e.target.value;
    if (!selectedRepoUrl) {
      setSelectedRepo(null);
      return;
    }
    
    const repo = userRepos.find(r => r.html_url === selectedRepoUrl);
    if (repo) {
      prefillFromRepo(repo);
    }
  };

  /**
   * Handle form submission
   * @param data The form data
   */
  const onSubmit = async (data: FormData): Promise<void> => {
    try {
      setSubmitStatus('loading');
      setErrorMessage(null);
      
      if (!session) {
        throw new Error('You must be signed in to submit a server');
      }
      
      // Convert comma-separated tags to array
      // Reason: The API expects tags as an array but it's easier for users to enter them as comma-separated values
      const tagsArray = data.tags
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submissions-create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            name: data.name,
            description: data.description,
            github_url: data.github_url,
            tags: tagsArray,
            category: data.category,
            install_method: data.install_method
          })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to submit server');
      }
      
      setSubmitStatus('success');
    } catch (error: any) {
      console.error('Error submitting server:', error);
      setSubmitStatus('error');
      setErrorMessage(error.message || 'An error occurred while submitting your server');
    }
  };

  // Fetch user repos after authentication
  useEffect(() => {
    if (user && session) {
      fetchUserRepos();
    }
  }, [user, session]);

  /**
   * Render appropriate alert based on submission status
   * @returns Alert component or null
   */
  const renderStatusAlert = () => {
    switch (submitStatus) {
      case 'success':
        return (
          <Alert variant="default" className="bg-green-50 border-green-200 mb-4">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Your server has been submitted for approval. You'll be notified when it's reviewed.
            </AlertDescription>
          </Alert>
        );
      case 'error':
        return (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {errorMessage || 'An error occurred while submitting your server.'}
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Submit an MCP Server</CardTitle>
        <CardDescription>
          Submit your MCP server to be listed in the directory. You'll need to sign in with GitHub first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderStatusAlert()}
        
        {!user ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <p className="text-center text-muted-foreground">
              Sign in with GitHub to submit your MCP server
            </p>
            <Button onClick={handleGitHubLogin} className="flex items-center gap-2">
              <GitHubLogoIcon className="h-4 w-4" />
              Sign in with GitHub
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* GitHub Repository Selection */}
            <div className="space-y-2">
              <Label htmlFor="repo-select">Select a GitHub Repository</Label>
              {isLoadingRepos ? (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Loading your repositories...</span>
                </div>
              ) : userRepos.length > 0 ? (
                <div className="space-y-2">
                  <select 
                    id="repo-select"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    onChange={handleRepoChange}
                    defaultValue=""
                  >
                    <option value="">Select a repository</option>
                    {userRepos.map(repo => (
                      <option key={repo.html_url} value={repo.html_url}>
                        {repo.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  No repositories found or unable to access your GitHub repositories.
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Server Name</Label>
                  <Input
                    id="name"
                    {...register('name', { required: 'Server name is required' })}
                    placeholder="e.g., Supabase MCP"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="github_url">GitHub URL</Label>
                  <Input
                    id="github_url"
                    {...register('github_url', { 
                      required: 'GitHub URL is required',
                      pattern: {
                        value: /https:\/\/github\.com\/[^/]+\/[^/]+/,
                        message: 'Must be a valid GitHub repository URL'
                      }
                    })}
                    placeholder="https://github.com/owner/repo"
                  />
                  {errors.github_url && (
                    <p className="text-sm text-red-500">{errors.github_url.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Describe your MCP server and its capabilities"
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      {...register('category')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select a category</option>
                      <option value="ai">AI / Machine Learning</option>
                      <option value="data">Data</option>
                      <option value="auth">Authentication</option>
                      <option value="storage">Storage</option>
                      <option value="search">Search</option>
                      <option value="utilities">Utilities</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="install_method">Installation Method</Label>
                    <select
                      id="install_method"
                      {...register('install_method')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select an installation method</option>
                      <option value="npm">NPM</option>
                      <option value="docker">Docker</option>
                      <option value="binary">Binary</option>
                      <option value="script">Script</option>
                      <option value="extension">Extension</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    {...register('tags')}
                    placeholder="e.g., database, authentication, serverless"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button type="submit" disabled={isSubmitting || submitStatus === 'loading'} className="w-full">
                {submitStatus === 'loading' ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : 'Submit Server for Approval'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
