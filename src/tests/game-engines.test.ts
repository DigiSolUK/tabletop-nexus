import { describe, expect, it } from 'vitest';
import { createCommand, createReplaySnapshot, createSnapshot } from '../games/core/engine';
import { blackjackBundle } from '../games/definitions/blackjack';
import { connect4Bundle } from '../games/definitions/connect-4';
import { texasHoldemBundle } from '../games/definitions/card-classics';
import { memoryMatchBundle } from '../games/definitions/memory-match';
import { triviaBundle } from '../games/definitions/party-classics';
import { reversiBundle } from '../games/definitions/reversi';
import { ticTacToeBundle } from '../games/definitions/tic-tac-toe';
import type { MatchSetup } from '../shared/contracts';

const baseSetup = (gameId: string): MatchSetup => ({
  id: `${gameId}-setup`,
  gameId,
  mode: 'single',
  aiDifficulty: 'medium',
  tutorialEnabled: false,
  ruleVariants: {},
  seed: 42,
  players: [
    { id: 'p1', name: 'Player One', type: 'human', accent: '#67e8f9' },
    { id: 'p2', name: 'Nexus AI', type: 'ai', accent: '#fb7185' },
  ],
});

describe('tic tac toe engine', () => {
  it('detects a winning row', () => {
    const setup = baseSetup('tic-tac-toe');
    let state = ticTacToeBundle.definition.createInitialState(setup);
    state = ticTacToeBundle.definition.applyCommand(state, setup, createCommand('p1', 'place', { index: 0 })).state;
    state = ticTacToeBundle.definition.applyCommand(state, setup, createCommand('p2', 'place', { index: 3 })).state;
    state = ticTacToeBundle.definition.applyCommand(state, setup, createCommand('p1', 'place', { index: 1 })).state;
    state = ticTacToeBundle.definition.applyCommand(state, setup, createCommand('p2', 'place', { index: 4 })).state;
    const result = ticTacToeBundle.definition.applyCommand(state, setup, createCommand('p1', 'place', { index: 2 }));
    expect(result.status.phase).toBe('complete');
    expect(result.status.winnerIds).toEqual(['p1']);
  });
});

describe('connect 4 engine', () => {
  it('stacks discs and ends on a four-in-a-column', () => {
    const setup = baseSetup('connect-4');
    const initial = connect4Bundle.definition.createInitialState(setup);
    const commands = [
      createCommand('p1', 'drop', { column: 0 }),
      createCommand('p2', 'drop', { column: 1 }),
      createCommand('p1', 'drop', { column: 0 }),
      createCommand('p2', 'drop', { column: 1 }),
      createCommand('p1', 'drop', { column: 0 }),
      createCommand('p2', 'drop', { column: 1 }),
      createCommand('p1', 'drop', { column: 0 }),
    ];
    let result = {
      state: initial,
      status: connect4Bundle.definition.getStatus(initial, setup),
    };
    for (const command of commands) {
      result = connect4Bundle.definition.applyCommand(result.state, setup, command);
    }
    expect(result.status.phase).toBe('complete');
    expect(result.status.winnerIds).toEqual(['p1']);
  });
});

describe('reversi engine', () => {
  it('flips enclosed discs on a legal move', () => {
    const setup = baseSetup('reversi');
    const state = reversiBundle.definition.createInitialState(setup);
    const result = reversiBundle.definition.applyCommand(state, setup, createCommand('p1', 'place', { row: 2, column: 3 }));
    expect(result.state.board[2][3]).toBe('dark');
    expect(result.state.board[3][3]).toBe('dark');
  });
});

describe('round refresh flows', () => {
  it('creates a fresh blackjack next hand with preserved session stats', () => {
    const setup = baseSetup('blackjack');
    const state = blackjackBundle.definition.createInitialState(setup);
    let result = blackjackBundle.definition.applyCommand(state, setup, createCommand('p1', 'stand', {}));
    if (result.status.phase !== 'complete') {
      result = blackjackBundle.definition.applyCommand(result.state, setup, createCommand('p1', 'stand', {}));
    }
    const snapshot = createSnapshot(blackjackBundle.definition, setup, result.state, result.status);
    const rematch = createReplaySnapshot(snapshot, blackjackBundle.definition);
    expect(rematch.id).not.toBe(snapshot.id);
    expect(rematch.roundSeed).not.toBe(snapshot.roundSeed);
    expect(rematch.state.playerHand.map((card) => card.id)).not.toEqual(snapshot.state.playerHand.map((card) => card.id));
    expect(rematch.sessionStats?.handsPlayed).toBe(snapshot.state.session.handsPlayed);
  });

  it('creates a deterministic fresh texas holdem hand without wall-clock randomness', () => {
    const setup = baseSetup('texas-holdem');
    const state = texasHoldemBundle.definition.createInitialState(setup);
    let currentState = state;
    for (let index = 0; index < 4; index += 1) {
      currentState = texasHoldemBundle.definition.applyCommand(currentState, setup, createCommand('p1', 'advance', {})).state;
    }
    const status = texasHoldemBundle.definition.getStatus(currentState, setup);
    const snapshot = createSnapshot(texasHoldemBundle.definition, setup, currentState, status);
    const firstReplay = createReplaySnapshot(snapshot, texasHoldemBundle.definition);
    const secondReplay = createReplaySnapshot(snapshot, texasHoldemBundle.definition);
    expect(firstReplay.state.community).toEqual([]);
    expect(firstReplay.state.hands).toEqual(secondReplay.state.hands);
    expect(firstReplay.sessionStats?.handsPlayed).toBe(1);
  });

  it('replays memory match with a different seeded deck selection', () => {
    const setup = baseSetup('memory-match');
    const state = memoryMatchBundle.definition.createInitialState(setup);
    const status = memoryMatchBundle.definition.getStatus(state, setup);
    const snapshot = createSnapshot(memoryMatchBundle.definition, setup, state, status);
    const rematch = createReplaySnapshot(snapshot, memoryMatchBundle.definition);
    expect(rematch.state.deck.map((card) => card.symbol)).not.toEqual(snapshot.state.deck.map((card) => card.symbol));
  });

  it('rebuilds trivia prompts on replay with a fresh order', () => {
    const setup = baseSetup('trivia');
    const state = triviaBundle.definition.createInitialState(setup);
    const status = triviaBundle.definition.getStatus(state, setup);
    const snapshot = createSnapshot(triviaBundle.definition, setup, state, status);
    const rematch = createReplaySnapshot(snapshot, triviaBundle.definition);
    expect(rematch.state.questions.map((question) => question.prompt)).not.toEqual(
      snapshot.state.questions.map((question) => question.prompt)
    );
  });
});
