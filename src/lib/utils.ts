export const toHexPrefixedWith0x = (n: Number, { pad = false } = {}) => {
  let str = n.toString(16)
  if (pad && str.length % 2 != 0) {
    str = `0${str}`
  }
  return `0x${str}`
}

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
