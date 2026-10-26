// Opens a small standing loan from the deployer so the market shows a live borrower.
// npx hardhat run scripts/demo-loan.js --network mezotestnet
const { ethers } = require("hardhat");
const { T, loadDeployment, ERC20 } = require("./mezo");

async function main() {
  const [me] = await ethers.getSigners();
  const market = await ethers.getContractAt("MooringMarket", loadDeployment().MooringMarket);
  const mezo = new ethers.Contract(T.MEZO, ERC20, me);
  const coll = await mezo.balanceOf(me.address);
  await (await mezo.approve(market.target, coll)).wait();
  await (await market.depositCollateral(coll)).wait();
  const [, , , maxBorrow] = await market.position(me.address);
  await (await market.borrow(maxBorrow / 2n)).wait(); // 25% LTV, well inside the limit
  const [c, debt, , , health] = await market.position(me.address);
  console.log("collateral", ethers.formatEther(c), "MEZO, debt", ethers.formatEther(debt), "MUSD, health", ethers.formatEther(health));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
