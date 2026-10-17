import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Providers } from '@/app/Providers';
import { Router } from '@/app/Router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Router />
    </Providers>
  </StrictMode>,
);
