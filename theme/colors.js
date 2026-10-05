/**
 * theme/colors.js
 * ---------------
 * Light and dark colour palettes. Every screen reads colours from here
 * (via useTheme / useThemedStyles) instead of hardcoding hex values, so new
 * screens get dark-mode support for free.
 *
 * Brand colours that sit on top of gradients or coloured buttons (white text
 * on navy, etc.) are the same in both themes.
 */

const shared = {
  white:       '#FFFFFF',
  black:       '#000000',
  navy:        '#1a237e',   // gradient start / brand
  green:       '#16a97a',   // brand accent / "Found"
  lost:        '#FF5722',
  danger:      '#E53935',
  blue:        '#2196F3',
  orange:      '#FB8C00',
  primaryBtn:  '#1B3A8A',   // solid primary button
  success:     '#22C55E',
  overlay:     'rgba(0,0,0,0.5)',
};

export const lightColors = {
  ...shared,
  background:     '#F4F7FB',  // screen background
  surface:        '#FFFFFF',  // cards, headers, tab bar
  surfaceAlt:     '#F0F1F6',  // back buttons, chips, input wells
  input:          '#F9F9F9',
  text:           '#1a1a2e',  // primary text
  textSecondary:  '#555555',
  textMuted:      '#9aa0b4',
  textFaint:      '#bbbbbb',
  placeholder:    '#9AA0AC',
  border:         '#dddddd',
  divider:        '#f0f1f6',
  chevron:        '#c5c8d3',
  emptyIcon:      '#c7cadb',
  brandText:      '#1a237e',  // navy used as text / active tint
  link:           '#1B3A8A',
  shadow:         '#000000',
  switchTrackOff: '#e0e0e6',

  // Soft icon-tile backgrounds
  tintOrange:  '#FFF3E0',
  tintPeach:   '#FFEDE0',
  tintRed:     '#FDE9EA',
  tintPink:    '#FDECEE',
  tintGreen:   '#EDFAF5',
  tintBlue:    '#E8F1FE',
  tintPurple:  '#EAECF9',
  tintLost:    '#FFF3F0',
  infoBox:     '#f0f8ff',
};

export const darkColors = {
  ...shared,
  background:     '#0F1220',
  surface:        '#1A1E2E',
  surfaceAlt:     '#262B3E',
  input:          '#20253A',
  text:           '#ECEEF5',
  textSecondary:  '#B4B9C9',
  textMuted:      '#8A90A6',
  textFaint:      '#646A80',
  placeholder:    '#6E7489',
  border:         '#2E3448',
  divider:        '#262B3D',
  chevron:        '#5A6076',
  emptyIcon:      '#4A5068',
  brandText:      '#8C9EFF',
  link:           '#8C9EFF',
  shadow:         '#000000',
  switchTrackOff: '#3A4058',

  tintOrange:  'rgba(251,140,0,0.16)',
  tintPeach:   'rgba(229,121,61,0.16)',
  tintRed:     'rgba(229,57,53,0.16)',
  tintPink:    'rgba(229,57,53,0.14)',
  tintGreen:   'rgba(22,169,122,0.16)',
  tintBlue:    'rgba(33,150,243,0.16)',
  tintPurple:  'rgba(91,106,208,0.20)',
  tintLost:    'rgba(255,87,34,0.16)',
  infoBox:     'rgba(33,150,243,0.10)',
};
