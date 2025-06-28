<template>
  <div class="mobile-demo-index">
    <header class="demo-header">
      <h1>📱 AccentShadow Mobile UI Concepts</h1>
      <p>Explore different approaches to mobile pronunciation practice</p>
    </header>

    <div class="concept-grid">
      <!-- Concept A: Vertical Stack -->
      <div class="concept-card">
        <div class="concept-preview">
          <div class="phone-frame">
            <div class="phone-screen concept-a-preview">
              <div class="preview-header">Japanese Basics • 3/25</div>
              <div class="preview-section">Audio Loading Control</div>
              <div class="preview-waveform target"></div>
              <div class="preview-spectrogram target"></div>
              <div class="preview-record-btn"></div>
              <div class="preview-waveform user"></div>
              <div class="preview-spectrogram user"></div>
              <div class="preview-actions"></div>
            </div>
          </div>
        </div>
        <div class="concept-info">
          <h2>Concept A: Vertical Stack</h2>
          <p>Based on your mockup - linear vertical progression through audio components</p>
          <div class="concept-features">
            <span class="feature">📏 Linear Layout</span>
            <span class="feature">🎵 Full Audio Controls</span>
            <span class="feature">📊 Always Visible</span>
          </div>
          <div class="concept-pros-cons">
            <div class="pros">
              <h4>✅ Pros</h4>
              <ul>
                <li>Complete overview at all times</li>
                <li>Follows desktop layout closely</li>
                <li>Easy comparison of target vs user</li>
              </ul>
            </div>
            <div class="cons">
              <h4>⚠️ Cons</h4>
              <ul>
                <li>Requires significant scrolling</li>
                <li>Can feel overwhelming on small screens</li>
                <li>Less touch-optimized</li>
              </ul>
            </div>
          </div>
          <router-link to="/mobile-test-a" class="test-btn">
            📱 Test Concept A
          </router-link>
        </div>
      </div>

      <!-- Concept B: Card-Based -->
      <div class="concept-card">
        <div class="concept-preview">
          <div class="phone-frame">
            <div class="phone-screen concept-b-preview">
              <div class="preview-header gradient">Japanese Basics</div>
              <div class="preview-card target-card">
                <div class="card-title">🎯 Target Audio</div>
                <div class="card-viz"></div>
              </div>
              <div class="preview-card record-card">
                <div class="card-title">🎤 Recording</div>
                <div class="record-circle"></div>
              </div>
              <div class="preview-fab">Save & Next</div>
            </div>
          </div>
        </div>
        <div class="concept-info">
          <h2>Concept B: Card-Based</h2>
          <p>Modern card interface with floating actions and progressive disclosure</p>
          <div class="concept-features">
            <span class="feature">🎨 Modern Design</span>
            <span class="feature">📋 Card Interface</span>
            <span class="feature">🎯 Focused Sections</span>
          </div>
          <div class="concept-pros-cons">
            <div class="pros">
              <h4>✅ Pros</h4>
              <ul>
                <li>Beautiful, modern interface</li>
                <li>Sectioned content is digestible</li>
                <li>Great visual hierarchy</li>
              </ul>
            </div>
            <div class="cons">
              <h4>⚠️ Cons</h4>
              <ul>
                <li>Still requires some scrolling</li>
                <li>More complex interaction patterns</li>
                <li>May hide some functionality</li>
              </ul>
            </div>
          </div>
          <router-link to="/mobile-test-b" class="test-btn">
            📱 Test Concept B
          </router-link>
        </div>
      </div>

      <!-- Concept C: Tab-Based -->
      <div class="concept-card">
        <div class="concept-preview">
          <div class="phone-frame">
            <div class="phone-screen concept-c-preview">
              <div class="preview-tabs">
                <div class="tab active">📁</div>
                <div class="tab">👂</div>
                <div class="tab">🎤</div>
                <div class="tab">📊</div>
              </div>
              <div class="preview-content">
                <div class="content-header">Listen & Analyze</div>
                <div class="large-play-btn"></div>
                <div class="progress-bar-demo"></div>
                <div class="speed-controls-demo"></div>
              </div>
              <div class="continue-btn-demo">Ready to Record →</div>
            </div>
          </div>
        </div>
        <div class="concept-info">
          <h2>Concept C: Tab-Based Focus</h2>
          <p>Guided workflow with tabs for each stage of the pronunciation practice</p>
          <div class="concept-features">
            <span class="feature">🎯 Focused Workflow</span>
            <span class="feature">📑 Tab Navigation</span>
            <span class="feature">🚀 Guided Process</span>
          </div>
          <div class="concept-pros-cons">
            <div class="pros">
              <h4>✅ Pros</h4>
              <ul>
                <li>No scrolling within screens</li>
                <li>Clear progression through steps</li>
                <li>Optimized for one-handed use</li>
              </ul>
            </div>
            <div class="cons">
              <h4>⚠️ Cons</h4>
              <ul>
                <li>Context switching between tabs</li>
                <li>Can't see multiple sections at once</li>
                <li>More taps to navigate</li>
              </ul>
            </div>
          </div>
          <router-link to="/mobile-test-c" class="test-btn">
            📱 Test Concept C
          </router-link>
        </div>
      </div>

      <!-- Concept D: Adaptive Smart Interface -->
      <div class="concept-card featured">
        <div class="concept-preview">
          <div class="phone-frame">
            <div class="phone-screen concept-d-preview">
              <div class="adaptive-header">
                <div class="header-info">Japanese Basics</div>
                <div class="mode-indicator">Practice Mode</div>
              </div>
              <div class="smart-content">
                <div class="target-section">
                  <div class="section-header">🎯 Target Audio</div>
                  <div class="quick-controls-demo"></div>
                </div>
                <div class="record-ring">
                  <div class="inner-ring"></div>
                </div>
                <div class="smart-footer">Continue →</div>
              </div>
            </div>
          </div>
        </div>
        <div class="concept-info">
          <h2>⭐ Concept D: Adaptive Smart Interface</h2>
          <p><strong>Recommended:</strong> Intelligent UI that adapts to user context and combines the best of all approaches</p>
          <div class="concept-features">
            <span class="feature featured">🧠 Context-Aware</span>
            <span class="feature featured">🎯 Mode-Based UI</span>
            <span class="feature featured">⚡ Smart Transitions</span>
          </div>
          <div class="concept-pros-cons">
            <div class="pros">
              <h4>✅ Pros</h4>
              <ul>
                <li>Adapts interface to current task</li>
                <li>Combines benefits of all concepts</li>
                <li>Intelligent progressive disclosure</li>
                <li>Optimal for different user types</li>
              </ul>
            </div>
            <div class="cons">
              <h4>⚠️ Cons</h4>
              <ul>
                <li>More complex to implement</li>
                <li>Requires user behavior learning</li>
                <li>May need onboarding tutorial</li>
              </ul>
            </div>
          </div>
          <router-link to="/mobile-test-d" class="test-btn featured">
            ⭐ Test Concept D (Recommended)
          </router-link>
        </div>
      </div>
    </div>

    <!-- Comparison Matrix -->
    <section class="comparison-section">
      <h2>Feature Comparison</h2>
      <div class="comparison-table">
        <div class="comparison-header">
          <div class="feature-name">Feature</div>
          <div class="concept-name">Concept A</div>
          <div class="concept-name">Concept B</div>
          <div class="concept-name">Concept C</div>
        </div>
        
        <div class="comparison-row">
          <div class="feature-name">Learning Curve</div>
          <div class="rating easy">Easy</div>
          <div class="rating medium">Medium</div>
          <div class="rating easy">Easy</div>
        </div>
        
        <div class="comparison-row">
          <div class="feature-name">Mobile Optimization</div>
          <div class="rating medium">Medium</div>
          <div class="rating good">Good</div>
          <div class="rating excellent">Excellent</div>
        </div>
        
        <div class="comparison-row">
          <div class="feature-name">Information Density</div>
          <div class="rating excellent">High</div>
          <div class="rating good">Medium</div>
          <div class="rating medium">Low</div>
        </div>
        
        <div class="comparison-row">
          <div class="feature-name">Touch Friendliness</div>
          <div class="rating medium">Medium</div>
          <div class="rating good">Good</div>
          <div class="rating excellent">Excellent</div>
        </div>
        
        <div class="comparison-row">
          <div class="feature-name">Visual Appeal</div>
          <div class="rating medium">Clean</div>
          <div class="rating excellent">Modern</div>
          <div class="rating good">Polished</div>
        </div>
        
        <div class="comparison-row">
          <div class="feature-name">Context Switching</div>
          <div class="rating excellent">None</div>
          <div class="rating good">Minimal</div>
          <div class="rating medium">Some</div>
        </div>
      </div>
    </section>

    <!-- Design Insights -->
    <section class="insights-section">
      <h2>Design Insights & Recommendations</h2>
      
      <div class="insight-cards">
        <div class="insight-card">
          <h3>🎯 Target Users</h3>
          <p><strong>Concept A</strong> works best for power users who want to see everything at once and don't mind scrolling.</p>
          <p><strong>Concept B</strong> appeals to users who appreciate modern design and sectioned content.</p>
          <p><strong>Concept C</strong> is ideal for beginners and users who prefer guided, step-by-step workflows.</p>
        </div>
        
        <div class="insight-card">
          <h3>📱 Mobile Usage Patterns</h3>
          <p>Based on mobile UX research:</p>
          <ul>
            <li>Users prefer <strong>minimal scrolling</strong> (favors Concept C)</li>
            <li>Touch targets should be <strong>44px+</strong> (all concepts address this)</li>
            <li>Most interactions happen in <strong>thumb zones</strong> (Concept C optimized)</li>
            <li>Users expect <strong>familiar patterns</strong> (tabs, cards are well-known)</li>
          </ul>
        </div>
        
        <div class="insight-card">
          <h3>🔄 Workflow Efficiency</h3>
          <p><strong>Linear workflow (A)</strong>: Best for advanced users, complete control</p>
          <p><strong>Sectioned workflow (B)</strong>: Good balance of control and organization</p>
          <p><strong>Guided workflow (C)</strong>: Best for beginners, ensures proper progression</p>
        </div>
        
        <div class="insight-card">
          <h3>🚀 Implementation Strategy</h3>
          <p>Recommended approach:</p>
          <ol>
            <li><strong>Start with Concept C</strong> as the primary mobile interface</li>
            <li>Add <strong>Concept B elements</strong> for visual polish and card interactions</li>
            <li>Provide <strong>Concept A</strong> as an "Advanced View" toggle for power users</li>
            <li>A/B test with real users to validate assumptions</li>
          </ol>
        </div>
      </div>
    </section>

    <!-- Next Steps -->
    <section class="next-steps-section">
      <h2>Next Steps</h2>
      <div class="steps-grid">
        <div class="step-card">
          <h3>1. User Testing</h3>
          <p>Test all three concepts with target users to gather feedback on usability and preferences</p>
        </div>
        <div class="step-card">
          <h3>2. Technical Integration</h3>
          <p>Integrate chosen concept(s) with existing backend logic and WaveSurfer components</p>
        </div>
        <div class="step-card">
          <h3>3. Performance Optimization</h3>
          <p>Optimize for mobile performance, battery usage, and network efficiency</p>
        </div>
        <div class="step-card">
          <h3>4. Progressive Enhancement</h3>
          <p>Ensure core functionality works without JavaScript and enhanced features load progressively</p>
        </div>
      </div>
    </section>

    <footer class="demo-footer">
      <p>🎨 Created as part of EchoLingo mobile design exploration</p>
      <p>📋 See <code>MOBILE_DESIGN_DOCUMENT.md</code> for complete design specifications</p>
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  console.log('Mobile Demo Index loaded')
})
</script>

<style scoped>
.mobile-demo-index {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1f2937;
}

.demo-header {
  text-align: center;
  padding: 60px 20px;
  color: white;
}

.demo-header h1 {
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 16px 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.demo-header p {
  font-size: 18px;
  opacity: 0.9;
  margin: 0;
}

.concept-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 30px;
  padding: 0 20px 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.concept-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.concept-card:hover {
  transform: translateY(-5px);
}

.concept-preview {
  padding: 30px;
  background: #f8fafc;
  display: flex;
  justify-content: center;
}

.phone-frame {
  width: 200px;
  height: 400px;
  background: #1f2937;
  border-radius: 25px;
  padding: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.phone-screen {
  width: 100%;
  height: 100%;
  background: #f8fafc;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
}

/* Concept A Preview */
.concept-a-preview {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 6px;
}

.preview-header {
  height: 20px;
  background: #3b82f6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: white;
  font-weight: 600;
}

.preview-section {
  height: 16px;
  background: #e5e7eb;
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  font-size: 6px;
  color: #6b7280;
  font-weight: 500;
}

.preview-waveform {
  height: 24px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.preview-waveform.target {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.preview-waveform.user {
  background: linear-gradient(90deg, #10b981, #047857);
}

.preview-spectrogram {
  height: 30px;
  border-radius: 4px;
  margin-bottom: 4px;
}

.preview-spectrogram.target {
  background: linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899);
}

.preview-spectrogram.user {
  background: linear-gradient(45deg, #10b981, #06b6d4, #8b5cf6);
}

.preview-record-btn {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  border-radius: 50%;
  margin: 8px auto;
}

.preview-actions {
  height: 20px;
  background: #10b981;
  border-radius: 4px;
  margin-top: auto;
}

/* Concept B Preview */
.concept-b-preview {
  padding: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.preview-header.gradient {
  background: rgba(255, 255, 255, 0.9);
  color: #1f2937;
  backdrop-filter: blur(10px);
}

.preview-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 12px;
  margin: 8px 0;
  backdrop-filter: blur(20px);
}

.card-title {
  font-size: 8px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.card-viz {
  height: 24px;
  background: #f3f4f6;
  border-radius: 6px;
}

.record-card {
  text-align: center;
}

.record-circle {
  width: 30px;
  height: 30px;
  background: #3b82f6;
  border-radius: 50%;
  margin: 6px auto;
}

.preview-fab {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  height: 24px;
  background: #10b981;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7px;
  color: white;
  font-weight: 600;
}

/* Concept C Preview */
.concept-c-preview {
  display: flex;
  flex-direction: column;
}

.preview-tabs {
  display: flex;
  background: white;
  height: 40px;
  border-bottom: 1px solid #e5e7eb;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: #f9fafb;
}

.tab.active {
  background: white;
  border-bottom: 2px solid #3b82f6;
}

.preview-content {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.content-header {
  font-size: 9px;
  font-weight: 600;
  color: #374151;
  text-align: center;
}

.large-play-btn {
  width: 50px;
  height: 50px;
  background: #3b82f6;
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.progress-bar-demo {
  width: 80%;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
}

.speed-controls-demo {
  display: flex;
  gap: 4px;
}

.speed-controls-demo::before,
.speed-controls-demo::after {
  content: '';
  width: 20px;
  height: 12px;
  background: #f3f4f6;
  border-radius: 4px;
}

.continue-btn-demo {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  height: 24px;
  background: #10b981;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7px;
  color: white;
  font-weight: 600;
}

.concept-info {
  padding: 30px;
}

.concept-info h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.concept-info p {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 20px 0;
  line-height: 1.6;
}

.concept-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.feature {
  padding: 6px 12px;
  background: #f3f4f6;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.concept-pros-cons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.pros, .cons {
  padding: 16px;
  border-radius: 12px;
}

.pros {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.cons {
  background: #fef3c7;
  border: 1px solid #fed7aa;
}

.pros h4, .cons h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.pros h4 {
  color: #166534;
}

.cons h4 {
  color: #92400e;
}

.pros ul, .cons ul {
  margin: 0;
  padding-left: 16px;
  font-size: 13px;
  line-height: 1.5;
}

.pros li {
  color: #166534;
  margin-bottom: 4px;
}

.cons li {
  color: #92400e;
  margin-bottom: 4px;
}

.test-btn {
  display: block;
  text-align: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.test-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
}

/* Comparison Section */
.comparison-section, .insights-section, .next-steps-section {
  background: white;
  margin: 40px 20px;
  border-radius: 20px;
  padding: 40px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.comparison-section h2, .insights-section h2, .next-steps-section h2 {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 24px 0;
  text-align: center;
}

.comparison-table {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 2px;
  background: #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.comparison-header {
  display: contents;
}

.comparison-header > div {
  background: #374151;
  color: white;
  padding: 16px;
  font-weight: 600;
  text-align: center;
}

.comparison-row {
  display: contents;
}

.comparison-row > div {
  background: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
}

.feature-name {
  font-weight: 500;
  color: #374151;
}

.concept-name {
  justify-content: center;
  font-weight: 600;
  color: #1f2937;
}

.rating {
  justify-content: center;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 14px;
}

.rating.easy {
  background: #dcfce7;
  color: #166534;
}

.rating.medium {
  background: #fef3c7;
  color: #92400e;
}

.rating.good {
  background: #dbeafe;
  color: #1d4ed8;
}

.rating.excellent {
  background: #f0fdf4;
  color: #166534;
}

/* Insights Section */
.insight-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.insight-card {
  padding: 24px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
}

.insight-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.insight-card p {
  color: #374151;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.insight-card ul, .insight-card ol {
  color: #374151;
  line-height: 1.6;
  margin: 0;
  padding-left: 20px;
}

.insight-card li {
  margin-bottom: 8px;
}

.insight-card strong {
  color: #1f2937;
  font-weight: 600;
}

/* Next Steps */
.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.step-card {
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  text-align: center;
}

.step-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.step-card p {
  color: #374151;
  line-height: 1.6;
  margin: 0;
  font-size: 14px;
}

.demo-footer {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.8);
}

.demo-footer p {
  margin: 0 0 8px 0;
  font-size: 14px;
}

.demo-footer code {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', monospace;
}

/* Responsive */
@media (max-width: 768px) {
  .concept-grid {
    grid-template-columns: 1fr;
    padding: 0 15px 30px;
  }
  
  .concept-pros-cons {
    grid-template-columns: 1fr;
  }
  
  .comparison-table {
    grid-template-columns: 1fr;
    gap: 1px;
  }
  
  .comparison-header {
    display: none;
  }
  
  .comparison-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 1px;
    margin-bottom: 8px;
  }
  
  .concept-name {
    display: none;
  }
}

@media (max-width: 480px) {
  .demo-header h1 {
    font-size: 24px;
  }
  
  .demo-header p {
    font-size: 16px;
  }
  
  .concept-preview {
    padding: 20px;
  }
  
  .phone-frame {
    width: 160px;
    height: 320px;
  }
}
</style>