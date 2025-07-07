import { marked } from 'marked';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    // Basic syntax highlighting - could be enhanced with highlight.js
    return `<pre><code class="language-${lang || 'text'}">${code}</code></pre>`;
  },
  breaks: true,
  gfm: true
});

function buildAudioProcessingGuide() {
  console.log('🔧 Building Audio Processing Guide...');
  
  try {
    // Read the markdown file
    const markdownPath = join(__dirname, '../AUDIO_PROCESSING_GUIDE.md');
    const markdownContent = readFileSync(markdownPath, 'utf8');
    
    // Parse markdown to HTML
    const htmlContent = marked(markdownContent);
    
    // Create HTML template with styling that matches the app
    const fullHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Processing Guide - AccentShadow</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem 1rem;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }
        
        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 2rem;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .back-link {
            display: inline-block;
            margin-bottom: 1rem;
            padding: 0.5rem 1rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: background 0.2s;
        }
        
        .back-link:hover {
            background: #5a6fd8;
        }
        
        h1 {
            color: #2d3748;
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        h2 {
            color: #4a5568;
            font-size: 1.8rem;
            margin: 2rem 0 1rem 0;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #e2e8f0;
        }
        
        h3 {
            color: #2d3748;
            font-size: 1.4rem;
            margin: 1.5rem 0 0.75rem 0;
        }
        
        h4 {
            color: #4a5568;
            font-size: 1.2rem;
            margin: 1rem 0 0.5rem 0;
        }
        
        p {
            margin-bottom: 1rem;
            color: #4a5568;
        }
        
        ul, ol {
            margin: 1rem 0;
            padding-left: 2rem;
        }
        
        li {
            margin-bottom: 0.5rem;
            color: #4a5568;
        }
        
        code {
            background: #f7fafc;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
            font-size: 0.9em;
            color: #e53e3e;
        }
        
        pre {
            background: #1a202c;
            color: #e2e8f0;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1rem 0;
            font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        }
        
        pre code {
            background: none;
            padding: 0;
            color: inherit;
        }
        
        blockquote {
            border-left: 4px solid #667eea;
            padding-left: 1rem;
            margin: 1rem 0;
            font-style: italic;
            color: #4a5568;
        }
        
        .emoji-heading {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .tech-specs {
            background: #f7fafc;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1rem 0;
            border-left: 4px solid #38b2ac;
        }
        
        .benefits-list {
            background: #f0fff4;
            padding: 1rem;
            border-radius: 8px;
            border-left: 4px solid #38a169;
        }
        
        .warning-box {
            background: #fffaf0;
            padding: 1rem;
            border-radius: 8px;
            border-left: 4px solid #ed8936;
            margin: 1rem 0;
        }
        
        /* Make checkmarks green */
        li:contains("✅") {
            color: #38a169;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
            body {
                padding: 1rem 0.5rem;
            }
            
            .container {
                padding: 1.5rem;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            h2 {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="/" class="back-link">← Back to AccentShadow</a>
        </div>
        ${htmlContent}
    </div>
</body>
</html>`;
    
    // Ensure dist directory exists
    const distDir = join(__dirname, '../dist');
    mkdirSync(distDir, { recursive: true });
    
    // Write the HTML file
    const outputPath = join(distDir, 'audio-processing-guide.html');
    writeFileSync(outputPath, fullHtmlContent);
    
    console.log('✅ Audio Processing Guide built successfully');
    console.log(`📄 Output: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error building Audio Processing Guide:', error);
    process.exit(1);
  }
}

// Run the build
buildAudioProcessingGuide();