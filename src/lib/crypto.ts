import { Base64 } from 'js-base64'

const enc = new TextEncoder()

const cached: Record<string, CryptoKey> = {}

const deriveKey = async (password: string, salt: ArrayBuffer): Promise<CryptoKey> => {
  const cacheKey = `${password}${Base64.fromUint8Array(new Uint8Array(salt))}`

  if (!cached[cacheKey]) {
    const imported = await global.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    )

    const ret = await global.crypto.subtle.deriveKey(
      {
        "name": "PBKDF2",
        salt,
        "iterations": 10,
        "hash": "SHA-256"
      },
      imported,
      { "name": "AES-GCM", "length": 256 },
      true,
      ["encrypt", "decrypt"]
    )

    cached[cacheKey] = ret
  }

  return cached[cacheKey]
}

export interface CipherText {
  text: string,
  salt: string,
  iv: string,
}

export const encrypt = async (password: string, data: object): Promise<CipherText> => {
  const salt = await global.crypto.getRandomValues(new Uint8Array(16))
  const iv = await global.crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)

  const plaintext = Base64.toUint8Array(Base64.toBase64(JSON.stringify(data)))

  const ret = await global.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    plaintext
  )

  return {
    text: Base64.fromUint8Array(new Uint8Array(ret)),
    salt: Base64.fromUint8Array(salt),
    iv: Base64.fromUint8Array(iv),
  }
}


export const decrypt = async (password: string, ciphertext: CipherText): Promise<object> => {
  const iv = Base64.toUint8Array(ciphertext.iv)
  const salt = Base64.toUint8Array(ciphertext.salt)
  const key = await deriveKey(password, salt)

  const plaintext = await global.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    Base64.toUint8Array(ciphertext.text),
  )

  const b64 = Base64.fromUint8Array(new Uint8Array(plaintext))

  return JSON.parse(Base64.fromBase64(b64))
}


// @ts-ignore
// window.c = { encrypt, decrypt }


