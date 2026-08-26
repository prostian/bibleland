import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import '@/index.css';
import { router } from '@/router';
import { watchSystemTheme } from '@/store/useThemeStore';

watchSystemTheme();

const container = document.getElementById('root');
if (!container) throw new Error('Wurzelelement #root fehlt in index.html.');

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
