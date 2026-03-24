import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Message {
  role: 'user' | 'ai';
  text: string;
  time: string;
}

export const AIWidget: React.FC = () => {
  const { isAuthenticated, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hi! I\'m StockSphere AI. Ask me about stocks, portfolios, or market insights!', time: 'now' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  if (!isAuthenticated) return null;

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { role: 'user', text: msg, time: now }]);
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/chatbot/ask/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      const reply = data.response || data.message || data.answer || 'No response received.';
      setMessages((prev) => [...prev, { role: 'ai', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Unable to reach AI service. Please try again.', time: '—' }]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK = ['What is TCS?', 'Show best stocks', 'Analyse my portfolio', 'Latest news'];

  return (
    <>
      <div className="ai-widget-bubble" onClick={() => setOpen((o) => !o)} title="AI Assistant"><span style={{ fontSize: 20 }}>{open ? '✕' : '✦'}</span></div>
      {open ? (
        <div className="ai-widget-panel">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg, rgba(124,58,237,0.15), transparent)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>StockSphere AI</div>
              <div style={{ fontSize: 10, color: 'var(--purple-light)' }}>✦ LangGraph Multi-Agent</div>
            </div>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} style={{ fontSize: 16, padding: 4 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8 }}>
                {m.role === 'ai' ? <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--purple), #9b59b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>AI</div> : null}
                <div style={{ maxWidth: '80%', background: m.role === 'user' ? 'var(--blue)' : 'var(--bg-panel)', borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding: '8px 12px', fontSize: 12, color: m.role === 'user' ? '#fff' : 'var(--text-secondary)', border: m.role === 'ai' ? '1px solid var(--border)' : 'none', lineHeight: 1.5 }}>
                  <div>{m.text}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, textAlign: 'right' }}>{m.time}</div>
                </div>
              </div>
            ))}
            {loading ? <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--purple), #9b59b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>AI</div><div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px 12px 12px 4px', padding: '10px 14px', display: 'flex', gap: 4, alignItems: 'center' }}>{[0, 1, 2].map((n) => <span key={n} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--purple-light)', animation: `pulseDot 1.2s infinite ${n * 0.2}s`, display: 'inline-block' }} />)}</div></div> : null}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: '6px 10px', display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
            {QUICK.map((q) => <button key={q} className="btn btn-outline" style={{ fontSize: 10, padding: '4px 8px', borderRadius: 20 }} onClick={() => send(q)}>{q}</button>)}
          </div>
          <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input className="input-field" style={{ flex: 1, fontSize: 12, padding: '8px 12px' }} placeholder="Ask anything about stocks..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className="btn btn-primary" onClick={() => send()} style={{ padding: '8px 12px' }}>➤</button>
          </div>
        </div>
      ) : null}
    </>
  );
};
