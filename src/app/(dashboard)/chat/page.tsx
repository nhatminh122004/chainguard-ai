'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getGeminiModel } from '@/lib/gemini';
import { useAuth } from '@/contexts/AuthContext';
import './chat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  '💡 Làm sao để tiết kiệm 20% thu nhập?',
  '📊 Phân tích chi tiêu tháng này của tôi',
  '🔗 Blockchain credit score là gì?',
  '🛡️ Làm sao nhận biết gian lận tài chính?',
];

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize welcome message on client only to avoid hydration mismatch
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Xin chào ${user?.displayName || 'bạn'}! 👋

Tôi là **ChainGuard AI** — cố vấn tài chính AI của bạn, được hỗ trợ bởi **Google Gemini**.

Tôi có thể giúp bạn:
- 💰 Tư vấn quản lý tài chính cá nhân
- 📊 Phân tích xu hướng chi tiêu
- 🔗 Giải thích về blockchain & crypto
- 🛡️ Cảnh báo rủi ro gian lận
- 📈 Đề xuất chiến lược đầu tư

Hãy hỏi tôi bất cứ điều gì về tài chính nhé! 🚀`,
        timestamp: new Date(),
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const model = getGeminiModel();
      
      // Build chat history
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: m.content }],
        }));

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(content.trim());
      const response = await result.response;
      const text = response.text();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Xin lỗi, đã có lỗi xảy ra: ${error.message || 'Không thể kết nối với AI'}. 

Hãy kiểm tra:
- API Key Gemini đã được cấu hình chưa
- Kết nối internet của bạn

Bạn có thể thử lại sau! 🔄`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatMessageContent = (content: string) => {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="chat-page">
      {/* Chat Header */}
      <div className="chat-header glass-card-static">
        <div className="chat-header-left">
          <div className="chat-avatar">
            <span>🤖</span>
            <div className="chat-avatar-status"></div>
          </div>
          <div>
            <h2 className="chat-header-title">ChainGuard AI Advisor</h2>
            <p className="chat-header-subtitle">
              <span className="badge badge-primary" style={{ marginRight: '8px' }}>Gemini 2.0 Flash</span>
              Online
            </p>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="btn btn-ghost btn-icon" title="Xóa cuộc trò chuyện">🗑️</button>
          <button className="btn btn-ghost btn-icon" title="Export">📤</button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'assistant' ? '🤖' : (
                user?.photoURL ? (
                  <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : '👤'
              )}
            </div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-sender">
                  {msg.role === 'assistant' ? 'ChainGuard AI' : user?.displayName || 'Bạn'}
                </span>
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div
                className="message-text"
                dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }}
              />
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="chat-message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="chat-suggestions">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              className="suggestion-btn glass-card"
              onClick={() => sendMessage(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="chat-input-wrapper glass-card-static">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Hỏi về tài chính, chi tiêu, đầu tư..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />
        <button
          className={`btn btn-primary chat-send-btn ${!input.trim() || isLoading ? 'disabled' : ''}`}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
}
