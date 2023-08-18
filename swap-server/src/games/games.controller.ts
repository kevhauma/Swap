import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
    constructor(private readonly gameService: GamesService) {}
  @Get()
  getGames() {
   return this.gameService.getGames();
  };
  @Get('/:id')
 getGameById(@Param('id') id) {
    this.gameService.getGameById(id);
  };
  @Post('/create')
 createGame(){
    return this.gameService.createGame();
  };
  @Post('/join')
  joinGame(@Body() gameId, @Body() playerId){
    return this.gameService.joinGame(gameId, playerId)
  };
  @Post('/start')
  startGame(@Body() gameId){
    this.gameService.startGame(gameId);
  };
}