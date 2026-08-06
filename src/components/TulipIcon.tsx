import { G, Path, Svg } from 'react-native-svg';
import { TULIP_DESIGN } from './tulipDesign';

const TULIP_HALF_SLACK = (TULIP_DESIGN.viewBox[3] - TULIP_DESIGN.viewBox[2]) / 2;

interface TulipIconProps {
  width?: number;
  height?: number;
  flowerColor: string;
  stemColor: string;
}

interface TulipPartProps {
  width?: number;
  height?: number;
  color: string;
}

export default function TulipIcon({ width = 120, height = 120, flowerColor, stemColor }: TulipIconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox={TULIP_DESIGN.viewBox.join(' ')}
      accessibilityLabel="Tulipán"
    >
      <G translateX={TULIP_HALF_SLACK}>
        {TULIP_DESIGN.stem.map((d, index) => (
          <Path key={`stem-${index}`} d={d} fill={stemColor} />
        ))}
        {TULIP_DESIGN.flower.map((d, index) => (
          <Path key={`flower-${index}`} d={d} fill={flowerColor} />
        ))}
      </G>
    </Svg>
  );
}

export function TulipStemIcon({ width = 120, height = 120, color }: TulipPartProps) {
  return (
    <Svg width={width} height={height} viewBox={TULIP_DESIGN.viewBox.join(' ')}>
      <G translateX={TULIP_HALF_SLACK}>
        {TULIP_DESIGN.stem.map((d, index) => (
          <Path key={`stem-${index}`} d={d} fill={color} />
        ))}
      </G>
    </Svg>
  );
}

export function TulipFlowerIcon({ width = 120, height = 120, color }: TulipPartProps) {
  return (
    <Svg width={width} height={height} viewBox={TULIP_DESIGN.viewBox.join(' ')}>
      <G translateX={TULIP_HALF_SLACK}>
        {TULIP_DESIGN.flower.map((d, index) => (
          <Path key={`flower-${index}`} d={d} fill={color} />
        ))}
      </G>
    </Svg>
  );
}
