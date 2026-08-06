import { Path, Svg } from 'react-native-svg';
import { TULIP_DESIGN } from './tulipDesign';

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
      {TULIP_DESIGN.stem.map((d, index) => (
        <Path key={`stem-${index}`} d={d} fill={stemColor} />
      ))}
      {TULIP_DESIGN.flower.map((d, index) => (
        <Path key={`flower-${index}`} d={d} fill={flowerColor} />
      ))}
    </Svg>
  );
}

export function TulipStemIcon({ width = 120, height = 120, color }: TulipPartProps) {
  return (
    <Svg width={width} height={height} viewBox={TULIP_DESIGN.viewBox.join(' ')}>
      {TULIP_DESIGN.stem.map((d, index) => (
        <Path key={`stem-${index}`} d={d} fill={color} />
      ))}
    </Svg>
  );
}

export function TulipFlowerIcon({ width = 120, height = 120, color }: TulipPartProps) {
  return (
    <Svg width={width} height={height} viewBox={TULIP_DESIGN.viewBox.join(' ')}>
      {TULIP_DESIGN.flower.map((d, index) => (
        <Path key={`flower-${index}`} d={d} fill={color} />
      ))}
    </Svg>
  );
}
