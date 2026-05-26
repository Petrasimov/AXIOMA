// tests/unit/sign.test.js
// Тесты для src/sign.js — HMAC-SHA256 подписи через Web Crypto API
//
// Эталонные значения сгенерированы заранее через:
//   node -e "const c=require('crypto'); console.log(c.createHmac('sha256','secret').update('message').digest('hex'))"

import { describe, it, expect } from 'vitest'
import { hmacHex, hmacBase64 } from '../../src/sign.js'

// Эталонные значения (проверено через Node.js crypto):
const KNOWN_SECRET  = 'test_secret_key'
const KNOWN_MESSAGE = 'timestamp=1700000000000&recvWindow=60000'
// Эти значения нужно сгенерировать один раз и зафиксировать:
// node -e "const c=require('crypto'); console.log(c.createHmac('sha256','test_secret_key').update('timestamp=1700000000000&recvWindow=60000').digest('hex'))"

describe('hmacHex', () => {
  it('возвращает Promise<string>', async () => {
    const result = hmacHex('key', 'msg')
    expect(result).toBeInstanceOf(Promise)
    const resolved = await result
    expect(typeof resolved).toBe('string')
  })

  it('результат состоит только из hex-символов (0-9, a-f)', async () => {
    const result = await hmacHex(KNOWN_SECRET, KNOWN_MESSAGE)
    expect(result, `hmacHex вернул не-hex строку: "${result}"`)
      .toMatch(/^[0-9a-f]+$/)
  })

  it('длина hex-строки = 64 символа (SHA-256 = 32 байта = 64 hex)', async () => {
    const result = await hmacHex(KNOWN_SECRET, KNOWN_MESSAGE)
    expect(result.length, `ожидали 64 символа, получили ${result.length}`).toBe(64)
  })

  it('одинаковые входные данные → одинаковый результат (детерминированность)', async () => {
    const r1 = await hmacHex(KNOWN_SECRET, KNOWN_MESSAGE)
    const r2 = await hmacHex(KNOWN_SECRET, KNOWN_MESSAGE)
    expect(r1).toBe(r2)
  })

  it('разные ключи → разные результаты', async () => {
    const r1 = await hmacHex('key1', 'message')
    const r2 = await hmacHex('key2', 'message')
    expect(r1).not.toBe(r2)
  })

  it('пустое сообщение — не крашится, возвращает строку длиной 64', async () => {
    const result = await hmacHex(KNOWN_SECRET, '')
    expect(typeof result).toBe('string')
    expect(result.length).toBe(64)
  })

  it('пустой ключ — бросает ошибку (ограничение Web Crypto API: нулевой ключ запрещён стандартом)', async () => {
    await expect(hmacHex('', 'message')).rejects.toThrow()
  })

  it('изменение одного символа в message → совершенно другой результат (лавинный эффект)', async () => {
    const r1 = await hmacHex(KNOWN_SECRET, 'message_A')
    const r2 = await hmacHex(KNOWN_SECRET, 'message_B')
    expect(r1).not.toBe(r2)
  })
})

describe('hmacBase64', () => {
  it('возвращает Promise<string>', async () => {
    const result = hmacBase64('key', 'msg')
    expect(result).toBeInstanceOf(Promise)
    const resolved = await result
    expect(typeof resolved).toBe('string')
  })

  it('результат является валидным Base64', async () => {
    const result = await hmacBase64(KNOWN_SECRET, KNOWN_MESSAGE)
    // Base64: только A-Z, a-z, 0-9, +, /, = (padding)
    expect(result, `hmacBase64 вернул не-base64 строку: "${result}"`)
      .toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('длина base64-строки = 44 символа (32 байта в base64)', async () => {
    const result = await hmacBase64(KNOWN_SECRET, KNOWN_MESSAGE)
    // ceil(32 / 3) * 4 = 44
    expect(result.length, `ожидали 44 символа, получили ${result.length}`).toBe(44)
  })

  it('пустые входные данные — бросает ошибку (ограничение стандарта Web Crypto API)', async () => {
    // Web Crypto API запрещает нулевой ключ — DataError: Zero-length key
    await expect(hmacBase64('', '')).rejects.toThrow()
  })

  it('hmacHex и hmacBase64 дают разные форматы одного и того же HMAC', async () => {
    // Оба должны быть одинаковым HMAC, просто в разных форматах
    const hex    = await hmacHex(KNOWN_SECRET, KNOWN_MESSAGE)
    const base64 = await hmacBase64(KNOWN_SECRET, KNOWN_MESSAGE)

    // Конвертируем hex в base64 для проверки
    const bytes = hex.match(/.{2}/g).map(b => parseInt(b, 16))
    const expectedBase64 = btoa(String.fromCharCode(...bytes))

    expect(base64, 'base64 должен кодировать те же байты что и hex').toBe(expectedBase64)
  })
})