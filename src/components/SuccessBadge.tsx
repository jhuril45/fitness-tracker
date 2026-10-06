import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../theme';

const BUMPS = 12;

/** A scalloped seal with a check mark, for "done" confirmations. */
export function SuccessBadge({ size = 88, fill = '#DCEFEF', check = colors.onLight }: {
  size?: number;
  fill?: string;
  check?: string;
}) {
  const bumps = Array.from({ length: BUMPS }, (_, i) => {
    const angle = (i / BUMPS) * Math.PI * 2;
    return { cx: 50 + Math.cos(angle) * 36, cy: 50 + Math.sin(angle) * 36 };
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Success">
      <Circle cx={50} cy={50} r={38} fill={fill} />
      {bumps.map((b, i) => (
        <Circle key={i} cx={b.cx} cy={b.cy} r={11} fill={fill} />
      ))}
      <Path
        d="M35 51 L45.5 61.5 L66 40"
        stroke={check}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
