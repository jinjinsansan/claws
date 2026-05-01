// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ClawsNFT.sol";
import "../src/RewardDistributor.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY_DEPLOYER");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address usdtAddress = vm.envAddress("USDT_CONTRACT_ADDRESS");
        string memory baseURI = vm.envString("NFT_BASE_URI");
        address botWallet = vm.envAddress("BOT_WALLET_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        ClawsNFT clawsNFT = new ClawsNFT(usdtAddress, treasury, baseURI);
        console.log("ClawsNFT deployed at:", address(clawsNFT));

        RewardDistributor distributor = new RewardDistributor(usdtAddress);
        console.log("RewardDistributor deployed at:", address(distributor));

        distributor.grantRole(distributor.DISTRIBUTOR_ROLE(), botWallet);
        console.log("DISTRIBUTOR_ROLE granted to:", botWallet);

        vm.stopBroadcast();

        console.log("--- Deployment Summary ---");
        console.log("Chain ID:", block.chainid);
        console.log("USDT:", usdtAddress);
        console.log("Treasury:", treasury);
        console.log("ClawsNFT:", address(clawsNFT));
        console.log("RewardDistributor:", address(distributor));
        console.log("Bot Wallet:", botWallet);
    }
}
