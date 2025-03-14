// documentation: https://developer.algorand.org/docs/get-details/indexer/?from_query=curl#sdk-client-instantiations

const axios = require('axios')
const { getApplicationAddress } = require('./algorandUtils/address')
const { RateLimiter } = require("limiter");
const { fixBalancesTokens } = require('../helper/tokenMapping')
const { getFixBalancesSync } = require('../helper/portedTokens')
const sdk = require('@defillama/sdk');
const { default: BigNumber } = require('bignumber.js');
const stateCache = {}
const accountCache = {}
const assetCache = {}

const geckoMapping = fixBalancesTokens.algorand
const axiosObj = axios.create({
  baseURL: 'https://algoindexer.algoexplorerapi.io',
  timeout: 300000,
})

const indexerLimiter = new RateLimiter({ tokensPerInterval: 10, interval: "second" });

async function lookupApplications(appId) {
  return (await axiosObj.get(`/v2/applications/${appId}`)).data
}

async function lookupAccountByID(accountId) {
  return (await axiosObj.get(`/v2/accounts/${accountId}`)).data
}

async function searchAccounts({ appId, limit = 1000, nexttoken, }) {
  const response = (await axiosObj.get('/v2/accounts', {
    params: {
      'application-id': appId,
      limit,
      next: nexttoken,
    }
  }))
  return response.data
}


async function searchAccountsAll({ appId, limit = 1000 }) {
  const accounts = []
  let nexttoken
  do {
    const res = await searchAccounts({ appId, limit, nexttoken, })
    nexttoken = res['next-token']
    accounts.push(...res.accounts)
  } while (nexttoken)
  return accounts
}

const withLimiter = (fn, tokensToRemove = 1) => async (...args) => {
  await indexerLimiter.removeTokens(tokensToRemove);
  return fn(...args);
}

async function sumTokens({ owner, owners = [], tokens = [], token, balances = {}, blacklistedTokens = [], tinymanLps = [], blacklistOnLpAsWell = false, }) {
  if (owner) owners = [owner]
  if (token) tokens = [token]
  const accounts = await Promise.all(owners.map(getAccountInfo))
  accounts.forEach(({ assets }) => {
    assets.forEach(i => {
      if (!tokens.length || tokens.includes(i['asset-id']))
        if (!blacklistedTokens.length || !blacklistedTokens.includes(i['asset-id']))
          sdk.util.sumSingleBalance(balances, i['asset-id'], BigNumber(i.amount).toFixed(0))
    })
  })
  if (tinymanLps.length) {
    await Promise.all(tinymanLps.map(([lp, unknown]) => resolveTinymanLp({ balances, lpId: lp, unknownAsset: unknown, blacklistedTokens: blacklistOnLpAsWell ? blacklistedTokens : [] })))
  }
  const fixBalances = getFixBalancesSync('algorand')
  return fixBalances(balances)
}

async function getAssetInfo(assetId) {
  if (!assetCache[assetId]) assetCache[assetId] = _getAssetInfo()
  return assetCache[assetId]

  async function _getAssetInfo() {
    const { data: { asset } } = await axiosObj.get(`/v2/assets/${assetId}`)
    const reserveInfo = await getAccountInfo(asset.params.reserve)
    const assetObj = { ...asset.params, ...asset, reserveInfo, }
    assetObj.circulatingSupply = assetObj.total - reserveInfo.assetMapping[assetId].amount
    assetObj.assets = { ...reserveInfo.assetMapping }
    delete assetObj.assets[assetId]
    return assetObj
  }
}

async function resolveTinymanLp({ balances, lpId, unknownAsset, blacklistedTokens, }) {
  const lpBalance = balances[lpId]
  if (lpBalance && lpBalance !== '0') {
    const lpInfo = await getAssetInfo(lpId)
    let ratio = lpBalance / lpInfo.circulatingSupply
    if (unknownAsset && lpInfo.assets[unknownAsset]) {
      ratio = ratio * 2
      Object.keys(lpInfo.assets).forEach((token) => {
        if (!blacklistedTokens.length || !blacklistedTokens.includes(token))
          if (token !== unknownAsset)
            sdk.util.sumSingleBalance(balances, token, BigNumber(lpInfo.assets[token].amount * ratio).toFixed(0))
      })
    } else {
      Object.keys(lpInfo.assets).forEach((token) => {
        if (!blacklistedTokens.length || !blacklistedTokens.includes(token))
          sdk.util.sumSingleBalance(balances, token, BigNumber(lpInfo.assets[token].amount * ratio).toFixed(0))
      })
    }
  }
  delete balances[lpId]
  return balances
}

async function getAccountInfo(accountId) {
  if (!accountCache[accountId]) accountCache[accountId] = _getAccountInfo()
  return accountCache[accountId]

  async function _getAccountInfo() {
    const { data: { account } } = await axiosObj.get(`/v2/accounts/${accountId}`)
    if (!account.assets) account.assets = []
    if (account.amount) account.assets.push({ amount: account.amount, 'asset-id': '1', })
    account.assetMapping = {}
    account.assets.forEach(i => {
      i['asset-id'] = '' + i['asset-id']
      account.assetMapping[i['asset-id']] = i
    })
    return account
  }
}

const tokens = {
  usdc: 31566704,
  goUsd: 672913181,
  usdcGoUsdLp: 885102318,
  gard: 684649988,
}

// store all asset ids as string
Object.keys(tokens).forEach(t => tokens[t] = '' + tokens[t])

async function getAppGlobalState(marketId) {
  if (!stateCache[marketId]) stateCache[marketId] = _getAppGlobalState()
  return stateCache[marketId]

  async function _getAppGlobalState() {
    let response = await lookupApplications(marketId);
    let results = {}
    response.application.params["global-state"].forEach(x => {
      let decodedKey = Buffer.from(x.key, "base64").toString("binary")
      results[decodedKey] = x.value.uint
    })

    return results
  }
}

async function getPriceFromAlgoFiLP(lpAssetId, unknownAssetId) {
  let lpInfo = await getAssetInfo(lpAssetId)
  if (lpInfo['unit-name'] !== 'AF-POOL') throw new Error('No, this is not an AlgoFi LP')

  const unknownAssetQuantity = lpInfo.reserveInfo.assets.find(i => i['asset-id'] === '' + unknownAssetId).amount
  for (const i of lpInfo.reserveInfo.assets) {
    const id = i['asset-id']
    if (geckoMapping[id]) {
      const { coingeckoId, decimals } = geckoMapping[id]
      return {
        price: i.amount / unknownAssetQuantity,
        geckoId: coingeckoId,
        decimals,
      }
    }
  }

  throw new Error('Not mapped with any whitelisted assets')
}

module.exports = {
  tokens,
  getAssetInfo: withLimiter(getAssetInfo),
  searchAccountsAll,
  getAccountInfo,
  sumTokens,
  getApplicationAddress,
  lookupApplications: withLimiter(lookupApplications),
  lookupAccountByID: withLimiter(lookupAccountByID),
  searchAccounts: withLimiter(searchAccounts),
  getAppGlobalState: getAppGlobalState,
  getPriceFromAlgoFiLP,
}
