import { allGameManifests } from './catalogue';
import type { GameBundle, GameDefinition } from './engine';
import { battleshipBundle } from '../definitions/battleship';
import { blackjackBundle } from '../definitions/blackjack';
import { cardClassics } from '../definitions/card-classics';
import { checkersBundle } from '../definitions/checkers';
import { chessBundle } from '../definitions/chess';
import { connect4Bundle } from '../definitions/connect-4';
import { memoryMatchBundle } from '../definitions/memory-match';
import { partyClassics } from '../definitions/party-classics';
import { raceClassics } from '../definitions/race-classics';
import { reversiBundle } from '../definitions/reversi';
import { solitaireBundle } from '../definitions/solitaire';
import { ticTacToeBundle } from '../definitions/tic-tac-toe';

type RuntimeGameBundle = GameBundle<unknown>;

export const playableBundles = {
  'tic-tac-toe': ticTacToeBundle,
  'connect-4': connect4Bundle,
  checkers: checkersBundle,
  reversi: reversiBundle,
  battleship: battleshipBundle,
  blackjack: blackjackBundle,
  solitaire: solitaireBundle,
  'memory-match': memoryMatchBundle,
  chess: chessBundle,
  ...cardClassics,
  ...raceClassics,
  ...partyClassics,
} as unknown as Record<string, RuntimeGameBundle>;

export const playableGameIds = new Set(Object.keys(playableBundles));

export const builtInGameCatalogue = allGameManifests.map((manifest) => ({
  ...manifest,
  playable: playableGameIds.has(manifest.id),
}));

export const getGameBundle = (gameId: string): RuntimeGameBundle | null => playableBundles[gameId] ?? null;

export const getGameDefinition = (gameId: string): GameDefinition<unknown> | null => getGameBundle(gameId)?.definition ?? null;
