import { Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/*
 * Small motion building blocks, so animation feels the same everywhere:
 * quick, soft, and never in the way. Both respect the device's
 * "reduce motion" setting.
 */

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

/*
 * A Pressable that sinks a little when pressed and lifts on hover (web).
 * `style` is the visual card or button; `containerStyle` is for layout
 * around it (width, margins), which is what Link asChild needs on the web.
 */
export function PressableScale({ style, containerStyle, children, scaleTo = 0.97, lift = true, onPressIn, onPressOut, onHoverIn, onHoverOut, ...props }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const raise = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: raise.value }, { scale: scale.value }],
  }));

  return (
    <Pressable
      {...props}
      style={containerStyle}
      onPressIn={(event) => {
        if (!reduceMotion) scale.value = withSpring(scaleTo, SPRING);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(event);
      }}
      onHoverIn={(event) => {
        if (lift && !reduceMotion) raise.value = withTiming(-3, { duration: 180 });
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        raise.value = withTiming(0, { duration: 180 });
        onHoverOut?.(event);
      }}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

/*
 * Fades content in while it rises a few pixels. In a list, pass the item's
 * index so items arrive one after another (capped so long lists stay quick).
 */
export function FadeInUp({ index = 0, delay = 0, style, children }) {
  const wait = delay + Math.min(index, 8) * 55;
  return (
    <Animated.View entering={FadeInDown.duration(420).delay(wait)} style={style}>
      {children}
    </Animated.View>
  );
}
