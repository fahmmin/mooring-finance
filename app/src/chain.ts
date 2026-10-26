import { createPublicClient, defineChain, http, parseAbi } from "viem";

declare const __DEPLOYMENT__: { MooringMarket?: `0x${string}`; PoolTwapOracle?: `0x${string}`; deployBlock?: number };

export const mezoTestnet = defineChain({
  id: 31611,
  name: "Mezo Testnet",
  nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.test.mezo.org"] } },
  blockExplorers: { default: { name: "Mezo Explorer", url: "https://explorer.test.mezo.org" } },
});

export const EXPLORER = "https://explorer.test.mezo.org";
export const MARKET = __DEPLOYMENT__.MooringMarket;
export const ORACLE = __DEPLOYMENT__.PoolTwapOracle;
export const DEPLOY_BLOCK = BigInt(__DEPLOYMENT__.deployBlock ?? 0);
export const MUSD = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503" as const;
export const MEZO = "0x7B7c000000000000000000000000000000000001" as const;
export const MEZO_POOL = "0x8eb88d745B0aFFF9D71AbC40d7F550Cded7bB342" as const;
export const GITHUB = "https://github.com/fahmmin/mooring-finance";

export const marketAbi = parseAbi([
  "function totalAssets() view returns (uint256)",
  "function totalBorrows() view returns (uint256)",
  "function cash() view returns (uint256)",
  "function utilization() view returns (uint256)",
  "function borrowRate() view returns (uint256)",
  "function supplyRate() view returns (uint256)",
  "function collateralPrice() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function convertToAssets(uint256) view returns (uint256)",
  "function maxWithdraw(address) view returns (uint256)",
  "function position(address) view returns (uint256 coll, uint256 debt, uint256 collValue, uint256 maxBorrow, uint256 health)",
  "function deposit(uint256 assets, address receiver) returns (uint256)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256)",
  "function depositCollateral(uint256 amount)",
  "function withdrawCollateral(uint256 amount)",
  "function borrow(uint256 amount)",
  "function repay(uint256 amount, address user) returns (uint256)",
  "function liquidate(address user, uint256 repayAmount) returns (uint256)",
  "event CollateralDeposited(address indexed user, uint256 amount)",
  "event Borrowed(address indexed user, uint256 amount)",
]);
export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
]);

export const MAX_LTV = 0.5;
export const LIQ_THRESHOLD = 0.65;

export const pub = createPublicClient({ chain: mezoTestnet, transport: http() });

export const fmt = (x: bigint | undefined, dp = 2) =>
  x === undefined ? "–" : (Number(x) / 1e18).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
export const pct = (x: bigint | undefined, dp = 2) => (x === undefined ? "–" : `${(Number(x) / 1e16).toFixed(dp)}%`);

export const MEZO_CONTRACTS = [
  { name: "MUSD", address: MUSD },
  { name: "MEZO token", address: MEZO },
  { name: "Mezo Pools MEZO/MUSD", address: MEZO_POOL },
] as const;
