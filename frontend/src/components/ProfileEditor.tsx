"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/contexts/AuthProvider';

interface ProfileEditorProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

/**
 * ProfileEditor - A reusable component for editing user profile information
 * 
 * Allows editing display name, avatar (via URL or file upload), and 2FA toggle
 */
export function ProfileEditor({ onSuccess, onError, className = '' }: ProfileEditorProps) {
  // Get user profile, session and updateProfile function from auth context
  const { user, profile, session, updateProfile } = useAuth();
  
  // Form state
  const [displayName, setDisplayName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean>(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{
    displayName?: string;
    avatarUrl?: string;
    general?: string;
  }>({});

  // Initialize form with current profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setTwoFaEnabled(profile.two_fa_enabled || false);
    }
  }, [profile]);

  /**
   * Validates the form input fields
   * @returns True if valid, false otherwise
   */
  const validateForm = (): boolean => {
    const errors: {
      displayName?: string;
      avatarUrl?: string;
      general?: string;
    } = {};
    
    // Validate display name (optional but if provided, must be at least 2 characters)
    if (displayName && displayName.length < 2) {
      errors.displayName = 'Display name must be at least 2 characters';
    }
    
    // Validate avatar URL (if provided, must be a valid URL)
    if (avatarUrl && !isValidUrl(avatarUrl)) {
      errors.avatarUrl = 'Please enter a valid URL';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Checks if a string is a valid URL
   * @param url The URL to validate
   * @returns True if valid URL, false otherwise
   */
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  /**
   * Handles file selection for avatar upload
   * @param e The change event
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setFormErrors({
          ...formErrors,
          avatarUrl: 'Please upload an image file'
        });
        return;
      }
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setFormErrors({
          ...formErrors,
          avatarUrl: 'Image must be less than 2MB'
        });
        return;
      }
      
      setAvatarFile(file);
      // Clear the URL field since we're using a file now
      setAvatarUrl('');
      // Clear any previous errors
      setFormErrors({
        ...formErrors,
        avatarUrl: undefined
      });
    }
  };

  /**
   * Uploads avatar file to Supabase storage
   * @param file The avatar file to upload
   * @returns The public URL of the uploaded file
   */
  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('User must be logged in to upload avatar');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    const { error: uploadError, data } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      });
    
    if (uploadError) {
      throw new Error(`Error uploading avatar: ${uploadError.message}`);
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    return publicUrl;
  };

  /**
   * Updates profile using the edge function
   * @param profileData The profile data to update
   */
  const updateProfileViaEdgeFunction = async (profileData: Partial<Profile>) => {
    if (!user || !session) {
      throw new Error('User must be logged in to update profile');
    }
    
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auth-update-profile`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(profileData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update profile');
    }

    return await response.json();
  };

  /**
   * Handles form submission to update the profile
   * @param e The form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      
      // If we have a file, upload it
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar(avatarFile);
      }
      
      // Prepare profile data
      const profileData = {
        display_name: displayName,
        avatar_url: finalAvatarUrl,
        two_fa_enabled: twoFaEnabled
      };
      
      // Update profile using our edge function
      const result = await updateProfileViaEdgeFunction(profileData);
      
      // Also update local state via our context
      await updateProfile(profileData);
      
      // Clear file selection
      setAvatarFile(null);
      
      // Call success callback
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error updating profile:', error);
      setFormErrors({
        ...formErrors,
        general: error instanceof Error ? error.message : 'An unknown error occurred'
      });
      
      // Call error callback
      if (onError && error instanceof Error) onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if there's no user
  if (!user) {
    return null;
  }

  return (
    <div className={`profile-editor ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter your display name"
            />
            {formErrors.displayName && (
              <p className="mt-1 text-sm text-red-600">
                {formErrors.displayName}
              </p>
            )}
          </div>

          {/* Avatar URL */}
          <div>
            <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700">
              Avatar URL
            </label>
            <input
              id="avatarUrl"
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              disabled={!!avatarFile}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="https://example.com/avatar.jpg"
            />
            {formErrors.avatarUrl && (
              <p className="mt-1 text-sm text-red-600">
                {formErrors.avatarUrl}
              </p>
            )}
          </div>

          {/* Avatar File Upload */}
          <div>
            <label htmlFor="avatarFile" className="block text-sm font-medium text-gray-700">
              Or Upload an Avatar Image
            </label>
            <input
              id="avatarFile"
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {avatarFile && (
              <div className="mt-2 flex items-center">
                <span className="text-sm text-gray-500">Selected file: {avatarFile.name}</span>
                <button
                  type="button"
                  onClick={() => setAvatarFile(null)}
                  className="ml-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Preview Avatar */}
          {(avatarUrl || avatarFile) && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Avatar Preview:</p>
              <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100">
                {avatarFile ? (
                  <img
                    src={URL.createObjectURL(avatarFile)}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error';
                      setFormErrors({
                        ...formErrors,
                        avatarUrl: 'Could not load image from URL'
                      });
                    }}
                  />
                ) : null}
              </div>
            </div>
          )}

          {/* 2FA Toggle */}
          <div className="flex items-center">
            <input
              id="twoFaEnabled"
              type="checkbox"
              checked={twoFaEnabled}
              onChange={(e) => setTwoFaEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="twoFaEnabled" className="ml-2 block text-sm text-gray-700">
              Enable Two-Factor Authentication
            </label>
          </div>
        </div>

        {/* General error message */}
        {formErrors.general && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{formErrors.general}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className={`
              inline-flex justify-center rounded-md border border-transparent 
              bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm 
              hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
              focus:ring-offset-2 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}
            `}
          >
            {isLoading ? 'Updating...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfileEditor;
