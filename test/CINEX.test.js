const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const { ethers, upgrades } = require("hardhat");
  
  describe("CINEX", function () {
    async function deployFixture() {
      // Contracts are deployed using the first signer/account by default
      const [
        owner,
        otherAccount,
        dexPool
      ] = await ethers.getSigners();

      const liquidity = await ethers.getImpersonatedSigner("0x2c0e66A4Fe460eA18d0887B7849fe0395c15f9D3");
      const debtManagement = await ethers.getImpersonatedSigner("0x58C498f8eFbC7Cc1c7299FE7C94F0A0836BB1034");
      const acquisition = await ethers.getImpersonatedSigner("0x1331b032029e0a38BFE56d287B4befE64D04D0c6");
      const development = await ethers.getImpersonatedSigner("0x8b8702A4266F80f270B45C8775F0335C042E48BF");
      const community = await ethers.getImpersonatedSigner("0x9aD19B438c19cb3d32C23a4b9010f432d3fC94e3");
      const reserve = await ethers.getImpersonatedSigner("0x80657b98772CB75DDEceF1bB92647FDca3e1a0A1");
      const marketing = await ethers.getImpersonatedSigner("0x94baA3A22778dfAbeC37Cc379E51B43A255d9c5E");
      const team = await ethers.getImpersonatedSigner("0xe813B4588c93B0DA5146314C179b67e6c7690894");

      await owner.sendTransaction({to: liquidity.address, value: ethers.parseEther("1")});
      await owner.sendTransaction({to: debtManagement.address, value: ethers.parseEther("1")});
      await owner.sendTransaction({to: acquisition.address, value: ethers.parseEther("1")});
      await owner.sendTransaction({to: development.address, value: ethers.parseEther("1")});
      await owner.sendTransaction({to: community.address, value: ethers.parseEther("1")});
      await owner.sendTransaction({to: reserve.address, value: ethers.parseEther("1")});
      await owner.sendTransaction({to: marketing.address, value: ethers.parseEther("1")});
      await owner.sendTransaction({to: team.address, value: ethers.parseEther("1")});

      const deployTime = await time.latest();
  
      const Token = await ethers.getContractFactory("CINEX");
      const token = await upgrades.deployProxy(Token, [], { kind: "uups" });
  
      return {
        token,
        owner,
        otherAccount,
        liquidity,
        debtManagement,
        acquisition,
        development,
        community,
        reserve,
        marketing,
        team,
        deployTime,
        dexPool
      };
    }
  
    describe("Deployment", function () {
      it("Should set the right args", async function () {
        const {
          token,
          liquidity,
          debtManagement,
          acquisition,
          development,
          community,
          reserve,
          marketing,
          team,
          deployTime
        } = await loadFixture(deployFixture);
  
        expect(await token.INITIAL_SUPPLY()).to.be.equal(ethers.parseEther("1000000000"));
        expect(await token.PCT_DIV()).to.be.equal(100000);
        expect(await token.antiBotCooldown()).to.be.equal(30);
        expect(await token.liquidityWallet()).to.be.equal(liquidity.address);
        expect(await token.debtManagementWallet()).to.be.equal(debtManagement.address);
        expect(await token.acquisitionWallet()).to.be.equal(acquisition.address);
        expect(await token.developmentWallet()).to.be.equal(development.address);
        expect(await token.communityWallet()).to.be.equal(community.address);
        expect(await token.reserveWallet()).to.be.equal(reserve.address);
        expect(await token.marketingWallet()).to.be.equal(marketing.address);
        expect(await token.teamWallet()).to.be.equal(team.address);
        expect(await token.swapFeeChangeTime()).to.be.closeTo(deployTime + 60 * 60 * 24 * 365, 5);
        expect(await token.removeTransferRestrictionTime()).to.be.closeTo(deployTime + 60 * 60 * 24 * 60, 5);
      });

      it("Should mint and distribute the right amounts", async function () {
        const {
          token,
          liquidity,
          debtManagement,
          acquisition,
          development,
          community,
          reserve,
          marketing,
          team
        } = await loadFixture(deployFixture);
  
        expect(await token.totalSupply()).to.be.equal(ethers.parseEther("1000000000") * BigInt(90) / BigInt(100));
        expect(await token.balanceOf(liquidity.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(15) / BigInt(100));
        expect(await token.balanceOf(debtManagement.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(27) / BigInt(100));
        expect(await token.balanceOf(acquisition.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(23) / BigInt(100));
        expect(await token.balanceOf(development.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(5) / BigInt(100));
        expect(await token.balanceOf(community.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(5) / BigInt(100));
        expect(await token.balanceOf(reserve.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(5) / BigInt(100));
        expect(await token.balanceOf(marketing.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(5) / BigInt(100));
        expect(await token.balanceOf(team.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(5) / BigInt(100));
      });

      it("Should revert with repeated initialization", async function () {
        const {
          token
        } = await loadFixture(deployFixture);
  
        await expect(token.initialize()).to.be.revertedWithCustomError(token, "InvalidInitialization");
      });
    });

    describe("Swap fees", function () {
      describe("Get fee", function () {
        it("Should get the right fee before update time", async function () {
          const { token } = await loadFixture(deployFixture);

          expect(await token.getFee()).to.be.equal(6000);
        });

        it("Should get the right fee after update time", async function () {
          const { token } = await loadFixture(deployFixture);

          await time.increaseTo(await token.swapFeeChangeTime())

          expect(await token.getFee()).to.be.equal(2000);
        });
      });

      describe("Setters", function () {
        it("Should set the fee free list", async function () {
          const { token, owner } = await loadFixture(deployFixture);

          expect(await token.isFeeFree(owner.address)).to.be.false;

          await expect(token.setFeeFreeList(owner.address, true)).to.be.emit(token, "FeeFreeListUpdated").withArgs(owner.address, true);

          expect(await token.isFeeFree(owner.address)).to.be.true;

          await expect(token.setFeeFreeList(owner.address, false)).to.be.emit(token, "FeeFreeListUpdated").withArgs(owner.address, false);

          expect(await token.isFeeFree(owner.address)).to.be.false;
        });

        it("Should set the pool with fee list", async function () {
          const { token, dexPool } = await loadFixture(deployFixture);

          expect(await token.isPoolWithFee(dexPool.address)).to.be.false;

          await expect(token.setPoolWithFeeList(dexPool.address, true)).to.be.emit(token, "PoolWithFeeListUpdated").withArgs(dexPool.address, true);

          expect(await token.isPoolWithFee(dexPool.address)).to.be.true;

          await expect(token.setPoolWithFeeList(dexPool.address, false)).to.be.emit(token, "PoolWithFeeListUpdated").withArgs(dexPool.address, false);

          expect(await token.isPoolWithFee(dexPool.address)).to.be.false;
        });

        it("Should revert set the fee free list with zero address", async function () {
          const { token, owner } = await loadFixture(deployFixture);

          expect(await token.isFeeFree(ethers.ZeroAddress)).to.be.false;

          await expect(token.setFeeFreeList(ethers.ZeroAddress, true)).to.be.revertedWithCustomError(token, "ZeroAddress");

          expect(await token.isFeeFree(ethers.ZeroAddress)).to.be.false;
        });

        it("Should revert set the fee free list by not owner", async function () {
          const { token, owner, otherAccount } = await loadFixture(deployFixture);

          expect(await token.isFeeFree(owner.address)).to.be.false;

          await expect(token.connect(otherAccount).setFeeFreeList(owner.address, true)).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");

          expect(await token.isFeeFree(owner.address)).to.be.false;
        });

        it("Should revert set the pool with fee list with zero address", async function () {
          const { token } = await loadFixture(deployFixture);

          expect(await token.isPoolWithFee(ethers.ZeroAddress)).to.be.false;

          await expect(token.setPoolWithFeeList(ethers.ZeroAddress, true)).to.be.revertedWithCustomError(token, "ZeroAddress");

          expect(await token.isPoolWithFee(ethers.ZeroAddress)).to.be.false;
        });

        it("Should revert set the pool with fee list by not owner", async function () {
          const { token, owner, otherAccount } = await loadFixture(deployFixture);

          expect(await token.isPoolWithFee(owner.address)).to.be.false;

          await expect(token.connect(otherAccount).setPoolWithFeeList(owner.address, true)).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");

          expect(await token.isPoolWithFee(owner.address)).to.be.false;
        });
      });

      describe("Get swap fee", function () {
        it("Should take and distribute swap fee on sell before update fee time", async function () {
          const { token, liquidity, development, reserve, dexPool } = await loadFixture(deployFixture);
  
          await token.setPoolWithFeeList(dexPool.address, true);
          const transferAmount = ethers.parseEther("10");

          const expectedFee = transferAmount * BigInt(6) / BigInt(100);
          const expectedLiquidityPart = transferAmount * BigInt(4) / BigInt(100);
          const expectedDevelopmentPart = transferAmount * BigInt(2) / BigInt(100);
  
          await expect(token.connect(reserve).transfer(dexPool.address, transferAmount)).to.be.changeTokenBalances(
            token,
            [
              reserve,
              dexPool,
              liquidity,
              development
            ],
            [
              -transferAmount,
              transferAmount - expectedFee,
              expectedLiquidityPart,
              expectedDevelopmentPart
            ]
          );
        });

        it("Should take and distribute swap fee on sell after update fee time", async function () {
          const { token, liquidity, development, reserve, dexPool } = await loadFixture(deployFixture);
  
          await token.setPoolWithFeeList(dexPool.address, true);
          const transferAmount = ethers.parseEther("10");

          await time.increaseTo(await token.swapFeeChangeTime());

          const expectedFee = transferAmount * BigInt(2) / BigInt(100);
          const expectedLiquidityPart = transferAmount * BigInt(1) / BigInt(100);
          const expectedDevelopmentPart = transferAmount * BigInt(1) / BigInt(100);
  
          await expect(token.connect(reserve).transfer(dexPool.address, transferAmount)).to.be.changeTokenBalances(
            token,
            [
              reserve,
              dexPool,
              liquidity,
              development
            ],
            [
              -transferAmount,
              transferAmount - expectedFee,
              expectedLiquidityPart,
              expectedDevelopmentPart
            ]
          );
        });

        it("Should take and distribute swap fee on buy before update fee time", async function () {
          const { token, liquidity, development, reserve, dexPool } = await loadFixture(deployFixture);
  
          const transferAmount = ethers.parseEther("10");
          await token.connect(reserve).transfer(dexPool.address, transferAmount);

          await token.setPoolWithFeeList(dexPool.address, true);

          const expectedFee = transferAmount * BigInt(6) / BigInt(100);
          const expectedLiquidityPart = transferAmount * BigInt(4) / BigInt(100);
          const expectedDevelopmentPart = transferAmount * BigInt(2) / BigInt(100);
  
          await expect(token.connect(dexPool).transfer(reserve.address, transferAmount)).to.be.changeTokenBalances(
            token,
            [
              reserve,
              dexPool,
              liquidity,
              development
            ],
            [
              transferAmount - expectedFee,
              -transferAmount,
              expectedLiquidityPart,
              expectedDevelopmentPart
            ]
          );
        });

        it("Should take and distribute swap fee on buy after update fee time", async function () {
          const { token, liquidity, development, reserve, dexPool } = await loadFixture(deployFixture);
  
          const transferAmount = ethers.parseEther("10");
          await token.connect(reserve).transfer(dexPool.address, transferAmount);

          await token.setPoolWithFeeList(dexPool.address, true);

          await time.increaseTo(await token.swapFeeChangeTime());

          const expectedFee = transferAmount * BigInt(2) / BigInt(100);
          const expectedLiquidityPart = transferAmount * BigInt(1) / BigInt(100);
          const expectedDevelopmentPart = transferAmount * BigInt(1) / BigInt(100);
  
          await expect(token.connect(dexPool).transfer(reserve.address, transferAmount)).to.be.changeTokenBalances(
            token,
            [
              reserve,
              dexPool,
              liquidity,
              development
            ],
            [
              transferAmount - expectedFee,
              -transferAmount,
              expectedLiquidityPart,
              expectedDevelopmentPart
            ]
          );
        });

        it("Should not take and distribute swap fee if account fee free", async function () {
          const { token, liquidity, development, reserve, dexPool } = await loadFixture(deployFixture);
  
          await token.setPoolWithFeeList(dexPool.address, true);
          await token.setFeeFreeList(reserve.address, true);
          const transferAmount = ethers.parseEther("10");
  
          await expect(token.connect(reserve).transfer(dexPool.address, transferAmount)).to.be.changeTokenBalances(
            token,
            [
              reserve,
              dexPool,
              liquidity,
              development
            ],
            [
              -transferAmount,
              transferAmount,
              0,
              0
            ]
          );
        });
      });

      describe("Antibot cooldown", function () {
        it("Should revert if less than 30 seconds have passed from the last swap", async function () {
          const { token, liquidity, development, reserve, dexPool } = await loadFixture(deployFixture);
  
          await token.setPoolWithFeeList(dexPool.address, true);
          const transferAmount = ethers.parseEther("10");

          const expectedFee = transferAmount * BigInt(6) / BigInt(100);
          const expectedLiquidityPart = transferAmount * BigInt(4) / BigInt(100);
          const expectedDevelopmentPart = transferAmount * BigInt(2) / BigInt(100);
  
          await expect(token.connect(reserve).transfer(dexPool.address, transferAmount)).to.be.changeTokenBalances(
            token,
            [
              reserve,
              dexPool,
              liquidity,
              development
            ],
            [
              -transferAmount,
              transferAmount - expectedFee,
              expectedLiquidityPart,
              expectedDevelopmentPart
            ]
          );

          await expect(token.connect(reserve).transfer(dexPool.address, transferAmount)).to.be.revertedWithCustomError(token, "AntibotCooldown");
        });

        it("Should not revert if more than 30 seconds have passed from the last swap", async function () {
          const { token, liquidity, development, reserve, dexPool } = await loadFixture(deployFixture);
  
          await token.setPoolWithFeeList(dexPool.address, true);
          await token.setFeeFreeList(reserve.address, true);
          const transferAmount = ethers.parseEther("10");
  
          await expect(token.connect(reserve).transfer(dexPool.address, transferAmount)).to.be.changeTokenBalances(
            token,
            [
              reserve,
              dexPool,
              liquidity,
              development
            ],
            [
              -transferAmount,
              transferAmount,
              0,
              0
            ]
          );

          await time.increase(await token.antiBotCooldown());

          await expect(token.connect(reserve).transfer(dexPool.address, transferAmount)).to.be.changeTokenBalances(
            token,
            [
              reserve,
              dexPool,
              liquidity,
              development
            ],
            [
              -transferAmount,
              transferAmount,
              0,
              0
            ]
          );
        });

        it("Should disable antibot cooldown after 60 days", async function () {
          const { token, liquidity, development, reserve, dexPool } = await loadFixture(deployFixture);
  
          await token.setPoolWithFeeList(dexPool.address, true);
          const transferAmount = ethers.parseEther("10");

          await time.increaseTo(await token.removeTransferRestrictionTime());

          const expectedFee = transferAmount * BigInt(6) / BigInt(100);
          const expectedLiquidityPart = transferAmount * BigInt(4) / BigInt(100);
          const expectedDevelopmentPart = transferAmount * BigInt(2) / BigInt(100);
  
          await expect(token.connect(reserve).transfer(dexPool.address, transferAmount)).to.be.changeTokenBalances(
            token,
            [
              reserve,
              dexPool,
              liquidity,
              development
            ],
            [
              -transferAmount,
              transferAmount - expectedFee,
              expectedLiquidityPart,
              expectedDevelopmentPart
            ]
          );

          await expect(token.connect(reserve).transfer(dexPool.address, transferAmount)).to.be.changeTokenBalances(
            token,
            [
              reserve,
              dexPool,
              liquidity,
              development
            ],
            [
              -transferAmount,
              transferAmount - expectedFee,
              expectedLiquidityPart,
              expectedDevelopmentPart
            ]
          );
        });
      });
    });

    describe("Transfer limit", function () {
      it("Should revert if exeeds transfer limit", async function () {
        const { token, liquidity, owner } = await loadFixture(deployFixture);

        const transferAmount = await token.INITIAL_SUPPLY() / BigInt(100) + BigInt(1);

        await expect(token.connect(liquidity).transfer(owner.address, transferAmount)).to.be.revertedWithCustomError(token, "ExceedsMaxTransferAmount");
      });

      it("Should disable transfer limit after 60 days", async function () {
        const { token, liquidity, owner } = await loadFixture(deployFixture);

        await time.increaseTo(await token.removeTransferRestrictionTime());
        const transferAmount = await token.INITIAL_SUPPLY() / BigInt(100) + BigInt(1);

        await expect(token.connect(liquidity).transfer(owner.address, transferAmount)).to.be.emit(token, "Transfer").withArgs(liquidity.address, owner.address, transferAmount);
      });
    });

    describe("Transfer from", function () {
      it("Should transfer tokens", async function () {
        const { token, reserve, owner } = await loadFixture(deployFixture);

        const transferAmount = ethers.parseEther("10");
        await token.connect(reserve).approve(owner.address, transferAmount);

        await expect(token.connect(owner).transferFrom(reserve.address, owner.address, transferAmount)).to.be.changeTokenBalances(
          token,
          [reserve, owner],
          [-transferAmount, transferAmount]
        );
      });

      it("Should revert transfer tokens if insufficient allowance", async function () {
        const { token, reserve, owner } = await loadFixture(deployFixture);

        const transferAmount = ethers.parseEther("10");
        await token.connect(reserve).approve(owner.address, transferAmount - BigInt(1));

        await expect(token.connect(owner).transferFrom(reserve.address, owner.address, transferAmount)).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
      });
    });

    describe("Pauseable", function () {
      it("Should pause", async function () {
        const { token } = await loadFixture(deployFixture);

        expect(await token.paused()).to.be.false;

        await expect(token.pause()).to.be.emit(token, "Paused");

        expect(await token.paused()).to.be.true;
      });

      it("Should unpause", async function () {
        const { token } = await loadFixture(deployFixture);
        await expect(token.pause()).to.be.emit(token, "Paused");

        expect(await token.paused()).to.be.true;

        await expect(token.unpause()).to.be.emit(token, "Unpaused");

        expect(await token.paused()).to.be.false;
      });

      it("Should revert pause by not owner", async function () {
        const { token, otherAccount } = await loadFixture(deployFixture);

        expect(await token.paused()).to.be.false;

        await expect(token.connect(otherAccount).pause()).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");

        expect(await token.paused()).to.be.false;
      });

      it("Should revert unpause by not owner", async function () {
        const { token, otherAccount } = await loadFixture(deployFixture);
        await expect(token.pause()).to.be.emit(token, "Paused");

        expect(await token.paused()).to.be.true;

        await expect(token.connect(otherAccount).unpause()).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");

        expect(await token.paused()).to.be.true;
      });

      it("Should revert any transfer on pause", async function () {
        const { token, owner, liquidity } = await loadFixture(deployFixture);
        await expect(token.pause()).to.be.emit(token, "Paused");

        const transferAmount = ethers.parseEther("1");
        await token.connect(liquidity).approve(owner.address, transferAmount);

        expect(await token.paused()).to.be.true;

        await expect(token.connect(liquidity).transfer(owner.address, transferAmount)).to.be.revertedWithCustomError(token, "EnforcedPause");
        await expect(token.transferFrom(liquidity.address, owner.address, transferAmount)).to.be.revertedWithCustomError(token, "EnforcedPause");
      });
    });

    describe("UUPSUpgradeable", function () {
      it("Should upgrade", async function () {
        const { token } = await loadFixture(deployFixture);

        const tokenWithNewInterface = await ethers.getContractAt("MockCINEXV2", await token.getAddress());
        await expect(tokenWithNewInterface.addedOnUpgade()).to.be.reverted;

        const newImpl = await ethers.getContractFactory("MockCINEXV2");

        newImplAddress = await upgrades.prepareUpgrade(
          await token.getAddress(),
          newImpl,
          {
              kind: "uups",
          }
        );
        // Actually make an upgrade
        await upgrades.upgradeProxy(await token.getAddress(), newImpl, {
            kind: "uups",
        });

        expect(await tokenWithNewInterface.addedOnUpgade()).to.be.false;
      });
    });
  });
  