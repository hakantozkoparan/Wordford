import { LevelCode } from '@/types/models';
import { IoniconName } from '@/components/LevelCard';

export const LEVEL_GRADIENTS: Record<LevelCode, [string, string]> = {
  A1: ['#5667FF', '#7A8CFF'],
  A2: ['#FF7A88', '#FFB199'],
  B1: ['#3BC8D9', '#5AE3B4'],
  B2: ['#8A5DFF', '#B38CFF'],
  C1: ['#F8A937', '#FDC26F'],
  C2: ['#36C1FF', '#6ADFEE'],
};

export const LEVEL_ICONS: Record<LevelCode, IoniconName> = {
  A1: 'rocket',
  A2: 'flame',
  B1: 'planet',
  B2: 'sparkles',
  C1: 'star',
  C2: 'trophy',
};
