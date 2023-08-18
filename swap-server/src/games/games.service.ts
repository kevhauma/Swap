import { Injectable } from '@nestjs/common';
import { DeckService } from 'src/deck/deck.service';
import { GAME_STATE } from 'src/model/GameState'

const games = [];

@Injectable()
export class GamesService {
    constructor(private deckService: DeckService){}
     getGames()  {
        return games;
      };
      getGameById(id)  {
        return games.find((game) => game.id === id);
      };
      
       createGame()  {
        const createdGame = {
          state: GAME_STATE.PRE_START,
          players: [],
          activePlayer: null,
        };
        games.push(createdGame);
        return createdGame;
      };
      
       joinGame (gameId, playerId) {
        const game = this.getGameById(gameId);
        game.players.push({ id: playerId, cards: [] });
      };
      
       startGame (id) {
        const game = this.getGameById(id);
      
        let deck = this.deckService.getNewShuffledDeck();
      
        Array.from({ length: 4 }).forEach(() => {
          game.players.forEach((player) => {
            const { card, remainingDeck } = this.deckService.takeOne(deck);
            player.cards.push(card);
            deck = remainingDeck;
          });
        });
      
        game.state = GAME_STATE.PREPARE;
        game.activePlayer = game.players[0].id;
      };
}
