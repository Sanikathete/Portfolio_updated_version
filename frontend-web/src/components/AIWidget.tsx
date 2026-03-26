import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';

const chatbotBaseURL =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? ''
    : '';

interface Message {
  role: 'user' | 'ai';
  text: string;
  time: string;
  agentType?: string;
}

export const AIWidget: React.FC = () => {
  const { isAuthenticated, token } = useAuth();
  const { selectedPortfolioId } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'StockSphere AI is online. Ask about TCS analysis, portfolio moves, or market news.', time: 'now', agentType: 'general_agent' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isAuthenticated) return null;

  const send = async (raw?: string) => {
    const question = (raw ?? input).trim();
    if (!question) return;

    setInput('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((current) => [...current, { role: 'user', text: question, time: now }]);
    setLoading(true);

    try {
      const params = new URLSearchParams({ message: question });
      if (selectedPortfolioId) {
        params.set('portfolio_id', String(selectedPortfolioId));
      }
      const response = await fetch(`${chatbotBaseURL}/api/chatbot/personal-chat/?${params.toString()}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to fetch a reply.');
      }
      setMessages((current) => [
        ...current,
        {
          role: 'ai',
          text: data.reply || data.answer || data.response || data.error || 'No response received.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agentType: data.agent_type || 'general_agent',
        },
      ]);
    } catch (error: any) {
      setMessages((current) => [
        ...current,
        {
          role: 'ai',
          text: error?.message || 'Unable to reach the chatbot service right now.',
          time: '--',
          agentType: 'general_agent',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = ['TCS analysis', 'Best stocks', 'My portfolio', 'Market news'];

  return (
    <>
      <div className="ai-widget-bubble" onClick={() => setOpen((current) => !current)} title="Open StockSphere AI">
        <span style={{ fontSize: 18, fontWeight: 700 }}>AI</span>
      </div>

      {open ? (
        <div className="ai-widget-panel">
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '0.5px solid #2a1f5a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0d1428',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>StockSphere AI</div>
              <span className="badge badge-purple" style={{ marginTop: 4 }}>LangGraph Multi-Agent</span>
            </div>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} style={{ padding: 4 }}>X</button>
          </div>

          <div style={{ padding: '8px 10px', display: 'flex', gap: 6, overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => send(prompt)}
                style={{
                  borderRadius: 999,
                  padding: '5px 10px',
                  background: '#1a1040',
                  color: '#a78bfa',
                  fontSize: 11,
                  border: '1px solid #2a1f5a',
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((message, index) => (
              <div key={`${message.time}-${index}`} style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '82%' }}>
                  {message.role === 'ai' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#7c3aed', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        AI
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{message.time}</span>
                    </div>
                  ) : null}
                  <div
                    style={{
                      padding: '10px 12px',
                      fontSize: 12,
                      lineHeight: 1.6,
                      background: message.role === 'user' ? '#1a2d50' : '#13092e',
                      borderRadius: message.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    }}
                  >
                    {message.text}
                  </div>
                  {message.role === 'ai' && message.agentType ? (
                    <div style={{ marginTop: 4 }}>
                      <span className="badge badge-purple">{message.agentType}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#13092e', borderRadius: '12px 12px 12px 2px', padding: '10px 14px', display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#a78bfa',
                        animation: `pulseDot 1.1s infinite ${dot * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--border)' }}>
            <input
              className="input-field"
              style={{ background: '#0a0f1e', flex: 1 }}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask StockSphere AI..."
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            <button className="btn btn-primary" onClick={() => void send()} disabled={loading}>Send</button>
          </div>
        </div>
      ) : null}
    </>
  );
};
