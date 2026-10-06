// Dark plum theme: a deep purple ground with a soft glow in the top-left
// corner (see ScreenBackground), white primary buttons and a pale-yellow accent.

export const colors = {
  /** Screen ground behind the glow. */
  background: '#251D31',
  /** The glow in the top-left corner of every screen. */
  glow: '#5D4766',
  /** Cards and list rows. */
  surface: '#30273D',
  /** Inputs, secondary buttons and other raised controls. */
  raised: '#433A54',
  text: '#FFFFFF',
  muted: '#A69DB6',
  border: '#3E3450',
  /** Accent for highlights: the current tab, selected items, "Fitness". */
  primary: '#F2DFA0',
  primarySoft: 'rgba(242, 223, 160, 0.14)',
  /** Text and icons on white buttons and on the accent. */
  onLight: '#251D31',
  success: '#8BE0A8',
  successSoft: 'rgba(139, 224, 168, 0.15)',
  danger: '#FF7B7B',
  dangerSoft: 'rgba(255, 123, 123, 0.14)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const radius = { md: 14, lg: 18 };

/** Montserrat is loaded in the root layout; headings use it, body text stays on the system font. */
export const fonts = {
  heading: 'Montserrat_700Bold',
  headingHeavy: 'Montserrat_800ExtraBold',
  medium: 'Montserrat_600SemiBold',
};
