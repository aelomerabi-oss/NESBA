import { colors } from '../constants/theme';
import { useColorScheme } from './use-color-scheme';

export function useTheme() {
  useColorScheme();
  return colors;
}
