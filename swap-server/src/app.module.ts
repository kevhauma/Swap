import { Module } from '@nestjs/common';
import { GamesModule } from './games/games.module';

@Module({
  controllers: [],
  imports: [GamesModule],
  
})
export class AppModule {}
