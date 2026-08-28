export type LayoutMode = 'side' | 'top' | 'mix';
export type ThemeMode = 'light' | 'dark';

export interface AppSetting {
  theme: ThemeMode;
  colorPrimary: string;
  layout: LayoutMode;
  sidebar: 'vertical' | 'horizontal';
  tag: boolean;
  debug: boolean;
  collapse: boolean;
  search: boolean;
  lock: boolean;
  fullscreen: boolean;
  menu: boolean;
}
