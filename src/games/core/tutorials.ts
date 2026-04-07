import type { TutorialScript } from '../../shared/contracts';

export const tutorialScripts: TutorialScript[] = [
  {
    id: 'tutorial-app',
    title: 'Welcome to TableTop Nexus',
    allowDisable: true,
    steps: [
      {
        id: 'welcome-home',
        title: 'Home Dashboard',
        body: 'Start from the dashboard to jump back into recent games, view your profile snapshot, or quick-launch a favourite.',
        targetId: 'screen-home',
      },
      {
        id: 'welcome-games',
        title: 'Games Library',
        body: 'Browse built-in and installed games with category filters, support badges, and setup shortcuts.',
        targetId: 'screen-games',
      },
      {
        id: 'welcome-party',
        title: 'Party Hub',
        body: 'Host a room, share an invite code, manage ready states, and rotate games from the lobby.',
        targetId: 'screen-party',
      },
      {
        id: 'welcome-create',
        title: 'Create and Mods',
        body: 'Use templates to build new custom packages, then manage imports and compatibility from the mods screen.',
        targetId: 'screen-create',
      },
      {
        id: 'welcome-stats',
        title: 'Stats and Exports',
        body: 'Track global progress, per-game performance, and export CSV, JSON, or PDF summaries.',
        targetId: 'screen-stats',
      },
    ],
  },
  {
    id: 'tutorial-tic-tac-toe',
    title: 'Tic Tac Toe Tutorial',
    steps: [
      { id: 'ttt-1', title: 'Claim the Grid', body: 'Players alternate placing marks on any empty tile.' },
      { id: 'ttt-2', title: 'Three in a Row', body: 'Complete a row, column, or diagonal before your opponent.' },
    ],
  },
  {
    id: 'tutorial-connect-4',
    title: 'Connect 4 Tutorial',
    steps: [
      { id: 'c4-1', title: 'Drop Discs', body: 'Select a column and your disc will fall into the lowest open slot.' },
      { id: 'c4-2', title: 'Read Threats', body: 'Watch horizontal, vertical, and diagonal lines to set traps or block them.' },
    ],
  },
  {
    id: 'tutorial-checkers',
    title: 'Checkers Tutorial',
    steps: [
      { id: 'ck-1', title: 'Move Diagonally', body: 'Pieces move diagonally forward until they are crowned as kings.' },
      { id: 'ck-2', title: 'Capture by Jumping', body: 'Leap over opposing pieces to remove them and swing momentum.' },
    ],
  },
  {
    id: 'tutorial-reversi',
    title: 'Reversi Tutorial',
    steps: [
      { id: 'rv-1', title: 'Bracket Opponents', body: 'Play next to enemy discs so your colour encloses them on a line.' },
      { id: 'rv-2', title: 'Flip for Control', body: 'Captured chains flip to your side, so corners become extremely valuable.' },
    ],
  },
  {
    id: 'tutorial-battleship',
    title: 'Battleship Tutorial',
    steps: [
      { id: 'bs-1', title: 'Scan the Ocean', body: 'Choose a coordinate to fire on the hidden enemy fleet.' },
      { id: 'bs-2', title: 'Track Hits', body: 'Hits reveal ship segments while misses help you eliminate patterns.' },
    ],
  },
  {
    id: 'tutorial-blackjack',
    title: 'Blackjack Tutorial',
    steps: [
      { id: 'bj-1', title: 'Beat 21 Carefully', body: 'Hit to improve your hand, but busting over 21 loses immediately.' },
      { id: 'bj-2', title: 'Dealer Rules', body: 'The dealer draws to at least 17 after every stand.' },
    ],
  },
  {
    id: 'tutorial-solitaire',
    title: 'Solitaire Tutorial',
    steps: [
      { id: 'so-1', title: 'Build Down', body: 'Move cards between tableau piles in descending order with alternating colours.' },
      { id: 'so-2', title: 'Build Foundations', body: 'Send cards home in ascending order by suit starting from the aces.' },
    ],
  },
  {
    id: 'tutorial-memory-match',
    title: 'Memory Match Tutorial',
    steps: [
      { id: 'mm-1', title: 'Flip Two Cards', body: 'Choose two hidden cards per turn and try to reveal a matching pair.' },
      { id: 'mm-2', title: 'Score Pairs', body: 'Matched pairs stay open and score for the active player.' },
    ],
  },
  {
    id: 'tutorial-chess',
    title: 'Chess Tutorial',
    steps: [
      { id: 'ch-1', title: 'Select and Move', body: 'Choose one of your pieces to highlight its legal destination squares.' },
      { id: 'ch-2', title: 'Checkmate Wins', body: 'Force the opposing king into a position with no legal escape moves.' },
    ],
  },
  {
    id: 'tutorial-hearts',
    title: 'Hearts Tutorial',
    steps: [
      { id: 'he-1', title: 'Follow Suit', body: 'When a suit is led, play that suit if you still have it in hand.' },
      { id: 'he-2', title: 'Avoid Penalties', body: 'Hearts are worth one point each and the queen of spades is worth thirteen.' },
    ],
  },
  {
    id: 'tutorial-crazy-eights',
    title: 'Crazy Eights Tutorial',
    steps: [
      { id: 'ce-1', title: 'Match the Pile', body: 'Play a card that matches the top card by suit or rank.' },
      { id: 'ce-2', title: 'Wild Eights', body: 'Eights change the active suit and can rescue a stalled hand.' },
    ],
  },
  {
    id: 'tutorial-ludo',
    title: 'Ludo Tutorial',
    steps: [
      { id: 'lu-1', title: 'Roll to Enter', body: 'A six brings your token onto the track from the start zone.' },
      { id: 'lu-2', title: 'Capture Rivals', body: 'Landing on an occupied space sends that opposing token back home.' },
    ],
  },
  {
    id: 'tutorial-backgammon',
    title: 'Backgammon Tutorial',
    steps: [
      { id: 'bg-1', title: 'Roll and Resolve', body: 'Use both dice each turn to move your checkers along the track.' },
      { id: 'bg-2', title: 'Bear Off', body: 'Move every checker off the board before your opponent does.' },
    ],
  },
  {
    id: 'tutorial-texas-holdem',
    title: 'Texas Hold\'em Tutorial',
    steps: [
      { id: 'th-1', title: 'Hole Cards', body: 'Each player starts with two private cards before the board is revealed.' },
      { id: 'th-2', title: 'Best Five Cards', body: 'At showdown, each player makes the strongest five-card hand from seven cards.' },
    ],
  },
  {
    id: 'tutorial-trivia',
    title: 'Trivia Tutorial',
    steps: [
      { id: 'tr-1', title: 'Take Turns', body: 'The active player answers the multiple-choice question on screen.' },
      { id: 'tr-2', title: 'Score Correctly', body: 'Each correct answer adds to your running score across the round set.' },
    ],
  },
  {
    id: 'tutorial-drawing-club',
    title: 'Drawing Club Tutorial',
    steps: [
      { id: 'dr-1', title: 'Sketch the Prompt', body: 'Use the built-in canvas to draw the current phrase or concept.' },
      { id: 'dr-2', title: 'Mark the Round', body: 'Award a point or skip ahead once the table has guessed the drawing.' },
    ],
  },
  {
    id: 'tutorial-charades',
    title: 'Charades Tutorial',
    steps: [
      { id: 'ca-1', title: 'Act It Out', body: 'Mime the prompt without speaking so the rest of the table can guess it.' },
      { id: 'ca-2', title: 'Rotate Quickly', body: 'Once the round ends, score it and hand the next prompt to the following player.' },
    ],
  },
  {
    id: 'tutorial-bluffing-room',
    title: 'Bluffing Room Tutorial',
    steps: [
      { id: 'br-1', title: 'Private Reveal', body: 'Pass the device so each player can privately see their assigned word.' },
      { id: 'br-2', title: 'Vote the Bluffer', body: 'After discussion, each player votes on who had the odd word.' },
    ],
  },
];

export const tutorialsById = Object.fromEntries(tutorialScripts.map((tutorial) => [tutorial.id, tutorial]));
