import { useState } from 'react';
import { api } from './api.js';

export default function Login({ onLogin }) {
  const [registering, setRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api(registering ? '/api/register' : '/api/login', {
        method: 'POST',
        body: { username, password },
      });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth">
      <form className="card" onSubmit={submit}>
        <h1>💬 ChatApp</h1>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <p className="error">{error}</p>
        <button type="submit">{registering ? 'Register' : 'Log in'}</button>
        <p className="switch">
          {registering ? 'Have an account? ' : 'No account? '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setRegistering(!registering);
              setError('');
            }}
          >
            {registering ? 'Log in' : 'Register'}
          </a>
        </p>
      </form>
    </div>
  );
}
