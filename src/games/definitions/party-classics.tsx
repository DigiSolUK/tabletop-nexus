import { useRef, useState } from 'react';
import { createCommand, shuffleWithSeed, type GameBundle } from '../core/engine';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchSetup, MatchStatus } from '../../shared/contracts';

interface TriviaQuestion {
  prompt: string;
  options: string[];
  answerIndex: number;
}

interface TriviaState {
  questions: TriviaQuestion[];
  questionIndex: number;
  currentPlayerId: string;
  scores: Record<string, number>;
}

interface PromptScoreState {
  prompts: string[];
  promptIndex: number;
  currentPlayerId: string;
  scores: Record<string, number>;
  phase: 'prompt' | 'result';
}

interface BluffingState {
  deck: Array<{ topic: string; word: string; bluff: string }>;
  roundIndex: number;
  phase: 'reveal' | 'vote' | 'result' | 'complete';
  revealIndex: number;
  currentPlayerId: string;
  assignments: Record<string, string>;
  blufferId: string;
  votes: Record<string, string>;
  scores: Record<string, number>;
}

const triviaBank: TriviaQuestion[] = [
  { prompt: 'Which planet is known as the Red Planet?', options: ['Mars', 'Venus', 'Mercury', 'Jupiter'], answerIndex: 0 },
  { prompt: 'How many sides does a hexagon have?', options: ['Five', 'Six', 'Seven', 'Eight'], answerIndex: 1 },
  { prompt: 'Which piece moves in an L shape in chess?', options: ['Bishop', 'Rook', 'Knight', 'King'], answerIndex: 2 },
  { prompt: 'What is the capital city of Italy?', options: ['Madrid', 'Rome', 'Athens', 'Milan'], answerIndex: 1 },
  { prompt: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answerIndex: 3 },
  { prompt: 'How many cards are in a standard deck?', options: ['48', '50', '52', '54'], answerIndex: 2 },
  { prompt: 'Which metal is liquid at room temperature?', options: ['Mercury', 'Silver', 'Tin', 'Copper'], answerIndex: 0 },
  { prompt: 'What do bees collect from flowers?', options: ['Sap', 'Pollen', 'Dew', 'Seeds'], answerIndex: 1 },
  { prompt: 'Which instrument has black and white keys?', options: ['Violin', 'Trumpet', 'Piano', 'Drums'], answerIndex: 2 },
  { prompt: 'How many minutes are in two hours?', options: ['100', '110', '120', '140'], answerIndex: 2 },
  { prompt: 'Which chess piece can jump over others?', options: ['Rook', 'Knight', 'Queen', 'Bishop'], answerIndex: 1 },
  { prompt: 'Which planet has the most prominent rings?', options: ['Saturn', 'Mars', 'Earth', 'Neptune'], answerIndex: 0 },
  { prompt: 'What is H2O more commonly called?', options: ['Hydrogen', 'Helium', 'Water', 'Oxygen'], answerIndex: 2 },
  { prompt: 'Which season comes after spring in the UK?', options: ['Autumn', 'Winter', 'Summer', 'Monsoon'], answerIndex: 2 },
  { prompt: 'How many players are on one football team on the pitch?', options: ['9', '10', '11', '12'], answerIndex: 2 },
  { prompt: 'Which shape has exactly three sides?', options: ['Square', 'Triangle', 'Pentagon', 'Circle'], answerIndex: 1 },
  { prompt: 'What is the largest mammal?', options: ['Elephant', 'Blue whale', 'Giraffe', 'Rhino'], answerIndex: 1 },
  { prompt: 'Which day comes after Friday?', options: ['Thursday', 'Saturday', 'Sunday', 'Monday'], answerIndex: 1 },
  { prompt: 'What colour do you get by mixing blue and yellow?', options: ['Purple', 'Orange', 'Green', 'Pink'], answerIndex: 2 },
  { prompt: 'How many letters are in the English alphabet?', options: ['24', '25', '26', '27'], answerIndex: 2 },
  { prompt: 'Which continent is Egypt in?', options: ['Europe', 'Asia', 'Africa', 'South America'], answerIndex: 2 },
  { prompt: 'What do you call a baby cat?', options: ['Cub', 'Pup', 'Kitten', 'Foal'], answerIndex: 2 },
  { prompt: 'Which gas do plants absorb from the air?', options: ['Nitrogen', 'Carbon dioxide', 'Oxygen', 'Hydrogen'], answerIndex: 1 },
  { prompt: 'What is the freezing point of water in Celsius?', options: ['0', '10', '32', '100'], answerIndex: 0 },
  { prompt: 'Which board game uses hotels and properties?', options: ['Cluedo', 'Scrabble', 'Monopoly', 'Risk'], answerIndex: 2 },
  { prompt: 'How many continents are there?', options: ['5', '6', '7', '8'], answerIndex: 2 },
  { prompt: 'Which animal is known for carrying its house?', options: ['Crab', 'Snail', 'Turtle', 'Hedgehog'], answerIndex: 1 },
  { prompt: 'What is the main language spoken in Brazil?', options: ['Spanish', 'Portuguese', 'French', 'Italian'], answerIndex: 1 },
  { prompt: 'Which star is at the centre of our solar system?', options: ['Polaris', 'Sirius', 'The Sun', 'Vega'], answerIndex: 2 },
  { prompt: 'How many pips are on a standard die?', options: ['5', '6', '7', '8'], answerIndex: 1 },
];

const drawingPrompts = [
  'Dragon bakery',
  'Robot detective',
  'Haunted lighthouse',
  'Pirate tea party',
  'Space zoo',
  'Volcano picnic',
  'Underwater library',
  'Cat astronaut',
  'Clockwork castle',
  'Moonlit campsite',
  'Jungle skateboard race',
  'Snowman rock concert',
  'Treasure map workshop',
  'Wizard coffee shop',
  'Submarine garden',
  'Tiny city on a turtle',
  'Meteor shower over a carnival',
  'Forest train station',
  'Monster ice cream van',
  'Steampunk hot air balloon',
  'Castle in a bottle',
  'Alien farmers market',
  'Sky bridge aquarium',
  'Desert arcade',
];
const charadesPrompts = [
  'Mime brushing a giant horse',
  'Pretend you are scuba diving',
  'Act out making a pizza',
  'Imitate a sleepy lion',
  'Perform a dramatic treasure hunt',
  'Pretend to juggle flaming torches',
  'Act out being stuck in a revolving door',
  'Mime a superhero landing on ice',
  'Pretend you are trying to catch a slippery fish',
  'Act like a robot learning to dance',
  'Mime building a blanket fort',
  'Pretend to be a penguin on roller skates',
  'Act out discovering a secret passage',
  'Mime playing invisible drums',
  'Pretend to tame a tiny dragon',
  'Act like your umbrella turned inside out',
  'Mime giving a speech to ducks',
  'Pretend you are surfing a giant sofa',
  'Act out getting lost in a maze',
  'Mime carving a pumpkin in a hurry',
  'Pretend to open a stubborn jar',
  'Act like a wizard late for the bus',
  'Mime teaching a bear to wave',
  'Pretend to ride an invisible bicycle uphill',
];
const bluffingDeck = [
  { topic: 'Snack table', word: 'Nachos', bluff: 'Popcorn' },
  { topic: 'Holiday trip', word: 'Beach', bluff: 'Mountain' },
  { topic: 'Fantasy creature', word: 'Dragon', bluff: 'Phoenix' },
  { topic: 'Kitchen tool', word: 'Whisk', bluff: 'Ladle' },
  { topic: 'Movie night', word: 'Comedy', bluff: 'Horror' },
  { topic: 'Board game table', word: 'Meeple', bluff: 'Token' },
  { topic: 'Camping trip', word: 'Tent', bluff: 'Cabin' },
  { topic: 'Space mission', word: 'Rocket', bluff: 'Shuttle' },
  { topic: 'Dessert tray', word: 'Brownie', bluff: 'Cookie' },
  { topic: 'City travel', word: 'Train', bluff: 'Tram' },
  { topic: 'Pet shop', word: 'Hamster', bluff: 'Gerbil' },
  { topic: 'Garden shed', word: 'Rake', bluff: 'Shovel' },
  { topic: 'Music room', word: 'Guitar', bluff: 'Ukulele' },
  { topic: 'Weather report', word: 'Thunder', bluff: 'Lightning' },
  { topic: 'Beach bag', word: 'Towel', bluff: 'Blanket' },
  { topic: 'Breakfast bar', word: 'Pancakes', bluff: 'Waffles' },
  { topic: 'Toy chest', word: 'Puzzle', bluff: 'Blocks' },
  { topic: 'Workshop shelf', word: 'Hammer', bluff: 'Mallet' },
  { topic: 'Superhero kit', word: 'Cape', bluff: 'Cloak' },
  { topic: 'Festival stage', word: 'Spotlight', bluff: 'Lantern' },
];

const nextPlayer = (setup: MatchSetup, playerId: string) =>
  setup.players[(setup.players.findIndex((player) => player.id === playerId) + 1) % setup.players.length]?.id ?? playerId;

const winnerFromScores = (scores: Record<string, number>) => {
  const ordered = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = ordered[0]?.[1] ?? 0;
  const winners = ordered.filter(([, score]) => score === top).map(([playerId]) => playerId);
  return { winners, top };
};

const triviaStatus = (state: TriviaState, setup: MatchSetup): MatchStatus => {
  if (state.questionIndex >= state.questions.length) {
    const { winners } = winnerFromScores(state.scores);
    return {
      phase: 'complete',
      message:
        winners.length > 1
          ? 'Trivia ends in a tie after the final question.'
          : `${setup.players.find((player) => player.id === winners[0])?.name ?? 'Winner'} scored highest in trivia.`,
      currentPlayerId: null,
      winnerIds: winners.length === 1 ? winners : [],
      isDraw: winners.length > 1,
      canSave: false,
    };
  }
  return activeStatus(
    `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} is answering the trivia prompt.`,
    state.currentPlayerId
  );
};

export const triviaBundle: GameBundle<TriviaState> = {
  definition: {
    manifest: manifestById.trivia,
    tutorial: tutorialsById['tutorial-trivia'],
    createInitialState: (setup) => ({
      questions: shuffleWithSeed(triviaBank, setup.seed).items.slice(0, 6),
      questionIndex: 0,
      currentPlayerId: setup.players[0]?.id ?? 'player-1',
      scores: Object.fromEntries(setup.players.map((player) => [player.id, 0])),
    }),
    getStatus: triviaStatus,
    applyCommand: (state, setup, command) => {
      if (command.type !== 'answer' || command.playerId !== state.currentPlayerId) {
        return { state, status: triviaStatus(state, setup) };
      }
      const question = state.questions[state.questionIndex];
      const correct = Number(command.payload.answerIndex) === question.answerIndex;
      const nextState = {
        ...state,
        questionIndex: state.questionIndex + 1,
        currentPlayerId: nextPlayer(setup, command.playerId),
        scores: {
          ...state.scores,
          [command.playerId]: state.scores[command.playerId] + (correct ? 1 : 0),
        },
      };
      return { state: nextState, status: triviaStatus(nextState, setup) };
    },
    getMetrics: (state) => ({
      questionsAnswered: state.questionIndex,
    }),
    createAiCommand: () => null,
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const question = state.questions[state.questionIndex];
    return (
      <div className="game-column">
        <div className="score-row">
          {snapshot.setup.players.map((player) => (
            <div key={player.id} className="score-card">
              <span>{player.name}</span>
              <strong>{state.scores[player.id]}</strong>
            </div>
          ))}
        </div>
        {question ? (
          <div className="surface-panel surface-panel--compact">
            <h3>{question.prompt}</h3>
            <div className="stack">
              {question.options.map((option, index) => (
                <button key={option} type="button" className="ghost-button" onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'answer', { answerIndex: index }))}>
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  },
};

const promptStatus = (state: PromptScoreState, setup: MatchSetup, gameName: string): MatchStatus => {
  if (state.promptIndex >= state.prompts.length) {
    const { winners } = winnerFromScores(state.scores);
    return {
      phase: 'complete',
      message:
        winners.length > 1
          ? `${gameName} ends with a shared top score.`
          : `${setup.players.find((player) => player.id === winners[0])?.name ?? 'Winner'} led the table in ${gameName.toLowerCase()}.`,
      currentPlayerId: null,
      winnerIds: winners.length === 1 ? winners : [],
      isDraw: winners.length > 1,
      canSave: false,
    };
  }
  return activeStatus(
    `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} is up for the next prompt.`,
    state.currentPlayerId
  );
};

const createPromptScoreState = (setup: MatchSetup, prompts: string[]): PromptScoreState => ({
  prompts: shuffleWithSeed(prompts, setup.seed).items.slice(0, 6),
  promptIndex: 0,
  currentPlayerId: setup.players[0]?.id ?? 'player-1',
  scores: Object.fromEntries(setup.players.map((player) => [player.id, 0])),
  phase: 'prompt',
});

export const charadesBundle: GameBundle<PromptScoreState> = {
  definition: {
    manifest: manifestById.charades,
    tutorial: tutorialsById['tutorial-charades'],
    createInitialState: (setup) => createPromptScoreState(setup, charadesPrompts),
    getStatus: (state, setup) => promptStatus(state, setup, 'Charades'),
    applyCommand: (state, setup, command) => {
      if (command.playerId !== state.currentPlayerId) {
        return { state, status: promptStatus(state, setup, 'Charades') };
      }
      if (command.type === 'skip' || command.type === 'success') {
        const nextState = {
          ...state,
          promptIndex: state.promptIndex + 1,
          currentPlayerId: nextPlayer(setup, command.playerId),
          scores: {
            ...state.scores,
            [command.playerId]: state.scores[command.playerId] + (command.type === 'success' ? 1 : 0),
          },
        };
        return { state: nextState, status: promptStatus(nextState, setup, 'Charades') };
      }
      return { state, status: promptStatus(state, setup, 'Charades') };
    },
    getMetrics: (state) => ({
      roundsPlayed: state.promptIndex,
    }),
    createAiCommand: () => null,
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const prompt = state.prompts[state.promptIndex];
    return (
      <div className="game-column">
        <div className="score-row">
          {snapshot.setup.players.map((player) => (
            <div key={player.id} className="score-card">
              <span>{player.name}</span>
              <strong>{state.scores[player.id]}</strong>
            </div>
          ))}
        </div>
        {prompt ? (
          <div className="surface-panel surface-panel--compact">
            <h3>{prompt}</h3>
            <p>Act it out without speaking, then score the round from the same device.</p>
            <div className="button-row">
              <button type="button" className="primary-button" onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'success', {}))}>
                Prompt guessed
              </button>
              <button type="button" className="ghost-button" onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'skip', {}))}>
                Skip prompt
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  },
};

export const drawingClubBundle: GameBundle<PromptScoreState> = {
  definition: {
    manifest: manifestById['drawing-club'],
    tutorial: tutorialsById['tutorial-drawing-club'],
    createInitialState: (setup) => createPromptScoreState(setup, drawingPrompts),
    getStatus: (state, setup) => promptStatus(state, setup, 'Drawing Club'),
    applyCommand: (state, setup, command) => {
      if (command.playerId !== state.currentPlayerId) {
        return { state, status: promptStatus(state, setup, 'Drawing Club') };
      }
      if (command.type === 'score' || command.type === 'skip') {
        const nextState = {
          ...state,
          promptIndex: state.promptIndex + 1,
          currentPlayerId: nextPlayer(setup, command.playerId),
          scores: {
            ...state.scores,
            [command.playerId]: state.scores[command.playerId] + (command.type === 'score' ? 1 : 0),
          },
        };
        return { state: nextState, status: promptStatus(nextState, setup, 'Drawing Club') };
      }
      return { state, status: promptStatus(state, setup, 'Drawing Club') };
    },
    getMetrics: (state) => ({
      sketchesPlayed: state.promptIndex,
    }),
    createAiCommand: () => null,
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const prompt = state.prompts[state.promptIndex];
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [drawing, setDrawing] = useState(false);

    const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    return (
      <div className="game-column">
        <div className="score-row">
          {snapshot.setup.players.map((player) => (
            <div key={player.id} className="score-card">
              <span>{player.name}</span>
              <strong>{state.scores[player.id]}</strong>
            </div>
          ))}
        </div>
        {prompt ? (
          <div className="surface-panel surface-panel--compact">
            <h3>{prompt}</h3>
            <p>Sketch the prompt, pass the device around, then mark the round manually.</p>
            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              width={760}
              height={320}
              onPointerDown={(event) => {
                const pos = point(event);
                const ctx = canvasRef.current?.getContext('2d');
                if (!pos || !ctx) {
                  return;
                }
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.strokeStyle = '#f8fafc';
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                setDrawing(true);
              }}
              onPointerMove={(event) => {
                if (!drawing) {
                  return;
                }
                const pos = point(event);
                const ctx = canvasRef.current?.getContext('2d');
                if (!pos || !ctx) {
                  return;
                }
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
              }}
              onPointerUp={() => setDrawing(false)}
              onPointerLeave={() => setDrawing(false)}
            />
            <div className="button-row">
              <button type="button" className="ghost-button" onClick={() => canvasRef.current?.getContext('2d')?.clearRect(0, 0, 760, 320)}>
                Clear sketch
              </button>
              <button type="button" className="primary-button" onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'score', {}))}>
                Award point
              </button>
              <button type="button" className="ghost-button" onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'skip', {}))}>
                Next prompt
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  },
};

const bluffingStatus = (state: BluffingState, setup: MatchSetup): MatchStatus => {
  if (state.phase === 'complete') {
    const { winners } = winnerFromScores(state.scores);
    return {
      phase: 'complete',
      message:
        winners.length > 1
          ? 'Bluffing Room finishes with a tied scoreline.'
          : `${setup.players.find((player) => player.id === winners[0])?.name ?? 'Winner'} controlled the room best.`,
      currentPlayerId: null,
      winnerIds: winners.length === 1 ? winners : [],
      isDraw: winners.length > 1,
      canSave: false,
    };
  }
  if (state.phase === 'reveal') {
    return activeStatus(
      `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} should privately read their role card.`,
      state.currentPlayerId
    );
  }
  if (state.phase === 'vote') {
    return activeStatus(
      `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} is casting a suspicion vote.`,
      state.currentPlayerId
    );
  }
  return activeStatus('Review the round result and move to the next bluffing topic.', state.currentPlayerId);
};

const newBluffRound = (state: BluffingState | null, setup: MatchSetup): BluffingState => {
  const deck = state?.deck ?? shuffleWithSeed(bluffingDeck, setup.seed).items;
  const roundIndex = state?.roundIndex ?? 0;
  const topic = deck[roundIndex];
  const blufferId = setup.players[roundIndex % setup.players.length]?.id ?? setup.players[0]?.id ?? 'player-1';
  const assignments = Object.fromEntries(
    setup.players.map((player) => [player.id, player.id === blufferId ? topic.bluff : topic.word])
  );
  return {
    deck,
    roundIndex,
    phase: 'reveal',
    revealIndex: 0,
    currentPlayerId: setup.players[0]?.id ?? 'player-1',
    assignments,
    blufferId,
    votes: {},
    scores: state?.scores ?? Object.fromEntries(setup.players.map((player) => [player.id, 0])),
  };
};

export const bluffingRoomBundle: GameBundle<BluffingState> = {
  definition: {
    manifest: manifestById['bluffing-room'],
    tutorial: tutorialsById['tutorial-bluffing-room'],
    createInitialState: (setup) => newBluffRound(null, setup),
    getStatus: bluffingStatus,
    applyCommand: (state, setup, command) => {
      if (state.phase === 'reveal' && command.type === 'next-reveal' && command.playerId === state.currentPlayerId) {
        const revealIndex = state.revealIndex + 1;
        if (revealIndex >= setup.players.length) {
          const nextState = { ...state, phase: 'vote' as const, revealIndex, currentPlayerId: setup.players[0]?.id ?? state.currentPlayerId };
          return { state: nextState, status: bluffingStatus(nextState, setup) };
        }
        const nextState = { ...state, revealIndex, currentPlayerId: setup.players[revealIndex]?.id ?? state.currentPlayerId };
        return { state: nextState, status: bluffingStatus(nextState, setup) };
      }
      if (state.phase === 'vote' && command.type === 'vote' && command.playerId === state.currentPlayerId) {
        const suspectId = String(command.payload.suspectId ?? '');
        const votes = { ...state.votes, [command.playerId]: suspectId };
        const nextId = nextPlayer(setup, command.playerId);
        if (Object.keys(votes).length >= setup.players.length) {
          const tally = Object.values(votes).reduce<Record<string, number>>((acc, playerId) => {
            acc[playerId] = (acc[playerId] ?? 0) + 1;
            return acc;
          }, {});
          const guessedId = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
          const caught = guessedId === state.blufferId;
          const scores = { ...state.scores };
          if (caught) {
            setup.players.filter((player) => player.id !== state.blufferId).forEach((player) => {
              scores[player.id] += 1;
            });
          } else {
            scores[state.blufferId] += 2;
          }
          const complete = state.roundIndex >= Math.min(4, state.deck.length - 1);
          const nextState = complete
            ? { ...state, votes, scores, phase: 'complete' as const, currentPlayerId: state.currentPlayerId }
            : { ...state, votes, scores, phase: 'result' as const, currentPlayerId: state.currentPlayerId };
          return { state: nextState, status: bluffingStatus(nextState, setup) };
        }
        const nextState = { ...state, votes, currentPlayerId: nextId };
        return { state: nextState, status: bluffingStatus(nextState, setup) };
      }
      if (state.phase === 'result' && command.type === 'next-round') {
        const nextState = newBluffRound({ ...state, roundIndex: state.roundIndex + 1 }, setup);
        return { state: nextState, status: bluffingStatus(nextState, setup) };
      }
      return { state, status: bluffingStatus(state, setup) };
    },
    getMetrics: (state) => ({
      roundsPlayed: state.roundIndex + (state.phase === 'complete' ? 1 : 0),
    }),
    createAiCommand: () => null,
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const round = state.deck[state.roundIndex];
    const currentPlayer = snapshot.setup.players.find((player) => player.id === state.currentPlayerId);
    return (
      <div className="game-column">
        <div className="score-row">
          {snapshot.setup.players.map((player) => (
            <div key={player.id} className="score-card">
              <span>{player.name}</span>
              <strong>{state.scores[player.id]}</strong>
            </div>
          ))}
        </div>
        <div className="surface-panel surface-panel--compact">
          <h3>{round.topic}</h3>
          {state.phase === 'reveal' ? (
            <>
              <p>Pass the device to {currentPlayer?.name}. Their private word is below.</p>
              <div className="bluff-card">{state.assignments[state.currentPlayerId]}</div>
              <button type="button" className="primary-button" onClick={() => dispatch(createCommand(state.currentPlayerId, 'next-reveal', {}))}>
                Hide and continue
              </button>
            </>
          ) : null}
          {state.phase === 'vote' ? (
            <>
              <p>{currentPlayer?.name}, who do you think is bluffing?</p>
              <div className="button-row">
                {snapshot.setup.players
                  .filter((player) => player.id !== state.currentPlayerId)
                  .map((player) => (
                    <button key={player.id} type="button" className="ghost-button" onClick={() => dispatch(createCommand(state.currentPlayerId, 'vote', { suspectId: player.id }))}>
                      Vote {player.name}
                    </button>
                  ))}
              </div>
            </>
          ) : null}
          {state.phase === 'result' || state.phase === 'complete' ? (
            <>
              <p>
                The bluff word was <strong>{round.bluff}</strong>. The bluffer was{' '}
                <strong>{snapshot.setup.players.find((player) => player.id === state.blufferId)?.name}</strong>.
              </p>
              {state.phase === 'result' ? (
                <button type="button" className="primary-button" onClick={() => dispatch(createCommand(state.currentPlayerId, 'next-round', {}))}>
                  Next round
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    );
  },
};

export const partyClassics = {
  trivia: triviaBundle,
  'drawing-club': drawingClubBundle,
  charades: charadesBundle,
  'bluffing-room': bluffingRoomBundle,
};
