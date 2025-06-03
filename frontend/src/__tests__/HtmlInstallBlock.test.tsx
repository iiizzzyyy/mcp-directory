import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HtmlInstallBlock from '../components/server-detail/HtmlInstallBlock';

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});

describe('HtmlInstallBlock Component', () => {
  // Sample HTML content for testing
  const sampleHtmlContent = `
    <h1>Installation Instructions</h1>
    <p>Follow these steps to install the MCP server:</p>
    <ol>
      <li>Install dependencies: <code>npm install</code></li>
      <li>Configure settings: <code>npm run config</code></li>
      <li>Start the server: <code>npm start</code></li>
    </ol>
  `;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders HTML content correctly', () => {
    render(
      <HtmlInstallBlock
        platform="All Platforms"
        htmlContent={sampleHtmlContent}
      />
    );

    // Check if the platform name is displayed
    expect(screen.getByText('All Platforms')).toBeInTheDocument();
    
    // Check if HTML content is rendered (using a unique string from the sample)
    expect(screen.getByText('Follow these steps to install the MCP server:')).toBeInTheDocument();
    
    // Check if list items are rendered
    expect(screen.getByText(/Install dependencies:/)).toBeInTheDocument();
    expect(screen.getByText(/Configure settings:/)).toBeInTheDocument();
    expect(screen.getByText(/Start the server:/)).toBeInTheDocument();
  });

  test('copies text content to clipboard when copy button is clicked', async () => {
    render(
      <HtmlInstallBlock
        platform="All Platforms"
        htmlContent={sampleHtmlContent}
      />
    );

    // Find and click the copy button (using aria-label)
    const copyButton = screen.getByRole('button', { name: /copy to clipboard/i });
    fireEvent.click(copyButton);

    // Verify the clipboard API was called
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    
    // Check that "Copied to clipboard" message appears
    expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
  });

  test('strips HTML tags when copying to clipboard', async () => {
    render(
      <HtmlInstallBlock
        platform="All Platforms"
        htmlContent="<p>Plain <strong>text</strong> content</p>"
      />
    );

    // Find and click the copy button
    const copyButton = screen.getByRole('button', { name: /copy to clipboard/i });
    fireEvent.click(copyButton);

    // Verify that HTML tags are stripped
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Plain text content"));
  });

  test('displays icon when provided', () => {
    render(
      <HtmlInstallBlock
        platform="All Platforms"
        icon="https://example.com/icon.svg"
        htmlContent={sampleHtmlContent}
      />
    );

    // Check if the icon is rendered
    const icon = screen.getByAltText('All Platforms icon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', 'https://example.com/icon.svg');
  });
});
