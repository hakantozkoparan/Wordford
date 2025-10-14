import type { PremiumPlanId } from '@/types/premiumPlans';

export interface PremiumPlanOption {
  id: PremiumPlanId;
  title: string;
  price: string;
  description: string;
}

export const PREMIUM_PLAN_OPTIONS: PremiumPlanOption[] = [
  {
    id: 'monthly',
    title: '1 Ay',
    price: '100 TL',
    description: 'Esnek plan, hedeflerine kısa sürede ulaş.',
  },
  {
    id: 'quarterly',
    title: '3 Ay',
    price: '250 TL',
    description: 'Sezonluk çalışma hedefleri için avantajlı paket.',
  },
  {
    id: 'semiAnnual',
    title: '6 Ay',
    price: '400 TL',
    description: 'Yarının kelimelerini şimdiden fethetmek için en ekonomik seçim.',
  },
];

export const PREMIUM_PLAN_LABELS: Record<PremiumPlanId, string> = {
  monthly: '1 Ay - 100 TL',
  quarterly: '3 Ay - 250 TL',
  semiAnnual: '6 Ay - 400 TL',
};
