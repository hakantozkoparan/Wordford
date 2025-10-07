import { LevelCode } from '@/types/models';

export type AppStackParamList = {
  Tabs: undefined;
  LevelDetail: { level: string; index?: number };
  AdminWordManager: undefined;
  AdminPanel: undefined;
  Login: undefined;
  Register: undefined;
  WordExampleEdit: { level: LevelCode; wordId: string };
};

export type TabsParamList = {
  Home: undefined;
  Words: undefined;
  Profile: undefined;
};
