import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from './api.js';

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Chat({ token, me, onLogout }) {
  const [users, setUsers] = useState([]);
  const [online, setOnline] = useState(new Set());
  const [current, setCurrent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState({});
  const [typingFrom, setTypingFrom] = useState(null);
  const [text, setText] = useState('');

  const socketRef = useRef(null);
  const currentRef = useRef(null);
  const usersRef = useRef([]);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);

  currentRef.current = current;
  usersRef.current = users;

  const handleAuthError = (err) => {
    if (err.status === 401) onLogout();
  };

  const loadUsers = () =>
    api('/api/users', { token }).then(setUsers).catch(handleAuthError);

  useEffect(() => {
    loadUsers();
    const poll = setInterval(loadUsers, 15000);

    const socket = io({ auth: { token } });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      if (err.message === 'Not authorised') onLogout();
    });

    socket.on('presence', (ids) => setOnline(new Set(ids)));

    socket.on('message', (m) => {
      const otherId = m.from === me.id ? m.to : m.from;
      if (!usersRef.current.some((u) => u.id === otherId)) loadUsers();
      if (currentRef.current?.id === otherId) {
        setMessages((prev) => [...prev, m]);
      } else if (m.from !== me.id) {
        setUnread((prev) => ({ ...prev, [otherId]: (prev[otherId] || 0) + 1 }));
      }
    });

    socket.on('typing', ({ from }) => {
      if (currentRef.current?.id !== from) return;
      setTypingFrom(from);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingFrom(null), 1800);
    });

    return () => {
      clearInterval(poll);
      clearTimeout(typingTimer.current);
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, current]);

  const openChat = async (u) => {
    setCurrent(u);
    setMessages([]);
    setTypingFrom(null);
    setUnread((prev) => ({ ...prev, [u.id]: 0 }));
    try {
      const history = await api('/api/messages/' + u.id, { token });
      if (currentRef.current?.id === u.id) setMessages(history);
    } catch (err) {
      handleAuthError(err);
    }
  };

  const closeChat = () => {
    setCurrent(null);
    setMessages([]);
  };

  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !current) return;
    socketRef.current.emit('message', { to: current.id, text: t });
    setText('');
  };

  const onType = (e) => {
    setText(e.target.value);
    const now = Date.now();
    if (current && now - lastTypingSent.current > 1500) {
      socketRef.current.emit('typing', { to: current.id });
      lastTypingSent.current = now;
    }
  };

  const isOnline = (id) => online.has(id);
  const status =
    current &&
    (typingFrom === current.id ? 'typing…' : isOnline(current.id) ? 'online' : 'offline');

  return (
    <div className={'app' + (current ? ' chatting' : '')}>
      <aside id="sidebar">
        <header>
          <strong>{me.username}</strong>
          <button onClick={onLogout}>Log out</button>
        </header>
        <ul id="users">
          {users.length === 0 && (
            <li className="hint">
              No other users yet. Open the app in another browser and register a second account.
            </li>
          )}
          {users.map((u) => (
            <li
              key={u.id}
              className={(isOnline(u.id) ? 'online ' : '') + (current?.id === u.id ? 'active' : '')}
              onClick={() => openChat(u)}
            >
              <div className="avatar">
                {u.username[0]}
                <span className="dot" />
              </div>
              <span>{u.username}</span>
              {unread[u.id] > 0 && <span className="unread">{unread[u.id]}</span>}
            </li>
          ))}
        </ul>
      </aside>

      <main id="chat">
        {!current ? (
          <div className="empty">Select a contact to start chatting</div>
        ) : (
          <div id="chatPane">
            <header>
              <button id="back" onClick={closeChat}>←</button>
              <div>
                <strong>{current.username}</strong>
                <small>{status}</small>
              </div>
            </header>
            <div id="messages">
              {messages.map((m) => (
                <div key={m.id} className={'msg' + (m.from === me.id ? ' mine' : '')}>
                  <span>{m.text}</span>
                  <time>{fmtTime(m.time)}</time>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form id="sendForm" onSubmit={send}>
              <input
                placeholder="Type a message"
                autoComplete="off"
                value={text}
                onChange={onType}
                autoFocus
              />
              <button type="submit">Send</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}