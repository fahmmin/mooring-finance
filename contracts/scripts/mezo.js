// Mezo testnet addresses (docs/mezo-reference.md) and small helpers shared by the scripts.
const fs = require("fs");
const path = require("path");

const T = {
  MUSD: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503",
  MEZO: "0x7B7c000000000000000000000000000000000001",
  MezoMusdPool: "0x8eb88d745B0aFFF9D71AbC40d7F550Cded7bB342", // Mezo Pools volatile MUSD/MEZO, token0 = MUSD
};

const DEPLOYMENTS = path.join(__dirname, "..", "deployments", "mezotestnet.json");
const loadDeployment = () => (fs.existsSync(DEPLOYMENTS) ? JSON.parse(fs.readFileSync(DEPLOYMENTS, "utf8")) : {});
const saveDeployment = (d) => {
  fs.mkdirSync(path.dirname(DEPLOYMENTS), { recursive: true });
  fs.writeFileSync(DEPLOYMENTS, JSON.stringify({ ...loadDeployment(), ...d }, null, 2) + "\n");
};

const ERC20 = ["function balanceOf(address) view returns (uint256)", "function transfer(address,uint256) returns (bool)", "function approve(address,uint256) returns (bool)"];

module.exports = { T, loadDeployment, saveDeployment, ERC20 };
