import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import api from '../api/axios';
import Layout from '../components/Layout';

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
}

const conversations = [
  { id: 1, title: 'TCS outlook', time: '09:15' },
  { id: 2, title: 'Portfolio rebalance', time: 'Yesterday' },
  { id: 3, title: 'Macro sentiment scan', time: 'Yesterday' },
  { id: 4, title: 'Gold vs Silver', time: 'Mon' },
  { id: 5, title: 'BTC horizon', time: 'Sun' },
];

const quickPrompts = ['What is TCS stock?', 'Show my portfolio', 'Best stocks today'];

const Chat = () => {
  const [activeConversation, setActiveConversation] = useState(1);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'ai', text: 'StockSphere AI is online. Ask about holdings, forecasts, sentiment, or compare assets.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      try {
        await api.get('/api/chatbot/history/');
      } catch (error) {
        console.error(error);
      }
    };

    void hydrate();
  }, []);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now(), sender: 'user', text: input };
    setMessages((current) => [...current, userMessage]);
    const question = input;
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/api/chatbot/ask/', { message: question });
      const reply = response.data.answer ?? response.data.response ?? 'I processed your market query and generated a live response.';
      setMessages((current) => [...current, { id: Date.now() + 1, sender: 'ai', text: reply }]);
    } catch (error) {
      console.error(error);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `Mock insight: ${question} currently screens as a medium-volatility idea with constructive sentiment and modest upside.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'flex', minHeight: 'calc(100vh - 140px)' }}>
        <aside className="panel" style={{ width: 300, padding: 0, borderRight: '1px solid var(--border)', borderRadius: '6px 0 0 6px' }}>
          <div style={{ padding: 16 }}>
            <button className="btn-blue" style={{ width: '100%' }} onClick={() => window.__showToast?.('New conversation started locally.', 'success')}>
              New Chat
            </button>
            <div className="label" style={{ marginTop: 18 }}>Conversations</div>
          </div>
          <div style={{ display: 'grid' }}>
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setActiveConversation(conversation.id)}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: activeConversation === conversation.id ? '#1a2d50' : 'transparent',
                  borderRadius: 0,
                  color: activeConversation === conversation.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                }}
              >
                <div style={{ fontSize: 11 }}>{conversation.title}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{conversation.time}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: '0 6px 6px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>StockSphere AI</div>
            <span className="badge badge-green">Powered by LangGraph Multi-Agent</span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {quickPrompts.map((prompt) => (
              <button key={prompt} className="btn-outline" onClick={() => setInput(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
            {messages.map((message) => (
              <div key={message.id} style={{ display: 'flex', justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                <div>
                  {message.sender === 'ai' ? <div style={{ fontSize: 9, color: 'var(--purple)', marginBottom: 4 }}>AI</div> : null}
                  <div
                    style={{
                      background: message.sender === 'user' ? '#1a3a6b' : '#0d1e3a',
                      borderRadius: message.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      padding: '10px 14px',
                      maxWidth: message.sender === 'user' ? '70%' : '75%',
                      fontSize: 12,
                    }}
                  >
                    {message.text}
                  </div>
                </div>
              </div>
            ))}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#0d1e3a', borderRadius: '12px 12px 12px 2px', padding: '10px 14px', display: 'flex', gap: 6 }}>
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--text-secondary)',
                        animation: `pulse 1s ${dot * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} style={{ flex: 1 }} placeholder="Ask about your portfolio, a stock, or a market scenario..." />
            <button className="btn-blue" type="submit" disabled={loading}>
              {loading ? '...' : 'Send'}
            </button>
          </form>
        </section>
      </div>
    </Layout>
  );
};

export default Chat;
