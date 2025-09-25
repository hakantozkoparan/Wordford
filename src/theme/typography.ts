import { Platform } from 'react-native';

const fontFamilyPrimary = Platform.select({
  ios: 'AvenirNext-DemiBold',
  android: 'Montserrat-SemiBold',
  default: 'System',
});

const fontFamilySecondary = Platform.select({
  ios: 'AvenirNext-Regular',
  android: 'Montserrat-Regular',
  default: 'System',
});

export const typography = {
  headline: {
    fontFamily: fontFamilyPrimary,
    fontSize: 28,
    letterSpacing: 0.35,
  },
  title: {
    fontFamily: fontFamilyPrimary,
    fontSize: 22,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: fontFamilySecondary,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  body: {
    fontFamily: fontFamilySecondary,
    fontSize: 15,
    letterSpacing: 0.1,
  },
  caption: {
    fontFamily: fontFamilySecondary,
    fontSize: 13,
    letterSpacing: 0.25,
  },
};
