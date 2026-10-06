import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Runs `load` whenever the screen gains focus (e.g. after returning from a
 * form), so lists always show what's in the database.
 */
export function useLoadOnFocus<T>(load: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      run()
        .then((result) => {
          if (active) {
            setData(result);
            setError(null);
          }
        })
        .catch((e: unknown) => {
          if (active) setError(e instanceof Error ? e.message : String(e));
        });
      return () => {
        active = false;
      };
    }, [run, version]),
  );

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, reload };
}
