// Tops up the e2e wallet with BTC for gas and MUSD to lend and repay with.
// BTC_GAS=0.0005 E2E_MUSD=4 npx hardhat run scripts/fund-e2e.js --network mezotestnet
const { ethers } = require("hardhat");
const { T, ERC20 } = require("./mezo");

async function main() {
  const [me] = await ethers.getSigners();
  const to = process.env.E2E_ADDRESS;
  const value = ethers.parseEther(process.env.BTC_GAS || "0.0005");
  console.log("gas price", ethers.formatUnits((await ethers.provider.getFeeData()).gasPrice, "gwei"), "gwei");
  await (await me.sendTransaction({ to, value })).wait();
  const musd = ethers.parseEther(process.env.E2E_MUSD || "0");
  if (musd > 0n) await (await new ethers.Contract(T.MUSD, ERC20, me).transfer(to, musd)).wait();
  console.log("e2e BTC", ethers.formatEther(await ethers.provider.getBalance(to)), "deployer BTC", ethers.formatEther(await ethers.provider.getBalance(me.address)));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
