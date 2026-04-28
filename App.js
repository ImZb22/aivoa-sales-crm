import React, { useState } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [chatHistory, setChatHistory] = useState([
    { role: 'bot', text: 'AI Sales Assistant active. Describe your visit with the HCP to update the log.' }
  ]);

  // Form state - Managed via the Chat Agent
  const [formData, setFormData] = useState({
    hcpName: "",
    type: "Meeting",
    date: "",
    time: "",
    attendees: "",
    topics: "",
    materials: "",
    sentiment: "Neutral",
    outcomes: "",
    followUp: ""
  });

  // Helper for auto-resizing Chat Input and Read-Only textareas
  const handleAutoResize = (e) => {
    e.target.style.height = 'inherit';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleSend = async () => {
    if (!message) return;

    const newHistory = [...chatHistory, { role: 'user', text: message }];
    setChatHistory(newHistory);

    try {
      const response = await fetch('http://localhost:8000/process-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: message,
            current_data: formData 
        }),
      });
      
      const result = await response.json();
      setChatHistory([...newHistory, { role: 'bot', text: result.reply }]);

      if (result.data) setFormData(result.data);
      if (result.suggestions) setSuggestions(result.suggestions);

    } catch (error) {
      console.error("Agent Connection Error:", error);
    }
    setMessage("");
  };

  const handleFinalizeSave = async () => {
    try {
      const response = await fetch('http://localhost:8000/save-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const resData = await response.json();
      alert(resData.status || "Sales Log Saved to Database!");
    } catch (error) {
      alert("Database error. Is the backend running?");
    }
  };

  return (
    <div className="container">
      {/* LHS: READ-ONLY DISPLAY PANEL */}
      <div className="form-panel">
        <h2>Log HCP Interaction</h2>
        
        <div className="row">
          <div className="field-group" style={{flex: 1}}>
            <label>HCP Name</label>
            <input value={formData.hcpName} readOnly className="readonly-input" placeholder="AI extracted name..." />
          </div>
          <div className="field-group" style={{flex: 1}}>
            <label>Interaction Type</label>
            <input value={formData.type} readOnly className="readonly-input" />
          </div>
        </div>

        <div className="row">
          <div className="field-group" style={{flex: 1}}>
            <label>Date</label>
            <input value={formData.date} readOnly className="readonly-input" />
          </div>
          <div className="field-group" style={{flex: 1}}>
            <label>Time</label>
            <input value={formData.time} readOnly className="readonly-input" />
          </div>
        </div>

        <div className="field-group">
          <label>Attendees</label>
          <input value={formData.attendees} readOnly className="readonly-input" />
        </div>

        <div className="field-group">
          <label>Topics Discussed</label>
          <textarea 
            value={formData.topics} 
            readOnly 
            rows="1"
            className="readonly-input"
            ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
          />
        </div>

        <div className="field-group">
          <label>Materials Shared / Samples Distributed</label>
          <input value={formData.materials} readOnly className="readonly-input" />
        </div>

        <div className="field-group">
          <label>Observed/Inferred HCP Sentiment</label>
          <div className="sentiment-row">
            {['Positive', 'Neutral', 'Negative'].map(s => (
              <label key={s} className="radio-label" style={{opacity: formData.sentiment === s ? 1 : 0.5}}>
                <input type="radio" checked={formData.sentiment === s} disabled /> 
                {s === 'Positive' ? 'Positive 😊' : s === 'Neutral' ? 'Neutral 😐' : 'Negative 😠'}
              </label>
            ))}
          </div>
        </div>

        <div className="field-group">
          <label>Outcomes</label>
          <textarea 
            value={formData.outcomes} 
            readOnly 
            rows="1" 
            className="readonly-input"
            ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} 
          />
        </div>

        {/* AI Suggested Follow-ups */}
        {suggestions.length > 0 && (
          <div className="field-group">
            <label style={{color: '#007bff'}}>AI Suggested Follow-ups:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suggestions.map((s, i) => (
                <span key={i} className="voice-note" style={{cursor: 'default'}}>+ {s}</span>
              ))}
            </div>
          </div>
        )}

        <button className="log-btn" onClick={handleFinalizeSave} style={{width: '100%', borderRadius: '4px', marginTop: '20px'}}>
            Finalize & Save Interaction
        </button>
      </div>

      {/* RHS: INTERACTIVE CHAT PANEL */}
      <div className="chat-panel">
        <div className="chat-header">🤖 AI Sales Assistant</div>
        <div className="chat-history">
          {chatHistory.map((msg, i) => (
            <div key={i} className={msg.role === 'bot' ? 'bot-msg' : 'user-msg'}>{msg.text}</div>
          ))}
        </div>
        <div className="chat-input-area">
          <textarea 
            value={message} 
            onChange={(e) => { setMessage(e.target.value); handleAutoResize(e); }} 
            placeholder="Describe visit or request corrections..." 
            onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows="1"
          />
          <button onClick={handleSend} className="log-btn">Log</button>
        </div>
      </div>
    </div>
  );
}

export default App;