import { PropsWithChildren } from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { AdBanner } from './AdBanner';

interface Props extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  showAd?: boolean;
}

export const ScreenContainer: React.FC<Props> = ({
  children,
  style,
  contentStyle,
  edges,
  showAd = true,
}) => (
  <SafeAreaView style={[styles.safeArea, style]} edges={edges}>
    <View style={[styles.content, contentStyle]}>
      <View style={styles.body}>{children}</View>
      {showAd ? <AdBanner /> : null}
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
