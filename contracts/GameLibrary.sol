// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

library GameLibrary {
  /**
   * Count no. of its in given number.
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
   * Calculate the bitwise position of given XY coordinate.
   * @param boardSize_ board size
   * @param x_ X coordinate
   * @param y_ Y coordinate
   * @return position in array
   */
  function calculateMove(uint boardSize_, uint x_, uint y_) internal pure returns (uint) {
      return 2 ** (x_ * boardSize_ + y_);
  }


  /**
   * Calculate board hash.
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