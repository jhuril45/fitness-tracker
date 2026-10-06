import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Runs `load` whenever the screen gains focus (e.g. after returning from a
 * form), so lists always show what's on the server.
 *
 * `data` is null while loading. When `deps` change (e.g. another day is
 * picked) the previous result is dropped right away rather than shown until
 * the new one arrives; refocusing or `reload()` keeps it on screen meanwhile.
 */
export function useLoadOnFocus<T>(load: () => Promise<T>, deps: React.DependencyList) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);
  // Results are tagged with the `run` that produced them, so a result for old
  // deps is never shown for new ones.
  const [result, setResult] = useState<{ run: typeof run; data: T | null; error: string | null }>({
    run,
    data: null,
    error: null,
  });
  const [version, setVersion] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      run()
        .then((data) => {
          if (active) setResult({ run, data, error: null });
        })
        .catch((e: unknown) => {
          if (active) setResult((prev) => ({ run, data: prev.run === run ? prev.data : null, error: e instanceof Error ? e.message : String(e) }));
        });
      return () => {
        active = false;
      };
    }, [run, version]),
  );

  const current = result.run === run;
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data: current ? result.data : null, error: current ? result.error : null, reload };
}
