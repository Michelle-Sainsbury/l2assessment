import React, { useState } from 'react';
import { analyzeCustomerMessage, SAMPLE_QUEUE } from '../services/triageService';
import './TriageDashboard.css';

export default function TriageDashboard() {
  const [messages, setMessages] = useState(SAMPLE_QUEUE);
  const [inputMessage, setInputMessage] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);

  // Metrics calculation
  const totalTriaged = messages.length;
  const urgentCount = messages.filter(m => m.priority === 'Urgent' || m.priority === 'High').length;

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    setLoading(true);
    setErrorBanner(null);

    try {
      const result = await analyzeCustomerMessage(inputMessage, apiKey);
      
      const newTicket = {
        id: Date.now(),
        text: inputMessage,
        category: result.category,
        priority: result.priority,
        routingQueue: result.routingQueue,
        summary: result.summary,
        isFallback: result.isFallback
      };

      if (result.isFallback) {
        setErrorBanner("AI service experienced issues. Ticket assigned to fallback queue.");
      }

      setMessages([newTicket, ...messages]);
      setInputMessage('');
    } catch (err) {
      setErrorBanner("Failed to process message: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicket = (id, field, value) => {
    setMessages(messages.map(ticket => 
      ticket.id === id ? { ...ticket, [field]: value, manualOverride: true } : ticket
    ));
  };

  const handleDeleteTicket = (id) => {
    setMessages(messages.filter(ticket => ticket.id !== id));
  };

  return (
    <div className="triage-dashboard">
      <header className="dashboard-header">
        <h1>Relay AI — Support Triage Dashboard</h1>
        <p>Automate customer message categorization, prioritization, and routing.</p>
      </header>

      {errorBanner && <div className="error-banner">{errorBanner}</div>}

      {/* Metrics Bar */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Messages</h3>
          <p>{totalTriaged}</p>
        </div>
        <div className="metric-card">
          <h3>High / Urgent Priority</h3>
          <p className="urgent-stat">{urgentCount}</p>
        </div>
        <div className="metric-card">
          <h3>System Status</h3>
          <p className="status-online">● Operational</p>
        </div>
      </div>

      {/* Input & API Configuration */}
      <div className="triage-controls-card">
        <div className="api-key-group">
          <label>LLM API Key:</label>
          <input 
            type="password" 
            placeholder="sk-..." 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
          />
        </div>

        <form onSubmit={handleSingleSubmit} className="message-form">
          <textarea 
            rows="3"
            placeholder="Paste incoming customer support message here..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Analyzing with AI...' : 'Triage Message'}
          </button>
        </form>
      </div>

      {/* Triage Queue Table with Manual Overrides */}
      <div className="queue-section">
        <h2>Active Triage Queue</h2>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Customer Message / Summary</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Routing Queue</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((ticket) => (
                <tr key={ticket.id} className={ticket.isFallback ? 'fallback-row' : ''}>
                  <td>
                    <div className="ticket-text">{ticket.text}</div>
                    {ticket.manualOverride && <span className="badge-override">Manual Override</span>}
                    {ticket.isFallback && <span className="badge-fallback">Fallback Applied</span>}
                  </td>
                  <td>
                    <select 
                      value={ticket.category || 'General Support'} 
                      onChange={(e) => handleUpdateTicket(ticket.id, 'category', e.target.value)}
                    >
                      <option value="Billing">Billing</option>
                      <option value="Technical">Technical</option>
                      <option value="Account">Account</option>
                      <option value="Feature">Feature</option>
                      <option value="General Support">General Support</option>
                    </select>
                  </td>
                  <td>
                    <select 
                      value={ticket.priority || 'Medium'} 
                      onChange={(e) => handleUpdateTicket(ticket.id, 'priority', e.target.value)}
                      className={`priority-${(ticket.priority || 'medium').toLowerCase()}`}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={ticket.routingQueue || 'General Queue'}
                      onChange={(e) => handleUpdateTicket(ticket.id, 'routingQueue', e.target.value)}
                    />
                  </td>
                  <td>
                    <button className="delete-btn" onClick={() => handleDeleteTicket(ticket.id)}>Dismiss</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}