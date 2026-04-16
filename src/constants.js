export const EXCHANGES = {
    binance: {
        name: 'Binance',
        short: 'BN',
        color: '#F3BA2F',
        logo: 'https://www.google.com/s2/favicons?domain=binance.com&sz=32',
        futuresUrl: (sym) => `https://www.binance.com/en/futures/${sym}USDT`,
        spotUrl:    (sym) => `https://www.binance.com/en/trade/${sym}_USDT`,
    },
    bingx: {
        name: 'BingX',
        short: 'BX',
        color: '#1DA2B4',
        logo: 'https://www.google.com/s2/favicons?domain=bingx.com&sz=32',
        futuresUrl: (sym) => `https://bingx.com/en/perpetual/${sym}-USDT/`,
        spotUrl:    (sym) => `https://bingx.com/en/spot/${sym}-USDT/`,
    },
    bitget: {
        name: 'Bitget',
        short: 'BG',
        color: '#00F0FF',
        logo: 'https://www.google.com/s2/favicons?domain=bitget.com&sz=32',
        futuresUrl: (sym) => `https://www.bitget.com/futures/usdt/${sym}USDT`,
        spotUrl:    (sym) => `https://www.bitget.com/spot/${sym}USDT`,
    },
    bybit: {
        name: 'Bybit',
        short: 'BB',
        color: '#F7A600',
        logo: 'https://www.google.com/s2/favicons?domain=bybit.com&sz=32',
        futuresUrl: (sym) => `https://www.bybit.com/trade/usdt/${sym}USDT`,
        spotUrl:    (sym) => `https://www.bybit.com/en/trade/spot/${sym}/USDT`,
    },
    kucoin: {
        name: 'KuCoin',
        short: 'KC',
        color: '#00A550',
        logo: 'https://www.google.com/s2/favicons?domain=kucoin.com&sz=32',
        futuresUrl: (sym) => `https://www.kucoin.com/futures/trade/${sym}USDTM`,
        spotUrl:    (sym) => `https://www.kucoin.com/trade/${sym}-USDT`,
    },
    gate: {
        name: 'Gate',
        short: 'GT',
        color: '#2354E6',
        logo: 'https://www.google.com/s2/favicons?domain=gate.io&sz=32',
        futuresUrl: (sym) => `https://www.gate.io/futures_trade/USDT/${sym}_USDT`,
        spotUrl:    (sym) => `https://www.gate.io/trade/${sym}_USDT`,
    },
    mexc: {
        name: 'MEXC',
        short: 'MX',
        color: '#00B897',
        logo: 'https://www.google.com/s2/favicons?domain=mexc.com&sz=32',
        futuresUrl: (sym) => `https://futures.mexc.com/exchange/${sym}_USDT`,
        spotUrl:    (sym) => `https://www.mexc.com/exchange/${sym}_USDT`,
    },
    okx: {
        name: 'OKX',
        short: 'OK',
        color: '#FFFFFF',
        logo: 'https://www.google.com/s2/favicons?domain=okx.com&sz=32',
        futuresUrl: (sym) => `https://www.okx.com/trade-swap/${sym.toLowerCase()}-usdt-swap`,
        spotUrl:    (sym) => `https://www.okx.com/trade-spot/${sym.toLowerCase()}-usdt`,
    },
    
}

export const SORT_OPTIONS = [
    {value: 'spread', label: 'По спреду'},
    {value: 'age', label: 'По возрасу'},
    {value: 'volume', label: 'По объёму'},
]

export const TABS = [
    {id: 'main', label: 'Home', enabled: false},
    {id: 'futures', label: 'Futures', enabled: true},
    {id: 'funding', label: 'Funding', enabled: false},
    {id: 'promo', label: 'Training', enabled: false},
    {id: 'developers', label: 'Developers', enabled: true},
]