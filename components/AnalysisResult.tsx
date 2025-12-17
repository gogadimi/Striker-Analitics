import React, { useState } from 'react';
import { AnalysisResponse } from '../types';

interface AnalysisResultProps {
  data: AnalysisResponse;
  videoUrl?: string;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ data }) => {
  const [language, setLanguage] = useState<'en' | 'mk' | 'es'>('en');
  
  // Safe destructuring with defaults since data might be partial if status is error (though App.tsx guards this)
  const { 
    form_score = 0, 
    score_label = "N/A", 
    action_detected = "Unknown", 
    key_strengths = [], 
    areas_for_improvement = [], 
    technical_data, 
    coaching_tips = { en: "", mk: "", es: "" }
  } = data;

  // Dynamic Score Color for UI
  const getScoreColor = (s: number) => {
    if (s >= 8) return 'text-emerald-400 border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.3)]';
    if (s >= 5) return 'text-yellow-400 border-yellow-500/50 shadow-[0_0_20px_rgba(250,204,21,0.3)]';
    return 'text-red-400 border-red-500/50 shadow-[0_0_20px_rgba(248,113,113,0.3)]';
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to export the PDF.");
      return;
    }

    // Determine Critical Status Colors for PDF
    const getPdfScoreColor = (s: number) => {
      if (s >= 8) return '#10b981'; // Emerald
      if (s >= 5) return '#f59e0b'; // Amber
      return '#ef4444'; // Red
    };
    const pdfScoreColor = getPdfScoreColor(form_score);

    const drillsHtml = areas_for_improvement.map(item => {
      const isCritical = item.issue.toLowerCase().includes('critical');
      const issueDisplay = isCritical 
        ? `<span style="color: #dc2626; font-weight: 800;">CRITICAL:</span> ${item.issue.replace(/critical[:\s]*/i, '')}` 
        : item.issue;

      return `
        <div class="drill-card" style="${isCritical ? 'border-left-color: #dc2626;' : ''}">
          <div class="drill-header">
            <span class="issue">${issueDisplay}</span>
          </div>
          <div class="drill-name">Drill: ${item.drill}</div>
          <ol class="drill-steps">
            ${item.instructions.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>
      `;
    }).join('');

    const strengthsHtml = key_strengths.map(s => `<li>${s}</li>`).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>FootAI Analysis Report</title>
          <style>
            @page { margin: 1.5cm; }
            body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.5; max-width: 800px; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header { border-bottom: 3px solid #111827; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .brand { font-size: 28px; font-weight: 900; color: #111827; letter-spacing: -0.5px; }
            .brand span { color: #059669; }
            .meta { text-align: right; font-size: 13px; color: #6b7280; font-family: monospace; }
            .score-container { display: flex; align-items: center; justify-content: space-between; margin-bottom: 35px; background: #111827; color: white; padding: 25px; border-radius: 12px; }
            .score-val-container { display: flex; flex-direction: column; }
            .score-label-top { font-size: 12px; text-transform: uppercase; color: #9ca3af; font-weight: 700; letter-spacing: 1px; margin-bottom: 5px; }
            .score-val { font-size: 56px; font-weight: 900; line-height: 1; letter-spacing: -2px; color: ${pdfScoreColor}; }
            .score-badge { background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 16px; border: 1px solid rgba(255,255,255,0.2); }
            .section { margin-bottom: 40px; }
            .section-title { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 20px; display: flex; align-items: center; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .tech-table { w-full; border-collapse: collapse; font-size: 14px; width: 100%; }
            .tech-table td { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
            .tech-table .label { color: #4b5563; font-weight: 500; }
            .tech-table .val { text-align: right; font-weight: 700; font-family: monospace; font-size: 15px; }
            .tech-table .target { display: block; font-size: 11px; color: #9ca3af; font-weight: 400; text-align: right; }
            .tech-table .status-badge { display: inline-block; font-size: 10px; padding: 2px 6px; border-radius: 99px; background: #e5e7eb; color: #374151; margin-top: 2px; }
            ul.strengths { margin: 0; padding-left: 20px; }
            ul.strengths li { margin-bottom: 10px; color: #374151; font-size: 14px; font-weight: 500; }
            .drill-card { margin-bottom: 25px; background: #fff; border: 1px solid #e5e7eb; border-left: 5px solid #059669; border-radius: 6px; padding: 20px; page-break-inside: avoid; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
            .issue { font-weight: 800; color: #111827; font-size: 15px; }
            .drill-name { font-size: 13px; font-weight: 700; color: #059669; text-transform: uppercase; margin: 12px 0 8px 0; letter-spacing: 0.05em; display: flex; align-items: center; }
            .drill-steps { margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563; }
            .quote-box { background: #f9fafb; padding: 25px; border-radius: 8px; border-left: 4px solid #3b82f6; font-style: italic; color: #374151; line-height: 1.6; font-size: 15px; }
            .footer { text-align: center; margin-top: 60px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; text-transform: uppercase; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">FootAI <span>Coach</span></div>
            <div class="meta">
              Report Date: ${new Date().toLocaleDateString()}<br>
              Action Detected: <strong>${action_detected}</strong>
            </div>
          </div>

          <div class="score-container">
            <div class="score-val-container">
              <span class="score-label-top">Technique Score</span>
              <span class="score-val">${form_score}/10</span>
            </div>
            <div class="score-badge">${score_label}</div>
          </div>

          <div class="section">
            <div class="section-title">Coaching Analysis (${language.toUpperCase()})</div>
            <div class="quote-box">
              "${coaching_tips[language]}"
            </div>
          </div>

          <div class="grid">
            <div class="section">
              <div class="section-title">Technical Biometrics</div>
              ${technical_data ? `
              <table class="tech-table">
                <tr>
                  <td class="label">Torso Angle</td>
                  <td>
                    <div class="val">${technical_data.torso_angle.value}°</div>
                    <span class="status-badge">${technical_data.torso_angle.status}</span>
                    <span class="target">Target: ${technical_data.torso_angle.target}°</span>
                  </td>
                </tr>
                <tr>
                  <td class="label">Plant Foot Offset</td>
                  <td>
                    <div class="val">${technical_data.plant_foot_offset.value} cm</div>
                    <span class="status-badge">${technical_data.plant_foot_offset.status}</span>
                    <span class="target">Target: ${technical_data.plant_foot_offset.target} cm</span>
                  </td>
                </tr>
              </table>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">Key Strengths</div>
              <ul class="strengths">
                ${strengthsHtml}
              </ul>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Corrective Drills & Action Plan</div>
            ${drillsHtml}
          </div>

          <div class="footer">
            Generated by FootAI Coach • AI-Powered Biomechanics Analysis
          </div>

          <script>
            window.onload = function() { 
              setTimeout(function() { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Header Card */}
      <div className="bg-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl border border-gray-700 relative overflow-hidden mb-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1 text-center md:text-left">
            <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">Detected Action</div>
            <h2 className="text-3xl font-bold text-white mb-2">{action_detected}</h2>
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
               form_score >= 5 ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-red-900/30 text-red-300 border-red-800'
            }`}>
              {score_label}
            </div>
          </div>

          <div className={`relative w-32 h-32 flex items-center justify-center rounded-full border-4 bg-gray-900 ${getScoreColor(form_score)}`}>
            <div className="text-center">
              <span className="block text-4xl font-extrabold">{form_score}</span>
              <span className="text-xs opacity-70 uppercase font-medium">Score</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Coaching Feedback Card */}
        <div className="md:col-span-2 bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-700 shadow-lg">
          <div className="flex flex-wrap items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <svg className="w-6 h-6 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              AI Coach Feedback
            </h3>
            
            <div className="flex space-x-1 bg-gray-900 rounded-lg p-1 border border-gray-700">
               {(['en', 'mk', 'es'] as const).map((lang) => (
                 <button
                   key={lang}
                   onClick={() => setLanguage(lang)}
                   className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                     language === lang 
                       ? 'bg-emerald-600 text-white shadow-md' 
                       : 'text-gray-400 hover:text-white hover:bg-gray-700'
                   }`}
                 >
                   {lang === 'en' ? 'ENG' : lang === 'mk' ? 'MKD' : 'ESP'}
                 </button>
               ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700/50">
            <p className="text-lg text-gray-200 leading-relaxed italic">
              "{coaching_tips[language]}"
            </p>
          </div>
        </div>

        {/* Technical Data Card */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-lg flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Technical Data
          </h3>
          
          <div className="space-y-4 flex-1">
            {technical_data && (
              <>
                <div className="bg-gray-900/50 p-4 rounded-lg flex justify-between items-center border border-gray-700">
                  <span className="text-gray-400 text-sm">Torso Angle</span>
                  <div className="text-right">
                    <span className={`block font-mono font-bold ${Math.abs(technical_data.torso_angle.value - technical_data.torso_angle.target) > 10 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {technical_data.torso_angle.value}°
                    </span>
                    <span className="text-[10px] text-gray-400 block">{technical_data.torso_angle.status}</span>
                    <span className="text-[10px] text-gray-500 uppercase">Target: {technical_data.torso_angle.target}°</span>
                  </div>
                </div>

                <div className="bg-gray-900/50 p-4 rounded-lg flex justify-between items-center border border-gray-700">
                  <span className="text-gray-400 text-sm">Plant Foot Offset</span>
                  <div className="text-right">
                    <span className={`block font-mono font-bold ${Math.abs(technical_data.plant_foot_offset.value - technical_data.plant_foot_offset.target) > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {technical_data.plant_foot_offset.value} cm
                    </span>
                    <span className="text-[10px] text-gray-400 block">{technical_data.plant_foot_offset.status}</span>
                    <span className="text-[10px] text-gray-500 uppercase">Target: {technical_data.plant_foot_offset.target} cm</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Strengths & Improvements Card */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">Key Observations</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3 border-b border-gray-700 pb-1">Strengths</h4>
              <ul className="space-y-2">
                {key_strengths.map((item, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-300">
                    <svg className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-4 border-b border-gray-700 pb-1">Corrective Drills & Improvements</h4>
              <div className="space-y-4">
                {areas_for_improvement.map((item, idx) => (
                  <div key={idx} className="bg-gray-900/40 rounded-lg p-4 border border-gray-700/50">
                    <div className="flex items-start mb-2">
                        <svg className="w-5 h-5 text-orange-500 mr-2 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                             <span className="font-semibold text-gray-200 block text-sm">
                                {item.issue.toLowerCase().startsWith('critical:') ? (
                                    <>
                                    <span className="text-red-400 font-bold mr-1">CRITICAL:</span>
                                    {item.issue.substring(9).trim()}
                                    </>
                                ) : (
                                    item.issue
                                )}
                             </span>
                             <span className="text-xs text-emerald-400 font-mono uppercase tracking-wide mt-1 block">
                                Drill: {item.drill}
                             </span>
                        </div>
                    </div>
                    <ul className="ml-7 space-y-1 mt-2 border-l-2 border-gray-700 pl-3">
                        {item.instructions.map((step, sIdx) => (
                            <li key={sIdx} className="text-sm text-gray-400 leading-snug">
                                {sIdx + 1}. {step}
                            </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-8 text-center">
        <button
          onClick={handleExportPDF}
          className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm font-bold text-gray-300 hover:text-white transition-all shadow-lg hover:shadow-xl group"
        >
          <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export Full Report (PDF)</span>
        </button>
      </div>
    </div>
  );
};

export default AnalysisResult;