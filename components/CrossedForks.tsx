import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

interface CrossedForksProps {
  size?: number;
  color: string;
}

const FORK_PATH = 'M0,-11 L0,11 M-2.5,-11 L-2.5,-6 M2.5,-11 L2.5,-6 M-2.5,-6 L2.5,-6';

export default function CrossedForks({ size = 28, color }: CrossedForksProps) {
  return (
    <Svg width={size} height={size} viewBox="-14 -14 28 28">
      <G stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none">
        <G transform="rotate(45)">
          <Path d={FORK_PATH} />
        </G>
        <G transform="rotate(-45)">
          <Path d={FORK_PATH} />
        </G>
      </G>
    </Svg>
  );
}
