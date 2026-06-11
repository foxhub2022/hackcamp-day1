import { createPublicClient, http, formatEther, isAddress, parseAbi, type Address } from 'viem'
import { mainnet } from 'viem/chains'

// 只读客户端：可以查询链上数据，不能发送交易
const client = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum-rpc.publicnode.com') // RPC 节点，相当于访问以太坊的 HTTP 入口
})

// Chainlink ETH/USD 预言机（主网），走同一 RPC，不依赖可能被墙的外部 API
const CHAINLINK_ETH_USD = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419' as const
const chainlinkPriceAbi = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)',
])

const WALLETS = [
  { label: 'vitalik.eth', input: 'vitalik.eth' },
  { label: 'binance7.eth', input: 'binance7.eth' },
  { label: 'Beacon Deposit', input: '0x00000000219ab540356cBB839Cbe05303d7705Fa' },
]

type WalletRow = {
  label: string
  address: string
  balance: string
  value: string
}

// 从 Chainlink 链上预言机读取 ETH/USD（与余额查询共用 RPC，WSL 下更稳定）
async function fetchChainlinkPrice(): Promise<number | null> {
  try {
    const [roundData, decimals] = await Promise.all([
      client.readContract({
        address: CHAINLINK_ETH_USD,
        abi: chainlinkPriceAbi,
        functionName: 'latestRoundData',
      }),
      client.readContract({
        address: CHAINLINK_ETH_USD,
        abi: chainlinkPriceAbi,
        functionName: 'decimals',
      }),
    ])

    const answer = roundData[1]
    if (answer <= 0n) {
      console.warn('[price] Chainlink 返回无效价格')
      return null
    }

    return Number(answer) / 10 ** Number(decimals)
  } catch (error) {
    console.warn('[price] Chainlink 读取失败:', error instanceof Error ? error.message : error)
    return null
  }
}

// CoinGecko 免费接口（链下备用，国内/WSL 环境可能被墙）
async function fetchCoinGeckoPrice(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
    )
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data = (await response.json()) as { ethereum?: { usd?: number } }
    if (typeof data.ethereum?.usd !== 'number') {
      console.warn('[price] CoinGecko 返回数据缺少 ethereum.usd')
      return null
    }
    return data.ethereum.usd
  } catch (error) {
    console.warn('[price] CoinGecko 请求失败:', error instanceof Error ? error.message : error)
    return null
  }
}

// Binance 公开行情，作为价格源备用
async function fetchBinancePrice(): Promise<number | null> {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data = (await response.json()) as { price?: string }
    if (!data.price) {
      console.warn('[price] Binance 返回数据缺少 price 字段')
      return null
    }
    const price = parseFloat(data.price)
    if (Number.isNaN(price)) {
      console.warn('[price] Binance 返回无效价格:', data.price)
      return null
    }
    return price
  } catch (error) {
    console.warn('[price] Binance 请求失败:', error instanceof Error ? error.message : error)
    return null
  }
}

async function getEthUsdPrice(): Promise<number | null> {
  const chainlinkPrice = await fetchChainlinkPrice()
  if (chainlinkPrice !== null) {
    return chainlinkPrice
  }

  console.warn('[price] 切换至 CoinGecko 备用价格源')
  const coinGeckoPrice = await fetchCoinGeckoPrice()
  if (coinGeckoPrice !== null) {
    return coinGeckoPrice
  }

  console.warn('[price] 切换至 Binance 备用价格源')
  return fetchBinancePrice()
}

// 裸地址直接使用，ENS 解析失败时返回 null 并 warn，不中断脚本
async function resolveAddress(input: string): Promise<Address | null> {
  if (isAddress(input)) {
    return input
  }

  try {
    const address = await client.getEnsAddress({ name: input })
    if (!address) {
      console.warn(`[skip] ENS "${input}" 未解析到地址`)
      return null
    }
    return address
  } catch (error) {
    console.warn(`[skip] ENS "${input}" 解析失败:`, error instanceof Error ? error.message : error)
    return null
  }
}

const LARGE_BALANCE_THRESHOLD = 1_000_000

function formatBalance(ethAmount: number): string {
  if (ethAmount >= LARGE_BALANCE_THRESHOLD) {
    return `${ethAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETH`
  }
  return `${ethAmount} ETH`
}

function formatUsd(ethAmount: number, ethPrice: number | null): string {
  if (ethPrice === null) {
    return 'N/A (price feed failed)'
  }
  const usdValue = ethAmount * ethPrice
  if (usdValue >= LARGE_BALANCE_THRESHOLD) {
    return `~ $${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `~ $${usdValue.toFixed(2)}`
}

async function fetchWallet(
  label: string,
  input: string,
  ethPrice: number | null
): Promise<WalletRow> {
  const skippedRow = { label, address: '—', balance: '—', value: '—' }

  const address = await resolveAddress(input)
  if (!address) {
    return skippedRow
  }

  try {
    const balance = await client.getBalance({ address })
    const ethAmount = parseFloat(formatEther(balance))
    const balanceDisplay = formatBalance(ethAmount)
    const valueDisplay = formatUsd(ethAmount, ethPrice)

    return { label, address, balance: balanceDisplay, value: valueDisplay }
  } catch (error) {
    console.warn(`[skip] "${label}" 余额查询失败:`, error instanceof Error ? error.message : error)
    return { label, address, balance: '—', value: '—' }
  }
}

function printTable(title: string, headers: string[], rows: string[][]) {
  const colWidths = headers.map((header, columnIndex) =>
    Math.max(header.length, ...rows.map((row) => row[columnIndex].length))
  )

  const horizontalLine = (left: string, mid: string, right: string, fill: string) =>
    left + colWidths.map((columnWidth) => fill.repeat(columnWidth + 2)).join(mid) + right

  const dataRow = (cells: string[]) =>
    '│ ' + cells.map((cell, columnIndex) => cell.padEnd(colWidths[columnIndex])).join(' │ ') + ' │'

  const titleWidth = colWidths.reduce((totalWidth, columnWidth) => totalWidth + columnWidth + 3, 1) - 1
  const titleContent = `  ${title}`.padEnd(titleWidth)

  console.log('╭' + '─'.repeat(titleWidth) + '╮')
  console.log(`│${titleContent}│`)
  console.log(horizontalLine('├', '┬', '┤', '─'))
  console.log(dataRow(headers))
  console.log(horizontalLine('├', '┼', '┤', '─'))
  for (const row of rows) {
    console.log(dataRow(row))
  }
  console.log(horizontalLine('╰', '┴', '╯', '─'))
}

async function main() {
  const ethPrice = await getEthUsdPrice()

  const rows: WalletRow[] = []
  for (const wallet of WALLETS) {
    rows.push(await fetchWallet(wallet.label, wallet.input, ethPrice))
  }

  printTable(
    'Day 1 · On-chain Hello World',
    ['Label', 'Address', 'Balance', 'Value'],
    rows.map((row) => [row.label, row.address, row.balance, row.value])
  )
}

main().catch((error) => {
  console.error('[fatal] 脚本执行失败:', error instanceof Error ? error.message : error)
  process.exit(1)
})
