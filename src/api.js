const cache = {}

function isFresh(key, ttlMs = 55000) {
    return cache[key] && (Date.now() - cache[key].timestamp < ttlMs)
}

function setCache(key, data) {
    cache[key] = { data , timestamp: Date.now() }
}

function getCache(key) {
    return cache[key]?.data
}

export async function fetchBinance(symbol) {
    const key = `binance_${symbol}`
    if (isFresh(key)) return getCache(key)

        try {
            const [tickerRes, fundRes] = await Promise.all([
                fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}USDT`),
                fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}USDT`)
            ])

            const ticker = await tickerRes.json()
            const fund = await fundRes.json()

            const result = {
                funding: parseFloat(fund.lastFundingRate),
                volume: parseFloat(ticker.quoteVolume),
                deposit: true,
                withdraw: true,
                nextFunding: parseInt(fund.nextFundingTime)
            }

            setCache(key, result)
            return result
        } catch (e) {
            console.warn('Binance fetch failed:', symbol, e.message)
            return null
        }
}

export async function fetchBingX(symbol) {
    const key = `bingx_${symbol}`
    if (isFresh(key)) return getCache(key)

    try {
        const [tickerRes, fundRes] = await Promise.all([
            fetch(`/bingx-api/openApi/swap/v2/quote/ticker?symbol=${symbol}-USDT`),
            fetch(`/bingx-api/openApi/swap/v2/quote/premiumIndex?symbol=${symbol}-USDT`)

        ])

        const tickerData = await tickerRes.json()
        const fundData = await fundRes.json()

        const ticker = tickerData.data
        const fund = fundData.data
        if (!ticker || !fund) return null

        const result = {
            funding: parseFloat(fund.lastFundingRate),
            volume: parseFloat(ticker.quoteVolume),
            deposit: true,
            withdraw: true,
            nextFunding: parseInt(fund.nextFundingTime)
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('BingX fetch failed:', symbol, e.message)
        return null
    }
}

export async function fetchBitget(symbol) {
  const key = `bitget_${symbol}`
  if (isFresh(key)) return getCache(key)

  try {
    const res = await fetch(
      `https://api.bitget.com/api/v2/mix/market/ticker?symbol=${symbol}USDT&productType=USDT-FUTURES`
    )
    const data = await res.json()
    const ticker = data.data?.[0]
    if (!ticker) return null

    const result = {
      funding: parseFloat(ticker.fundingRate),
      volume: parseFloat(ticker.usdtVolume),
      deposit: true,
      withdraw: true,
      nextFunding: parseInt(ticker.nextFundingTime)
    }

    setCache(key, result)
    return result
  } catch (e) {
    console.warn('Bitget fetch failed:', symbol, e.message)
    return null
  }
}

export async function fetchBybit(symbol) {
    const key = `bybit_${symbol}`
    if (isFresh(key)) return getCache(key)

    try {
        const res = await fetch(
            `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}USDT`
        )
        const data = await res.json()
        const ticker = data.result.list[0]

        if (!ticker) return null

        const result = {
            funding: parseFloat(ticker.fundingRate),
            volume: parseFloat(ticker.turnover24h),
            deposit: true,
            withdraw: true,
            nextFunding: parseInt(ticker.nextFundingTime)
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('Bybit fetch failed:', symbol, e.message)
        return null
    }
}

export async function fetchGate(symbol) {
    const key = `gate_${symbol}`
    if (isFresh(key)) return getCache(key)

    try {
        const [tickerRes, contractRes, currencyRes] = await Promise.all([
            fetch(`/gate-api/api/v4/futures/usdt/tickers?contract=${symbol}_USDT`),
            fetch(`/gate-api/api/v4/futures/usdt/contracts/${symbol}_USDT`),
            fetch(`/gate-api/api/v4/spot/currencies/${symbol}`)
        ])

        const tickers = await tickerRes.json()
        const contract = await contractRes.json()
        const currency = await currencyRes.json()

        const result = {
            funding: parseFloat(contract.funding_rate),
            volume: parseFloat(tickers[0]?.volume_24h_quote ?? 0),
            deposit: !currency.deposit_disabled,
            withdraw: !currency.withdraw_disabled,
            nextFunding: contract.funding_next_apply ? contract.funding_next_apply * 1000 : null,
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('Gate fetch failed:', symbol, e.message)
        return null
    }
}

export async function fetchKuCoin(symbol) {
    const key = `kucoin_${symbol}`
    if (isFresh(key)) return getCache(key)

    try {
        const res = await fetch(
            `/kucoin-api/api/v1/contracts/${symbol}USDTM`
        )
        const data = await res.json()
        const contract = data.data
        if (!contract) return null

        const result = {
            funding: parseFloat(contract.fundingFeeRate),
            volume: parseFloat(contract.turnoverOf24h),
            deposit: true,
            withdraw: true,
            nextFunding: contract.nextFundingRateTime ? Date.now() + contract.nextFundingRateTime : null,
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('KuCoin fetch failed:', symbol, e.message)
        return null
    }
}

export async function fetchMEXC(symbol) {
    const key = `mexc_${symbol}`
    if (isFresh(key)) return getCache(key)

    try {
        const [tickerRes, fundingRes] = await Promise.all([
            fetch(`/mexc-api/api/v1/contract/ticker?symbol=${symbol}_USDT`),
            fetch(`/mexc-api/api/v1/contract/funding_rate/${symbol}_USDT`)
        ])
        const tickerData = await tickerRes.json()
        const fundingData = await fundingRes.json()

        const ticker = tickerData.data
        const funding = fundingData.data

        if (!ticker) return null

        const result = {
            funding: parseFloat(ticker.fundingRate),
            volume: parseFloat(ticker.amount24),
            deposit: true,
            withdraw: true,
            nextFunding: fundingData?.data?.nextSettleTime ?? null
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('MEXC fetch failed:', symbol, e.message)
        return null
    }
}

export async function fetchOKX(symbol) {
    const key = `okx_${symbol}`
    if (isFresh(key)) return getCache(key)

    try {
        const instId = `${symbol}-USDT-SWAP`

        const [fundRes, tickerRes] = await Promise.all([
            fetch(`https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`),
            fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`)
        ])

        const fund = await fundRes.json()
        const ticker = await tickerRes.json()

        const f = fund.data[0]
        const t = ticker.data[0]

        if (!ticker) return null

        const result = {
            funding: parseFloat(f.fundingRate),
            volume: parseFloat(t.volCcy24h) * parseFloat(t.last),
            deposit: true,
            withdraw: true,
            nextFunding: parseInt(f.fundingTime)
        }

        setCache(key, result)
        return result
    } catch (e) {
        console.warn('OKX fetch failed:', symbol, e.message)
        return null
    }
}

const FETCHERS = {
    binance: fetchBinance,
    bingx: fetchBingX,
    bitget: fetchBitget,
    bybit: fetchBybit, 
    gate: fetchGate,
    kucoin: fetchKuCoin,
    mexc: fetchMEXC,
    okx: fetchOKX,
}

export async function enrichOpportunities(mockOpportunitiesms) {
    const promises = mockOpportunitiesms.map(async (opp) => {
        const sym = opp.symbol.replace(/USDT$/, '')

        const [bidData, askData] = await Promise.all([
            FETCHERS[opp.bid_ex] ? FETCHERS[opp.bid_ex](sym) : null,
            FETCHERS[opp.ask_ex] ? FETCHERS[opp.ask_ex](sym) : null,
        ])

        return {
            ...opp, 
            bid_funding: bidData ? {
                ...opp.bid_funding, 
                rate: bidData.funding * 100,
                next_time: bidData.nextFunding ? Math.floor(bidData.nextFunding / 1000) : opp.bid_funding.next_time
            } : opp.bid_funding, 
            ask_funding: askData ? {
                ...opp.ask_funding, 
                rate: askData.funding * 100,
                next_time: askData.nextFunding ? Math.floor(askData.nextFunding / 1000) : opp.ask_funding.next_time
            } : opp.ask_funding,
            bid_volume: bidData?.volume ?? opp.bid_volume,
            ask_volume: askData?.volume ?? opp.ask_volume,
            bid_transfer: bidData
                ? { deposit: bidData.deposit, withdraw: bidData.withdraw}
                : opp.bid_transfer,
            ask_transfer: askData
                ? { deposit: askData.deposit, withdraw: askData.withdraw}
                : opp.ask_transfer,
            next_funding : bidData?.nextFunding ?? askData?.nextFunding ?? opp.nextFunding,
        }
    })

    return Promise.all(promises)
}