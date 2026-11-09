import { useEffect, useRef, useState } from 'react'
import { API_KEY, API_URL } from './Constrant'
import './App.css'

const createChat = () => ({
  id: crypto.randomUUID(),
  title: 'New chat',
  messages: [],
})

const suggestions = [
  { icon: '✦', title: 'Explore an idea', prompt: 'Help me explore an idea I have' },
  { icon: '⌘', title: 'Write something', prompt: 'Help me write something' },
  { icon: '⌁', title: 'Learn something', prompt: 'Teach me something interesting' },
  { icon: '⌘', title: 'Make a plan', prompt: 'Help me make a plan' },
]

function Icon({ name, size = 18 }) {
  const paths = {
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    bot: <><rect x="4" y="7" width="16" height="13" rx="4" /><path d="M12 3v4M9 13h.01M15 13h.01M9 17h6" /><path d="M4 12H2m20 0h-2" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function App() {
  const [chats, setChats] = useState(() => [createChat()])
  const [activeChatId, setActiveChatId] = useState(() => chats[0]?.id)
  const [question, setQuestion] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const activeChat = chats.find((chat) => chat.id === activeChatId)
  const messages = activeChat?.messages ?? []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isSending])

  const startNewChat = () => {
    const chat = createChat()
    setChats((current) => [chat, ...current])
    setActiveChatId(chat.id)
    setQuestion('')
    setError('')
    setIsSidebarOpen(false)
    inputRef.current?.focus()
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    const text = question.trim()
    if (!text || isSending || !activeChat) return

    if (!API_KEY) {
      setError('API key is missing. Add VITE_GEMINI_API_KEY to .env and restart the app.')
      return
    }

    const chatId = activeChat.id
    const userMessage = { id: crypto.randomUUID(), role: 'user', text }
    const assistantMessage = { id: crypto.randomUUID(), role: 'assistant', text: '', pending: true }
    const previousMessages = activeChat.messages

    setQuestion('')
    setError('')
    setIsSending(true)
    setChats((current) => current.map((chat) => (
      chat.id === chatId
        ? {
            ...chat,
            title: chat.messages.length === 0 ? text.slice(0, 36) : chat.title,
            messages: [...chat.messages, userMessage, assistantMessage],
          }
        : chat
    )))

    try {
      const response = await fetch(`${API_URL}?key=${encodeURIComponent(API_KEY)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...previousMessages.map((message) => ({
              role: message.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: message.text }],
            })),
            { role: 'user', parts: [{ text }] },
          ],
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || `Request failed (${response.status})`)
      }

      const answer = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim()

      if (!answer) {
        throw new Error('The API returned an empty response. Please try again.')
      }

      setChats((current) => current.map((chat) => (
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map((message) => (
                message.id === assistantMessage.id
                  ? { ...message, text: answer, pending: false }
                  : message
              )),
            }
          : chat
      )))
    } catch (requestError) {
      const message = requestError instanceof Error
        ? requestError.message
        : 'Something went wrong while contacting the API.'
      setChats((current) => current.map((chat) => (
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.filter((item) => item.id !== assistantMessage.id),
            }
          : chat
      )))
      setError(message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="app-shell">
      {isSidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar${isSidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <a className="brand" href="#" onClick={(event) => event.preventDefault()}>
            <span className="brand-mark"><Icon name="spark" size={20} /></span>
            <span>My-AI</span>
          </a>
          <button
            aria-label="Close sidebar"
            className="icon-button mobile-close"
            onClick={() => setIsSidebarOpen(false)}
          >
            <Icon name="menu" />
          </button>
        </div>

        <button className="new-chat-button" onClick={startNewChat}>
          <Icon name="plus" size={17} />
          <span>New chat</span>
          <span className="shortcut">⌘ K</span>
        </button>

        <div className="history">
          <p className="section-label">RECENTS</p>
          {chats.filter((chat) => chat.messages.length > 0).length === 0 ? (
            <p className="empty-history">Your conversations will appear here.</p>
          ) : (
            chats.filter((chat) => chat.messages.length > 0).map((chat) => (
              <button
                className={`history-item${chat.id === activeChatId ? ' history-item-active' : ''}`}
                key={chat.id}
                onClick={() => {
                  setActiveChatId(chat.id)
                  setError('')
                  setIsSidebarOpen(false)
                }}
              >
                <span className="history-title">{chat.title}</span>
                <Icon name="chevron" size={15} />
              </button>
            ))
          )}
        </div>

      </aside>

      <section className="chat-panel">
        <header className="topbar">
          <button
            aria-label="Open sidebar"
            className="icon-button mobile-menu"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="model-picker">
            <span className="model-indicator" />
            <span>My-AI</span>
            <span className="model-version">AI</span>
          </div>
          <button className="share-button" onClick={startNewChat}>
            <Icon name="plus" size={16} />
            <span>New chat</span>
          </button>
        </header>

        <div className={`conversation${messages.length === 0 ? ' conversation-empty' : ''}`}>
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-orb"><Icon name="spark" size={29} /></div>
              <p className="eyebrow">YOUR AI COMPANION</p>
              <h1>Curious minds<br />start <span>somewhere.</span></h1>
              <p className="welcome-description">
                Ask a question, share an idea, or just see where a conversation takes you.
              </p>
              <div className="suggestion-grid">
                {suggestions.map((suggestion) => (
                  <button
                    className="suggestion-card"
                    key={suggestion.title}
                    onClick={() => {
                      setQuestion(suggestion.prompt)
                      inputRef.current?.focus()
                    }}
                  >
                    <span className="suggestion-icon">{suggestion.icon}</span>
                    <span>{suggestion.title}</span>
                    <Icon name="chevron" size={15} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article className={`message message-${message.role}`} key={message.id}>
                  <div className={`message-avatar message-avatar-${message.role}`}>
                    <Icon name={message.role === 'user' ? 'user' : 'spark'} size={17} />
                  </div>
                  <div className="message-content">
                    <p className="message-author">{message.role === 'user' ? 'You' : 'My-AI'}</p>
                    {message.pending ? (
                      <div aria-label="My-AI is thinking" className="typing-indicator">
                        <span /><span /><span />
                      </div>
                    ) : (
                      <p className="message-text">{message.text}</p>
                    )}
                  </div>
                </article>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="composer-wrap">
          {error && <p className="error-message" role="alert">{error}</p>}
          <form className="composer" onSubmit={sendMessage}>
            <input
              aria-label="Message My-AI"
              autoComplete="off"
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Message My-AI..."
            />
            <div className="composer-bottom">
              <span className="composer-hint">Be curious. There are no wrong questions.</span>
              <button
                aria-label="Send message"
                className="send-button"
                disabled={!question.trim() || isSending}
                type="submit"
              >
                <Icon name="send" size={17} />
              </button>
            </div>
          </form>
          <p className="disclaimer">My-AI can make mistakes. Check important information.</p>
        </div>
      </section>
    </main>
  )
}

export default App
