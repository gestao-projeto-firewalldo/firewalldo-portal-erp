import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return <div className="password-input">
    <input {...props} className={`input ${props.className ?? ''}`} type={visible ? 'text' : 'password'} />
    <button type="button" className="icon-btn password-toggle" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} onClick={() => setVisible(!visible)}>
      {visible ? <EyeOff size={19} /> : <Eye size={19} />}
    </button>
  </div>;
}
