// npx hardhat run scripts/deploy.js --network mezotestnet
const { ethers } = require("hardhat");
const { T, saveDeployment, ERC20 } = require("./mezo");

const SEED = ethers.parseEther(process.env.SEED_MUSD || "20");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer", deployer.address, "BTC", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // 4 observations ≈ the last 2 hours of the MEZO/MUSD pool
  const oracle = await ethers.deployContract("PoolTwapOracle", [T.MezoMusdPool, T.MEZO, 4]);
  await oracle.waitForDeployment();
  console.log("PoolTwapOracle", oracle.target, "MEZO price", ethers.formatEther(await oracle.price()), "MUSD");

  const market = await ethers.deployContract("MooringMarket", [T.MUSD, T.MEZO, oracle.target, deployer.address]);
  await market.waitForDeployment();
  console.log("MooringMarket", market.target);

  // first lender: seeds liquidity so the first borrower has MUSD to borrow
  const musd = new ethers.Contract(T.MUSD, ERC20, deployer);
  await (await musd.approve(market.target, SEED)).wait();
  await (await market.deposit(SEED, deployer.address)).wait();
  console.log("seeded", ethers.formatEther(SEED), "MUSD");

  saveDeployment({ MooringMarket: market.target, PoolTwapOracle: oracle.target, deployBlock: await ethers.provider.getBlockNumber() });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
