import { useQuery, useMutation } from 'react-query';
import { getGames, createGame } from '@/data-access';

export const Lobby = () => {
  const { data: gamesFetchData } = useQuery('games', getGames);
  const gamesData = gamesFetchData?.data;
  const { mutate: postCreateGame } = useMutation(createGame);
  const createGameClicked = () => {
    postCreateGame();
  };

  return (
    <>
      {gamesData?.map((game) => (
        <div key={game.id}>
          {game.id} - {game.name} - {game.players.length} players
        </div>
      ))}
      <button onClick={createGameClicked}>Create Game</button>
    </>
  );
};
