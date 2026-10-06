import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors } from '../theme';

/**
 * The app mark: a lifter pressing a dumbbell overhead, inside a thin ring.
 * The same drawing is used for the app icon and favicon (see assets/).
 */
export function Logo({ size = 64, color = colors.text, accent = colors.primary }: {
  size?: number;
  color?: string;
  accent?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Fitness Tracker logo">
      <Circle cx={32} cy={32} r={30} stroke={color} strokeOpacity={0.55} strokeWidth={1.6} fill="none" />
      {/* Dumbbell */}
      <Line x1={17} y1={19} x2={47} y2={19} stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
      <Rect x={15} y={14} width={4.4} height={10} rx={1.4} fill={accent} />
      <Rect x={44.6} y={14} width={4.4} height={10} rx={1.4} fill={accent} />
      <Rect x={12} y={15.8} width={3} height={6.4} rx={1} fill={accent} />
      <Rect x={49} y={15.8} width={3} height={6.4} rx={1} fill={accent} />
      {/* Lifter */}
      <Circle cx={32} cy={27.5} r={3.4} fill={color} />
      <Path
        d="M23 19.5 L27.5 32 L32 33.5 L36.5 32 L41 19.5 M32 33.5 L32 43 M32 43 L26.5 52 M32 43 L37.5 52"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
