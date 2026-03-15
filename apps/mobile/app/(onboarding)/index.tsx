import React, { useRef, useState } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/lib/theme';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Spacing } from '../../src/constants/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = 'youssouf_onboarded';

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  arabicVerse?: string;
  arabicSource?: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    eyebrow: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ',
    title: 'Memorise with\nintention.',
    subtitle:
      'Youssouf is a companion for those who carry the Quran in their hearts — built for discipline, consistency, and love of the Book.',
  },
  {
    id: '2',
    eyebrow: 'Track your journey',
    title: 'Know exactly\nwhere you stand.',
    subtitle:
      'Log your daily memorisation, see your real pace, and watch a living forecast of when you will complete your goal.',
    arabicVerse: 'وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا',
    arabicSource: 'Al-Muzzammil 73:4',
  },
  {
    id: '3',
    eyebrow: 'Groups & accountability',
    title: 'Revise together\nstay together.',
    subtitle:
      'Join a memorisation circle, revise as a group, and let your teacher guide your progress — all in one place.',
  },
  {
    id: '4',
    eyebrow: 'Subcis — a Somali tradition',
    title: 'The group\nrevision circle.',
    subtitle:
      'Divide a juz among your group. Each member records their portion. Together, you build one complete revision track.',
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleViewable = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const next = () => {
    if (currentIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bgPrimary }]}>
      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        onViewableItemsChanged={handleViewable}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <SlideItem slide={item} />
        )}
      />

      {/* Bottom controls */}
      <SafeAreaView edges={['bottom']} style={styles.controls}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex ? theme.accentGreenLight : theme.border,
                  width: i === currentIndex ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>

        <Button
          label={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          onPress={next}
          style={{ marginHorizontal: Spacing.lg }}
        />

        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finish} style={styles.skip}>
            <Text variant="caption" secondary>
              Skip
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

function SlideItem({ slide }: { slide: Slide }) {
  const theme = useTheme();

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <SafeAreaView edges={['top']} style={styles.slideInner}>
        {/* Eyebrow */}
        <Text
          variant="caption"
          secondary
          style={[styles.eyebrow, { letterSpacing: 1.2 }]}
        >
          {slide.eyebrow.toUpperCase()}
        </Text>

        {/* Headline */}
        <Text variant="h1" style={styles.title}>
          {slide.title}
        </Text>

        {/* Arabic verse (optional) */}
        {slide.arabicVerse && (
          <View style={styles.verseBlock}>
            <Text
              variant="arabicLarge"
              style={[styles.arabicVerse, { color: theme.gold }]}
            >
              {slide.arabicVerse}
            </Text>
            <Text variant="caption" secondary style={styles.arabicSource}>
              {slide.arabicSource}
            </Text>
          </View>
        )}

        {/* Body */}
        <Text variant="body" secondary style={styles.subtitle}>
          {slide.subtitle}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slide: { flex: 1 },
  slideInner: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['3xl'],
    gap: Spacing.lg,
  },
  eyebrow: {
    marginBottom: Spacing.xs,
  },
  title: {
    lineHeight: 38,
  },
  verseBlock: {
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
    alignItems: 'flex-end',
  },
  arabicVerse: {
    textAlign: 'right',
  },
  arabicSource: {
    textAlign: 'right',
  },
  subtitle: {
    lineHeight: 26,
  },
  controls: {
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
});
