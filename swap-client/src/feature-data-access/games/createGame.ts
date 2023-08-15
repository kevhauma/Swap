import { GameType } from '@/types/Game';
import axiosClient from '../Axios';

export const createGame = async (): Promise<{ data: GameType }> => {
  return await axiosClient.post('/games/create');
};
