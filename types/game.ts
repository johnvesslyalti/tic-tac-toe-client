export interface GameState {
  board: (string | null)[];
  currentPlayer: "X" | "O";
  winner: string | null;
  players: { [userId: string]: "X" | "O" };
  presences: { [userId: string]: unknown };
  gameStarted: boolean;
  endTicks: number;
}

export const OpCode = {
  MOVE: 1,
  UPDATE: 2,
  REJECTED: 3,
};
