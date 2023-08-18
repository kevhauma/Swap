import { Module } from '@nestjs/common';
import { DeckModule } from 'src/deck/deck.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  controllers: [GamesController],
  providers: [GamesService],
  imports:[DeckModule]
})
export class GamesModule {}