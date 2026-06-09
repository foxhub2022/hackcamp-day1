import { createPublicClient, http, formatEther } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum-rpc.publicnode.com')
})

async function getEthUsdPrice(): Promise<number | null> {
  try {
    const response = await fetch('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.USD || null
  } catch {
    return null
  }
}

async function main() {
  const ensName = 'vitalik.eth'
  const address = await client.getEnsAddress({ name: ensName })
  const balance = await client.getBalance({ address: address! })
  const formattedBalance = formatEther(balance)
  const ethPrice = await getEthUsdPrice()
  
  let valueDisplay: string
  if (ethPrice !== null) {
    const usdValue = parseFloat(formattedBalance) * ethPrice
    valueDisplay = `~ $${usdValue.toFixed(2)} USD`
  } else {
    valueDisplay = 'N/A (price feed failed)'
  }

  console.log(`╭──────────────────────────────────────────────╮`)
  console.log(`│  Day 1 · On-chain Hello World                │`)
  console.log(`├──────────────────────────────────────────────┤`)
  console.log(`│  ENS:      vitalik.eth                       │`)
  console.log(`│  Address:  ${address}                       │`)
  console.log(`│  Balance:  ${formattedBalance} ETH           │`)
  console.log(`│  Value:    ${valueDisplay}                   │`)
  console.log(`╰──────────────────────────────────────────────╯`)
}

main().catch(console.error)
