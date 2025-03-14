const { tokensBare, } = require('./tokenMapping')
const { log } = require('./utils')
const { nullAddress } = require('./unwrapLPs')
const { sumTokensExport } = require('../helper/sumTokens')
const sdk = require('@defillama/sdk')

const defaultTokens = {
  ethereum: [
    nullAddress,
    tokensBare.usdt,
    tokensBare.usdc,
    tokensBare.link,
    tokensBare.dai,
    tokensBare.wbtc,
    '0x0000000000085d4780B73119b644AE5ecd22b376', // TUSD
    '0x4fabb145d64652a948d72533023f6e7a623c7c53', // BUSD
    '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', // MATIC
    '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', // SHIBA INU
    '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b', // CRO
    '0x9be89d2a4cd102d8fecc6bf9da793be995c22541',  // BBTC
    '0x7a58c0be72be218b41c608b7fe7c5bb630736c71',  // PEOPLE
    '0x69af81e73a73b40adf4f3d4223cd9b1ece623074',  // MASK
    '0x9d65ff81a3c488d585bbfb0bfe3c7707c7917f54',  // SSV
    '0x111111111117dc0aa78b770fa6a738034120c302',  // 1INCH
    '0x3597bfd533a99c9aa083587b074434e61eb0a258',  // DENT
    '0x8a2279d4a90b6fe1c4b30fa660cc9f926797baa2',  // CHR
    '0x5a98fcbea516cf06857215779fd812ca3bef1b32',  // LIDO
    '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',  // MKR
    '0xd533a949740bb3306d119cc777fa900ba034cd52',  // CRV
    '0x92d6c1e31e14520e676a687f0a93788b716beff5',  // DYDX
    '0x4e15361fd6b4bb609fa63c81a2be19d873717870',  // FTM
    '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',  // SUSHI
    '0x15d4c048f83bd7e37d49ea4c83a07267ec4203da', // GALA
    '0x3845badade8e6dff049820680d1f14bd3903a5d0',  // SAND
    '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',  // MANA
    '0x3506424f91fd33084466f402d5d97f05f8e3b4af',  // CHZ
    '0x4d224452801aced8b2f0aebe155379bb5d594381',  // APE
    '0x6c6ee5e31d828de241282b9606c8e98ea48526e2',  // HOT
    '0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c',  // ENJ
    '0xbbbbca6a901c926f240b89eacb641d8aec7aeafd',  // LRC
    '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72',  // ENS
    '0x45804880de22913dafe09f4980848ece6ecbaf78',  // PAXG
    '0xf411903cbc70a74d22900a5de66a2dda66507255',  // VRA
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',  // UNI
    '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',  // AAVE
    '0xc944e90c64b2c07662a292be6244bdf05cda44a7',  // GRT
    '0x4a220e6096b25eadb88358cb44068a3248254675',  // QNT
    '0xf34960d9d60be18cC1D5Afc1A6F012A723a28811',  // KCS
    '0xa2cd3d43c775978a96bdbf12d733d5a1ed94fb18',  //XCN
  ],
  tron: [
    nullAddress,
    'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT
    'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',  // USDC
  ],
  polygon: [
    nullAddress,
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
    '0x0000000000000000000000000000000000001010', // WMATIC
  ],
  algorand: [],
  solana: [],
  bsc: [
    nullAddress,
    '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', // BTCB
    '0x2170ed0880ac9a755fd29b2688956bd959f933f8', // BTCE
    '0xfd5840cd36d94d7229439859c0112a4185bc0255', // vUSDT
    '0x250632378e573c6be1ac2f97fcdf00515d0aa91b', // BETH
    '0x95c78222b3d6e262426483d42cfa53685a67ab9d', // vBUSD
    '0x7083609fce4d1d8dc0c979aab8c869ea2c873402', // BDOT
    '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', // CAKE
    '0x55d398326f99059ff775485246999027b3197955', // BUSDT
    '0xe9e7cea3dedca5984780bafc599bd69add087d56', // BUSD
    '0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe', // BXRP
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // B-USDC
    '0x14016e85a25aeb13065688cafb43044c2ef86784', // B-TUSD
  ],
  eos: [
    ["eosio.token", "EOS", "eos"],
    ["tethertether", "USDT", "tether"],
  ],
  arbitrum: [
    nullAddress,
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', // USDC
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT
  ],
  avax: [
    nullAddress,
    '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', // USDT
  ],
  near: [
    'usdt.tether-token.near',
  ],
}

function cexExports(config) {
  const chains = Object.keys(config).filter(i => i !== 'bep2')
  const exportObj = {
    timetravel: false,
  }
  chains.forEach(chain => {
    let { tokensAndOwners, owners, tokens } = config[chain]

    if (!tokensAndOwners && !tokens) {
      tokens = defaultTokens[chain]
      if (!tokens) {
        log(chain, 'Missing default token list, counting only native token balance',)
        tokens = [nullAddress]
      }
    }

    const options = { ...config[chain], owners, tokens, chain }
    if (chain === 'solana')  options.solOwners = owners
    exportObj[chain] = { tvl: sumTokensExport(options) }
  })
  if (config.bep2) {
    const bscTvl = exportObj.bsc.tvl
    exportObj.bsc.tvl = sdk.util.sumChainTvls([
      bscTvl, sumTokensExport({ chain: 'bep2', ...config.bep2 })
    ])
  }
  return exportObj
}

module.exports = {
  cexExports,
}
