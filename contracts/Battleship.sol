// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Battleship {
  // game state
  enum GameState {
    NeedPlayer2, 
    Playing,
    RevealMoves,
    RevealBoard,
    Over
  }

  // player state
  enum PlayerState {
    NeedOpponent,
    Playing,
    RevealedMoves,
    RevealedBoard
  }

  struct Player {
    // hash of player's board (should be obtained via calculateBoardHash)
    bytes32 boardHash;
    /*
      Since we're doing a 16x16 grid that's 256 spaces, so a 256-bit integer
      will more than suffice for storing all the moves made if we use each
      bit of the integer to represent a move on the grid.

      We do this instead of using an array as it results in less storage space
      used as well as for faster board comparision later on.
    */
    uint moves;
    // player's board
    bytes board;
    // no. of hits player has scored against opponent
    uint hits;
    // player state
    PlayerState state;
  }

  struct Game {
    // ship sizes
    bytes ships;
    // no. of rounds in this game
    uint numRounds;
    // board length and width
    uint boardSize;
    // players
    address player1;
    address player2;
    // player data
    mapping(address => Player) players;
    // state
    GameState state;
    // winner
    address winner;
  }

  // all games 
  uint public totalGames;
  mapping(uint => Game) public games;

  // events
  event NewGame(uint gameId);
  event JoinGame(uint gameId);
  event RevealMoves(uint gameId);
  event RevealBoard(uint gameId);
  event GameOver(uint gameId);


  /**
   * @dev Start a new game.
   *
   * Whoever calls this is auto-assigned as player 1.
   *
   * @param ships_ the ship sizes
   * @param boardSize_ the width and height of the board square
   * @param numRounds_ the number of goes each player gets in total
   * @param boardHash_ Hash of player 1's board
   */
  function newGame(bytes memory ships_, uint boardSize_, uint numRounds_, bytes32 boardHash_) external {
    require(1 <= ships_.length);
    require(2 <= boardSize_ && 16 >= boardSize_);
    require(1 <= numRounds_ && (boardSize_ * boardSize_) >= numRounds_);
    // setup game
    totalGames += 1;
    
    Game storage g = games[totalGames];
    g.ships = ships_;
    g.numRounds = numRounds_;
    g.boardSize = boardSize_;
    g.player1 = msg.sender;
    g.state = GameState.NeedPlayer2;

    Player storage p1 = g.players[g.player1];
    p1.boardHash = boardHash_;
    p1.state = PlayerState.NeedOpponent;

    emit NewGame(totalGames);
  }


  /**
   * @dev Join a game.
   *
   * @param boardHash_ Hash of player's board
   */
  function join(uint gameId_, bytes32 boardHash_) external {
    Game storage g = games[gameId_];
    require(g.player1 != address(0) && g.state == GameState.NeedPlayer2, "game in wrong state");
    // add player
    g.player2 = msg.sender;
    Player storage p2 = g.players[g.player2];
    p2.boardHash = boardHash_;
    p2.state = PlayerState.Playing;
    // update states
    g.state = GameState.Playing;
    Player storage p1 = g.players[g.player1];
    p1.state = PlayerState.Playing;

    emit JoinGame(gameId_);
  }


  /**
   * @dev Reveal moves.
   *
   * The moves are represented a 256-bit uint. For a given move (x, y) the
   * bit position is calculated as 2^(boardSize * x + y)
   *
   * @param moves_ The moves by the caller (each bit represents a move)
   */
  function revealMoves(uint gameId_, uint moves_) external {
    Game storage g = games[gameId_];
    
    // check that games is in correct state
    require(g.state == GameState.Playing || g.state == GameState.RevealMoves, "game in wrong state");

    // check that it's a valid player who hasn't yet revealed moves
    Player storage p = g.players[msg.sender];
    require(p.state == PlayerState.Playing, "player in wrong state");

    // no. of moves should not be more than max rounds, but can be less since
    // player may have already sunk all of opponent's ships early on
    require(countBits(moves_) == g.numRounds);

    // update player
    p.moves = moves_;
    p.state = PlayerState.RevealedMoves;
    g.state = GameState.RevealMoves;

    address opponent = (msg.sender == g.player1) ? g.player2 : g.player1;

    // if opponent has also already revealed moves then update game state
    Player storage pOpp = g.players[opponent];
    if (pOpp.state == PlayerState.RevealedMoves) {
      g.state = GameState.RevealBoard;
    }

    emit RevealMoves(gameId_);
  }


  /**
   * @dev Reveal board.
   *
   * The board array is an array of triplets, whereby each triplet represents
   * a ship, specifying (x,y,isVertical).
   *
   * @param board_ This player's board as an array
   */
  function revealBoard(uint gameId_, bytes calldata board_) external {
    Game storage g = games[gameId_];

    // check game state
    require(g.state == GameState.RevealBoard, "game in wrong state");
    // check that it's a valid player who hasn't yet revealed their board
    Player storage p = g.players[msg.sender];
    require(p.state == PlayerState.RevealedMoves, "player in wrong state");

    // board hash must match
    require(p.boardHash == calculateBoardHash(g.ships, g.boardSize, board_));

    // update player]
    p.board = board_;
    p.state = PlayerState.RevealedBoard;

    address opponent = (g.player1 == msg.sender) ? g.player2 : g.player1;

    // calculate opponent's hits
    Player storage pOpp = g.players[opponent];
    calculateAndUpdateHits(g, p, pOpp);

    emit RevealBoard(gameId_);

    // if opponent has also already revealed board then update game state
    if (pOpp.state == PlayerState.RevealedBoard) {
      g.state = GameState.Over;
      g.winner = p.hits > pOpp.hits ? msg.sender : opponent;

      emit GameOver(gameId_);
    }
  }
  
  
  // PRIVATE/INTERNAL METHODS
  

  /**
   * @dev Calculate no. of hits for a player and update their hits prop.
   *
   * @param  revealer_ The player whose board to check against.
   * @param  mover_ The opponent player whose hits to calculate.
   */
  function calculateAndUpdateHits(Game storage game_, Player storage revealer_, Player storage mover_) private {
    // now let's count the hits for the mover and check board validity in one go
    mover_.hits = 0;

    for (uint ship = 0; game_.ships.length > ship; ship += 1) {
      // extract ship info
      uint index = 3 * ship;
      uint x = uint8(revealer_.board[index]);
      uint y = uint8(revealer_.board[index + 1]);
      bool isVertical = (0 < uint8(revealer_.board[index + 2]));
      uint shipSize = uint8(game_.ships[ship]);

      // now let's see if there are hits
      while (0 < shipSize) {
        // did mover_ hit this position?
          if (0 != (calculateMove(game_.boardSize, x, y) & mover_.moves)) {
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

  /**
   * @dev Count no. of its in given number.
   *
   * Algorithm: http://graphics.stanford.edu/~seander/bithacks.html#CountBitsSetKernighan
   *
   * @param num_ Number to count bits in.
   * @return no. of bits
   */
  function countBits(uint num_) internal pure returns (uint) {
    uint c;

    for (c = 0; 0 < num_; num_ >>= 1) {
      c += (num_ & 1);
    }

    return c;
  }


  /**
   * @dev Calculate the bitwise position of given XY coordinate.
   *
   * @param boardSize_ board size
   * @param x_ X coordinate
   * @param y_ Y coordinate
   * @return position in array
   */
  function calculateMove(uint boardSize_, uint x_, uint y_) internal pure returns (uint) {
      return 2 ** (x_ * boardSize_ + y_);
  }


  /**
   * @dev Calculate board hash.
   *
   * This will check that the board is valid before calculating the hash
   *
   * @param ships_ Array representing ship sizes
   * @param boardSize_ Size of board's sides
   * @param board_ Array representing the board
   * @return the SHA3 hash
   */
  function calculateBoardHash(bytes memory ships_, uint boardSize_, bytes memory board_) internal pure returns (bytes32) {
    uint marked = 0;

    // check that board setup is valid
    for (uint s = 0; ships_.length > s; s += 1) {
      // extract ship info
      uint index = 3 * s;
      uint x = uint8(board_[index]);
      uint y = uint8(board_[index + 1]);
      bool isVertical = (0 < uint8(board_[index + 2]));
      uint shipSize = uint8(ships_[s]);
      // check validity of ship position
      require(0 <= x && boardSize_ > x);
      require(0 <= y && boardSize_ > y);
      require(boardSize_ >= ((isVertical ? x : y) + shipSize));
      // check that ship does not conflict with other ships on the board
      uint endX = x + (isVertical ? shipSize : 1);
      uint endY = y + (isVertical ? 1 : shipSize);
      while (endX > x && endY > y) {
        uint pos = calculateMove(boardSize_, x, y);
        // ensure no ship already sits on this position
        require((pos & marked) == 0);
        // update position bit
        marked = marked | pos;

        x += (isVertical ? 1 : 0);
        y += (isVertical ? 0 : 1);
      }
    }

    return keccak256(board_);
  }
}