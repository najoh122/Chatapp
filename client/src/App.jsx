import { useState } from 'react';
import Login from './Login.jsx';
import Chat from './Chat.jsx';

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      const token = localStorage.getItem('token');
      const me = JSON.parse(localStorage.getItem('me') || 'null');
      return token && me ? { token, me } : null;
    } catch {
      return null;
    }
  });

  const onLogin = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('me', JSON.stringify(user));
    setSession({ token, me: user });
  };

  const onLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('me');
    setSession(null);
  };

  return session ? (
    <Chat token={session.token} me={session.me} onLogout={onLogout} />
  ) : (
    <Login onLogin={onLogin} />
  );
}