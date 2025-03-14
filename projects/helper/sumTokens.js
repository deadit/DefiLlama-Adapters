const { ibcChains, getUniqueAddresses} = require('./tokenMapping')
const { log,  } = require('./utils')
const { get } = require('./http')
const { sumTokens2: sumTokensEVM, } = require('./unwrapLPs')
const sdk = require('@defillama/sdk')

const helpers = {
  "tron": require("./tron"),
  "eos": require("./eos"),
  "cardano":require("./cardano"),
  "algorand":require("./algorand"),
  "cosmos":require("./cosmos"),
  "solana":require("./solana"),
  "aptos":require("./aptos"),
  "tezos":require("./tezos"),
  "zilliqa":require("./zilliqa"),
  "near":require("./near"),
  "bitcoin":require("./bitcoin"),
  "litecoin":require("./litecoin"),
  "polkadot":require("./polkadot"),
}

const geckoMapping = {
  bep2: 'binancecoin',
  elrond: 'elrond-erd-2',
}

const specialChains = Object.keys(geckoMapping)

async function getBalance(chain, account) {
  switch (chain) {
    case 'elrond':
      return (await get(`https://gateway.elrond.com/address/${account}`)).data.account.balance / 1e18
    case 'bep2':
      const balObject = (await get(`https://api-binance-mainnet.cosmostation.io/v1/account/${account}`)).balances.find(i => i.symbol === 'BNB')
      return +(balObject?.free ?? 0)
    default: throw new Error('Unsupported chain')
  }
}

function sumTokensExport(options) {
  const {chain} = options
  if (!chain) throw new Error('Missing chain info')
  return async (_, _b, {[chain]: block}) => sumTokens({ block, ...options})
}

async function sumTokens(options) {
  let { chain, owner, owners = [], tokens = [], tokensAndOwners = [], blacklistedTokens = [], balances = {}, } = options 

  if (!helpers[chain] && !specialChains.includes(chain))
    return sumTokensEVM(options)

  owners = getUniqueAddresses(owners, chain)
  blacklistedTokens = getUniqueAddresses(blacklistedTokens, chain)
  if (!['eos'].includes(chain))
    tokens = getUniqueAddresses(tokens, chain).filter(t => !blacklistedTokens.includes(t))

  if (!tokensAndOwners.length) {
    if (!owners.length && owner)
      owners = [owner]
    
    tokensAndOwners = tokens.map(t => owners.map(o => ([t, o]))).flat()
  }

  options.tokensAndOwners = getUniqueToA(tokensAndOwners, chain)
  options.owners = owners
  options.tokens = tokens
  options.blacklistedTokens = blacklistedTokens
  let helper = helpers[chain]

  if (ibcChains.includes(chain)) helper = helpers.cosmos

  if(helper) {
    switch(chain) {
      case 'solana': return helper.sumTokens2(options)
      case 'eos': return helper.get_account_tvl(owners, tokens, 'eos')
      case 'tezos': options.includeTezos = true; break;
    }

    return helper.sumTokens(options)
  } else if (!specialChains.includes(chain)) {
    throw new Error('chain handler missing!!!')
  }

  const geckoId = geckoMapping[chain]
  const balanceArray = await Promise.all(owners.map(i => getBalance(chain, i)))
  sdk.util.sumSingleBalance(balances,geckoId,balanceArray.reduce((a, i) => a + +i, 0))
  return balances

  function getUniqueToA(toa, chain) {
    toa = toa.map(i => i.join('¤'))
    return getUniqueAddresses(toa, chain).map(i => i.split('¤'))
  }
}

module.exports = {
  sumTokensExport,
  sumTokens,
}
