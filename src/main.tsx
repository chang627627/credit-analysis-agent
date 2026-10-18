import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

const params = new URLSearchParams(window.location.search);
const root = createRoot(document.getElementById('root')!);
const mount = (C: ComponentType) =>
  root.render(
    <StrictMode>
      <C />
    </StrictMode>,
  );

if (params.get('v') === '1') {
  // V1, byte-for-byte: its own global stylesheet and nothing from V2
  void Promise.all([import('./App'), import('./index.css')]).then(([m]) => mount(m.default));
} else {
  // V2: tokens live on the .v2 root, which is <html> itself
  document.documentElement.classList.add('v2');
  const page = params.has('kit') ? import('./v2/KitPage') : import('./v2/App');
  void Promise.all([page, import('./v2/v2.css')]).then(([m]) => mount(m.default));
}
