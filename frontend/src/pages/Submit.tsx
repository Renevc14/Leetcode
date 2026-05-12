import { useState } from 'react';
import { api } from '../api/client';

export function Submit() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const submit = async () => {
    try {
      const res = await api.get<{ email: string; sub: string }>('/v1/me');
      setResult(`Submission enviada por ${res.data.email} (sub=${res.data.sub}).`);
    } catch (err) {
      setResult(`Error: ${(err as Error).message}`);
    }
  };

  return (
    <section>
      <h1>Enviar solución</h1>
      <textarea
        rows={10}
        cols={60}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="// tu código aquí"
      />
      <br />
      <button onClick={() => void submit()}>Enviar</button>
      {result && <p>{result}</p>}
    </section>
  );
}
