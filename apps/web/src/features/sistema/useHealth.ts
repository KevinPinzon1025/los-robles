import { useQuery } from '@tanstack/react-query';
import { getHealth } from './api.js';

export function useHealth() {
  return useQuery({
    queryKey: ['sistema', 'health'],
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval: 30000,
    retry: false,
  });
}
