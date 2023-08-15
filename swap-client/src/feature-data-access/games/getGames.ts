import { GameType } from '@/types/Game';
import axiosClient from '../Axios';

export const getGames = async (): Promise<{ data: GameType[] }> => {
  return await axiosClient.get('/games/');
};
