import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors } from '../theme';

/**
 * A short list whose rows can be reordered by dragging their handle. Built on
 * PanResponder so it works on web and in Expo Go without native modules. Rows
 * must all be `rowHeight` tall.
 */
export function DraggableList<T>({
  items,
  keyOf,
  rowHeight,
  gap = 0,
  renderRow,
  onReorder,
  onDraggingChange,
}: {
  items: T[];
  keyOf: (item: T) => string;
  rowHeight: number;
  gap?: number;
  /** `handle` is the drag grip; place it somewhere in the row. */
  renderRow: (item: T, index: number, handle: React.ReactNode) => React.ReactNode;
  onReorder: (items: T[]) => void;
  /** Lets a parent ScrollView stop scrolling while a row is dragged. */
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const step = rowHeight + gap;

  function move(from: number, to: number) {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  }

  /** How far a row that isn't being dragged shifts to make room. */
  function offsetFor(index: number): number {
    if (!drag) return 0;
    const { from, to } = drag;
    if (from < to && index > from && index <= to) return -step;
    if (from > to && index >= to && index < from) return step;
    return 0;
  }

  return (
    <View style={{ gap }}>
      {items.map((item, index) => (
        <DraggableRow
          key={keyOf(item)}
          index={index}
          count={items.length}
          step={step}
          height={rowHeight}
          dragY={dragY}
          dragging={drag?.from === index}
          offset={offsetFor(index)}
          onStart={() => {
            setDrag({ from: index, to: index });
            onDraggingChange?.(true);
          }}
          onHover={(to) => setDrag((d) => (d && d.to !== to ? { ...d, to } : d))}
          onDrop={(to) => {
            setDrag(null);
            onDraggingChange?.(false);
            move(index, to);
          }}
          onStep={(direction) => move(index, index + direction)}>
          {(handle) => renderRow(item, index, handle)}
        </DraggableRow>
      ))}
    </View>
  );
}

function DraggableRow({
  index,
  count,
  step,
  height,
  dragY,
  dragging,
  offset,
  onStart,
  onHover,
  onDrop,
  onStep,
  children,
}: {
  index: number;
  count: number;
  step: number;
  height: number;
  dragY: Animated.Value;
  dragging: boolean;
  offset: number;
  onStart: () => void;
  onHover: (to: number) => void;
  onDrop: (to: number) => void;
  onStep: (direction: -1 | 1) => void;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  // The responder is created once, so it reads the latest props through a ref.
  const latest = useRef({ index, count, step, onStart, onHover, onDrop });
  latest.current = { index, count, step, onStart, onHover, onDrop };

  const responder = useMemo(() => {
    const target = (dy: number) => {
      const { index: i, count: n, step: s } = latest.current;
      return Math.min(n - 1, Math.max(0, i + Math.round(dy / s)));
    };
    const end = (dy: number) => {
      const to = target(dy);
      dragY.setValue(0);
      latest.current.onDrop(to);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragY.setValue(0);
        latest.current.onStart();
      },
      onPanResponderMove: (_, g) => {
        dragY.setValue(g.dy);
        latest.current.onHover(target(g.dy));
      },
      onPanResponderRelease: (_, g) => end(g.dy),
      onPanResponderTerminate: (_, g) => end(g.dy),
    });
  }, [dragY]);

  const handle = (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Reorder"
      accessibilityHint="Drag up or down to change the order"
      accessibilityActions={[
        { name: 'decrement', label: 'Move up' },
        { name: 'increment', label: 'Move down' },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'decrement' && index > 0) onStep(-1);
        if (e.nativeEvent.actionName === 'increment' && index < count - 1) onStep(1);
      }}
      hitSlop={8}
      style={[styles.handle, webGrab]}>
      <Ionicons name="reorder-three" size={26} color={dragging ? colors.primary : colors.muted} />
    </View>
  );

  return (
    <Animated.View
      style={[
        { height, transform: [{ translateY: dragging ? dragY : offset }] },
        dragging && styles.lifted,
      ]}>
      {children(handle)}
    </Animated.View>
  );
}

// Show a grab cursor and stop the browser from selecting text or scrolling
// the page while dragging. These styles only exist on web.
const webGrab = (Platform.OS === 'web' ? { cursor: 'grab', userSelect: 'none', touchAction: 'none' } : {}) as ViewStyle;

const styles = StyleSheet.create({
  handle: { paddingHorizontal: 4, justifyContent: 'center', alignSelf: 'stretch' },
  lifted: { zIndex: 10, elevation: 6, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)' },
});
