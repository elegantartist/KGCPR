import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DailySelfScoresPage from '../pages/DailySelfScoresPage';
import { Toaster } from '@/components/ui/toaster';

// Mock fetch API
global.fetch = vi.fn();

describe('DailySelfScoresPage Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should display a success toast after successfully submitting scores', async () => {
    // Arrange
    const mockResponse = {
      ok: true,
      json: async () => ({
        success: true,
        message: "Scores saved successfully",
        data: { dietScore: 8, exerciseScore: 7, medicationScore: 9 },
        newBadges: [],
        proactiveSuggestionSent: false
      })
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

    render(
      <>
        <DailySelfScoresPage />
        <Toaster />
      </>
    );

    // Act
    const submitButton = screen.getByRole('button', { name: /Submit Daily Scores/i });
    fireEvent.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/Scores submitted successfully/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify API was called
    expect(fetch).toHaveBeenCalledWith('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 2,
        dietScore: 5,
        exerciseScore: 5,
        medicationScore: 5,
      }),
    });
  });

  it('should display error toast when submission fails', async () => {
    // Arrange
    const mockResponse = {
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        message: "Server error"
      })
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

    render(
      <>
        <DailySelfScoresPage />
        <Toaster />
      </>
    );

    // Act
    const submitButton = screen.getByRole('button', { name: /Submit Daily Scores/i });
    fireEvent.click(submitButton);

    // Assert - Use more specific selector for the toast title
    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should display conflict toast when already submitted today', async () => {
    // Arrange
    const mockResponse = {
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        message: "You have already submitted scores for today"
      })
    };
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any);

    render(
      <>
        <DailySelfScoresPage />
        <Toaster />
      </>
    );

    // Act
    const submitButton = screen.getByRole('button', { name: /Submit Daily Scores/i });
    fireEvent.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/Already submitted today/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});