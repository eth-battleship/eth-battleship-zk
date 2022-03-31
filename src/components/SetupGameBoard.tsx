import React from 'react'

import GameBoard from './GameBoard'
import Ship from './Ship'


export const SetupGameBoard: React.FunctionComponent = () => {

}


export default class SetupGameBoard extends PureComponent {
  static propTypes = {
    boardLength: PropTypes.number.isRequired,
    shipLengths: PropTypes.array.isRequired,
    onPressButton: PropTypes.func.isRequired,
    buttonText: PropTypes.string.isRequired,
    buttonSubmitting: PropTypes.bool,
    className: PropTypes.string
  }

  state = {
    shipPositions: {},
    selectedShip: null
  }

  render() {
    const { buttonSubmitting, className, boardLength, shipLengths, buttonText } = this.props
    const { shipPositions } = this.state

    const allShipsPlaced = (Object.keys(shipPositions).length === shipLengths.length)

    return (
      <div className={cx(styles.container, className)}>
        <div className={styles.selectableShips}>
          {this._renderShipSelector()}
        </div>
        <GameBoard
          boardLength={boardLength}
          shipLengths={shipLengths}
          shipPositions={shipPositions}
          onPress={this._onSelectCell}
          applyHoverStyleToEmptyCell={this._applyHoverStyleToEmptyCell}
        />
        <Button
          submitting={buttonSubmitting}
          className={styles.button}
          disabled={!allShipsPlaced}
          onClick={this._onPress}
        >
          {buttonText}
        </Button>
      </div>
    )
  }

  _renderShipSelector = () => {
    const { shipLengths } = this.props
    const { selectedShip, shipPositions } = this.state

    const selectedShipId = _.get(selectedShip, 'shipId')
    const selectedShipVertical = _.get(selectedShip, 'isVertical')

    const ships = []

    shipLengths.forEach((length, shipId) => {
      // if already placed ship then skip it
      if (shipPositions[shipId]) {
        return
      }

      const onPress = this._buildShipSelector(shipId)

      const styleH = (shipId === selectedShipId && !selectedShipVertical)
        ? { outline: '5px solid #000' }
        : null
      const styleV = (shipId === selectedShipId && selectedShipVertical)
        ? { outline: '5px solid #000' }
        : null

      ships.push(
        <div key={shipId} className={styles.selectableShip}>
          <Ship style={styleH} size={0.5} length={length} isVertical={false} onPress={onPress} />
          {1 < length ? (
            <Ship style={styleV} size={0.5} length={length} isVertical={true} onPress={onPress} />
          ) : null}
        </div>
      )
    })

    return ships
  }

  _buildShipSelector = shipId => isVertical => {
    this.setState({
      selectedShip: {
        shipId, isVertical
      }
    })
  }

  _onSelectCell = (x, y) => {
    const { boardLength, shipLengths } = this.props
    const { shipPositions, selectedShip } = this.state

    let foundShip

    // if there is a ship in this position then remove it
    Object.keys(shipPositions).forEach(id => {
      if (shipSitsOn(shipPositions[id], shipLengths[id], x, y)) {
        foundShip = id
      }
    })

    if (foundShip) {
      delete shipPositions[foundShip]

      this.setState({
        shipPositions: {
          ...shipPositions
        }
      })
    }
    // no ship at position, so let's add one!
    else if (selectedShip) {
      const { shipId, isVertical } = selectedShip

      if (shipCanBePlaced(boardLength, shipPositions, shipLengths, shipId, isVertical, x, y)) {
        this.setState({
          selectedShip: null,
          shipPositions: {
            ...shipPositions,
            [shipId]: {
              x, y, isVertical
            }
          }
        })
      }
    }
  }

  _applyHoverStyleToEmptyCell = (style, x, y, hoverX, hoverY) => {
    const { boardLength, shipLengths } = this.props
    const { shipPositions, selectedShip } = this.state

    if (selectedShip) {
      const { shipId, isVertical } = selectedShip

      if (shipCanBePlaced(
        boardLength, shipPositions, shipLengths, shipId, isVertical, hoverX, hoverY
      )) {
        const { x: endX, y: endY } =
          calculateShipEndPoint(hoverX, hoverY, isVertical, shipLengths[shipId])

        // if current cell intersects potential ship position
        if ((hoverX <= x && endX >= x) && (hoverY <= y && endY >= y)) {
          const color = getColor(shipLengths[selectedShip.shipId])

          style.border = `1px solid ${color}`
          style.backgroundColor = color
        }
      } else if (x === hoverX && y === hoverY) {
        style.backgroundColor = '#efefef'
      }
    }
  }

  _onPress = () => {
    const { onPressButton } = this.props

    onPressButton(this.state)
  }
}