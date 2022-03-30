// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./GameLibrary.sol";

contract Game {
    /** Ship sizes */
    bytes public ships;

    /**
     * Max. no of moves each player gets
     */
  uint public maxRounds;
  /**
   * Board is a square, each side of this size.
   *
   * Note: Due to how we record player moves (by marking bits of a uint) the max board size is 16 (= sqrt(256)).
   */
  uint public boardSize;

  enum GameState {
      NeedOpponent,
      Playing,
      RevealMoves,
      RevealBoard,
      Over
  }

  enum PlayerState {
    Ready,
    Playing,
    RevealedMoves,
    RevealedBoard
  }


  event JoinGame(address player);
  event RevealMoves(address player);
  event RevealBoard(address player);


  struct Player {
      // player's board (will be set later)
      bytes board;
      // hash of player's board (should be obtained via calculateBoardHash)
      bytes32 boardHash;
      /*
       Since we're doing a 10x10 grid that's 100 spaces, so a 256-bit integer
       will more than suffice for storing all the moves made if we use each
       bit of the integer to represent a move on the grid.

       We do this instead of using an array as it results in less storage space
       used as well as for faster board comparision later on.
      */
      uint moves;
      // no. of hits player has scored against opponent
      uint hits;
      // player state
      PlayerState state;
  }

  // players
  mapping (address => Player) public players;
  address public player1;
  address public player2;

  // current game state
  GameState public state;

  /**
   * Check that the game can be revealed and that the
   * current sender is a player who is yet to call reveal()
   */
  modifier canRevealMoves () {
      require(state == GameState.Playing || state == GameState.RevealMoves);
      // check that it's a valid player who hasn't yet revealed moves
      require(players[msg.sender].state == PlayerState.Playing);
      _;
  }


  /**
   * Check that boards can be revealed.
   */
  modifier canRevealBoard () {
    require(state == GameState.RevealMoves || state == GameState.RevealBoard);
    // check that it's a valid player who hasn't yet revealed their board
    require(players[msg.sender].state == PlayerState.RevealedMoves);
    _;
  }


  /**
   * Check that game can be joined.
   */
  modifier canJoin () {
    require(state == GameState.NeedOpponent);
    require(address(0) == player2);
    require(msg.sender != player1);
    _;
  }


  /**
   * Initialize the game.
   * @param ships_ the ship sizes
   * @param boardSize_ the width and height of the board square
   * @param maxRounds_ the number of goes each player gets in total
   * @param boardHash_ Hash of player's board
   */
  constructor (bytes memory ships_, uint boardSize_, uint maxRounds_, bytes32 boardHash_) {
    require(1 <= ships_.length);
    require(2 <= boardSize_ && 16 >= boardSize_);
    require(1 <= maxRounds_ && (boardSize_ * boardSize_) >= maxRounds_);
    // setup game
    ships = ships_;
    maxRounds = maxRounds_;
    boardSize = boardSize_;
    // setup player
    player1 = msg.sender;
    players[player1].boardHash = boardHash_;
    players[player1].state = PlayerState.Playing;
    // game state
    state = GameState.NeedOpponent;
  }


  /**
   * Join the game
   * @param boardHash_ Hash of player's board
   */
  function join(bytes32 boardHash_)
    public
    canJoin()
  {
    // add player
    player2 = msg.sender;
    players[player2].boardHash = boardHash_;
    players[player2].state = PlayerState.Playing;
    // game state
    state = GameState.Playing;
    // log
    emit JoinGame(player2);
  }


  /**
   * Reveal moves.
   * The moves are represented a 256-bit uint. For a given move (x, y) the
   * bit position is calculated as 2^(boardSize * x + y)
   *
   * @param moves_ The moves by this player (each bit represents a move)
   */
  function revealMoves(uint moves_)
    public
    canRevealMoves()
  {
    // no. of moves should not be more than max rounds, but can be less since
    // player may have already sunk all of opponent's ships early on
    require(GameLibrary.countBits(moves_) <= maxRounds);

    // update player
    players[msg.sender].moves = moves_;
    players[msg.sender].state = PlayerState.RevealedMoves;
    state = GameState.RevealMoves;

    address opponent = (msg.sender == player1) ? player2 : player1;

    // if opponent has also already revealed moves then update game state
    if (players[opponent].state == PlayerState.RevealedMoves) {
      state = GameState.RevealBoard;
    }

    // log
    emit RevealMoves(msg.sender);
  }


  /**
   * Reveal board.
   *
   * The board array is an array of triplets, whereby each triplet represents
   * a ship, specifying (x,y,isVertical).
   *
   * @param board_ This player's board as an array
   */
  function revealBoard(bytes calldata board_)
    public
    canRevealBoard()
  {
    // board hash must match
    require(players[msg.sender].boardHash == GameLibrary.calculateBoardHash(ships, boardSize, board_));

    // update player
    players[msg.sender].board = board_;
    players[msg.sender].state = PlayerState.RevealedBoard;

    address opponent = (player1 == msg.sender) ? player2 : player1;

    // calculate opponent's hits
    calculateHits(players[msg.sender], players[opponent]);

    // if opponent has also already revealed board then update game state
    if (players[opponent].state == PlayerState.RevealedBoard) {
      state = GameState.Over;
    }

    // log
    emit RevealBoard(msg.sender);
  }


  /**
   * Calculate no. of hits for a player.
   *
   * @param  revealer_ The player whose board it is
   * @param  mover_ The opponent player whose hits to calculate
   */
  function calculateHits(Player storage revealer_, Player storage mover_) internal {
    // now let's count the hits for the mover and check board validity in one go
    mover_.hits = 0;

    for (uint ship = 0; ships.length > ship; ship += 1) {
        // extract ship info
        uint index = 3 * ship;
        uint x = uint8(revealer_.board[index]);
        uint y = uint8(revealer_.board[index + 1]);
        bool isVertical = (0 < uint8(revealer_.board[index + 2]));
        uint shipSize = uint8(ships[ship]);

        // now let's see if there are hits
        while (0 < shipSize) {
            // did mover_ hit this position?
              if (0 != (GameLibrary.calculateMove(boardSize, x, y) & mover_.moves)) {
                mover_.hits += 1;
            }
            // move to next part of ship
            if (isVertical) {
                x += 1;
            } else {
                y += 1;
            }
            // decrement counter
            shipSize -= 1;
        }
    }
  }


  /*
  ------------------------------------------------------------
  Helper functions
  ------------------------------------------------------------
  */


  /**
   * Convenience method for fetching metadata in a single call.
   */
  function getMetadata() public view returns (
    bytes memory _ships,
    uint _boardSize,
    uint _maxRounds,
    GameState _state,
    address _player1,
    address _player2
  ) {
    _ships = ships;
    _maxRounds = maxRounds;
    _boardSize = boardSize;
    _state = state;
    _player1 = player1;
    _player2 = player2;
  }

}