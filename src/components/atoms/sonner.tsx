import { useSyncExternalStore } from 'react';
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CHROME_THEME_DARKEST_OF_MINES,
  getChromeThemeSnapshot,
  getServerChromeThemeSnapshot,
  subscribeToChromeTheme,
} from '@/lib/chrome-theme';

const Toaster = ({ ...props }: ToasterProps) => {
  const chromeTheme = useSyncExternalStore(
    subscribeToChromeTheme,
    getChromeThemeSnapshot,
    getServerChromeThemeSnapshot,
  );
  const theme = chromeTheme === CHROME_THEME_DARKEST_OF_MINES ? 'dark' : 'light';

  return (
    <Sonner
      theme={theme}
      className="toaster group moon-chrome"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
