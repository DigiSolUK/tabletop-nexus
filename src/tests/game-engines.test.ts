import { describe, expect, it } from 'vitest';
import { createCommand } from '../games/core/engine';
import { connect4Bundle } from '../games/definitions/connect-4';
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
