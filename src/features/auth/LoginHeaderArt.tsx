import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Ring radii and opacities around the top-right corner (6a). */
const rings = [
  { r: 62, opacity: 0.16 },
  { r: 108, opacity: 0.12 },
  { r: 154, opacity: 0.09 },
  { r: 200, opacity: 0.06 },
  { r: 246, opacity: 0.04 },
];

/**
 * Login header decoration: a #3A8FDB glow in the top-right corner, a faint white dot grid
 * (r 1.1, every 16pt) and five concentric rings centred 40pt from the right edge, 28pt from the top.
 * Profile (7a) uses the first four rings (0.16 → 0.06).
 */
export function LoginHeaderArt({ ringCount = rings.length }: { ringCount?: number }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const cx = size.width - 40;
  const cy = 28;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      {size.width ? (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <RadialGradient id="glow" cx={cx} cy={cy} r={260} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#3A8FDB" stopOpacity={0.6} />
              <Stop offset="1" stopColor="#3A8FDB" stopOpacity={0} />
            </RadialGradient>
            <Pattern id="dots" width={16} height={16} patternUnits="userSpaceOnUse">
              <Circle cx={8} cy={8} r={1.1} fill="#FFFFFF" fillOpacity={0.09} />
            </Pattern>
          </Defs>
          <Rect width={size.width} height={size.height} fill="url(#glow)" />
          <Rect width={size.width} height={size.height} fill="url(#dots)" />
          {rings.slice(0, ringCount).map(({ r, opacity }) => (
            <Circle key={r} cx={cx} cy={cy} r={r} stroke="#FFFFFF" strokeOpacity={opacity} strokeWidth={1.2} fill="none" />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
