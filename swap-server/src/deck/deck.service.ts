import { Injectable } from '@nestjs/common';
import { getAllCards } from 'src/model/Cards';
@Injectable()
export class DeckService {
    
 getNewDeck = () => {
    return getAllCards();
  };
   getNewShuffledDeck ()  {
    return this.shuffle(getAllCards());
  };
  
  // code stolen from: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
   shuffle  (deck)  {
    const array = [...deck];
    let currentIndex = array.length,
      randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
  
    return array;
  };
  
   takeOne(deck)  {
    const cardTaken = [...deck].pop();
    return { card: cardTaken, remainingDeck: deck };
  };
  
 }
