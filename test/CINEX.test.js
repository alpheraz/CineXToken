const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  const { expect } = require("chai");
  const { ethers } = require("hardhat");
  
  describe("CINEX", function () {
    async function deployFixture() {
      // Contracts are deployed using the first signer/account by default
      const [
        owner,
        otherAccount,
        liquidity,
        debtManagement,
        acquisition,
        development,
        community,
        reserve,
        dexPool
      ] = await ethers.getSigners();

      const deployTime = await time.latest();
  
      const Token = await ethers.getContractFactory("CINEX");
      const token = await Token.deploy(
        liquidity,
        debtManagement,
        acquisition,
        development,
        community,
        reserve
      );
  
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
        deployTime,
        dexPool
      };
    }
  
    describe("Deployment", function () {
      it("Should set the right args", async function () {
        const { token, liquidity, development, deployTime } = await loadFixture(deployFixture);
  
        expect(await token.INITIAL_SUPPLY()).to.be.equal(ethers.parseEther("1000000000"));
        expect(await token.PCT_DIV()).to.be.equal(100000);
        expect(await token.antiBotCooldown()).to.be.equal(30);
        expect(await token.liquidityWallet()).to.be.equal(liquidity.address);
        expect(await token.developmentWallet()).to.be.equal(development.address);
        expect(await token.swapFeeChangeTime()).to.be.closeTo(deployTime + 60 * 60 * 24 * 365, 1);
        expect(await token.removeTransferRestrictionTime()).to.be.closeTo(deployTime + 60 * 60 * 24 * 60, 1);
      });

      it("Should mint and distribute the right amounts", async function () {
        const {
          token,
          liquidity,
          debtManagement,
          acquisition,
          development,
          community,
          reserve
        } = await loadFixture(deployFixture);
  
        expect(await token.totalSupply()).to.be.equal(ethers.parseEther("1000000000") * BigInt(90) / BigInt(100));
        expect(await token.balanceOf(liquidity.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(15) / BigInt(100));
        expect(await token.balanceOf(debtManagement.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(27) / BigInt(100));
        expect(await token.balanceOf(acquisition.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(23) / BigInt(100));
        expect(await token.balanceOf(development.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(10) / BigInt(100));
        expect(await token.balanceOf(community.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(10) / BigInt(100));
        expect(await token.balanceOf(reserve.address)).to.be.equal(ethers.parseEther("1000000000") * BigInt(5) / BigInt(100));
      });

      it("Should revert deploy with zero address", async function () {
        const {
          liquidity,
          debtManagement,
          acquisition,
          development,
          community,
          reserve
        } = await loadFixture(deployFixture);

        const Token = await ethers.getContractFactory("CINEX");
        await expect(Token.deploy(
          ethers.ZeroAddress,
          debtManagement,
          acquisition,
          development,
          community,
          reserve
        )).to.be.revertedWithCustomError(Token, "ZeroAddress");

        await expect(Token.deploy(
          liquidity,
          ethers.ZeroAddress,
          acquisition,
          development,
          community,
          reserve
        )).to.be.revertedWithCustomError(Token, "ZeroAddress");

        await expect(Token.deploy(
          liquidity,
          debtManagement,
          ethers.ZeroAddress,
          development,
          community,
          reserve
        )).to.be.revertedWithCustomError(Token, "ZeroAddress");

        await expect(Token.deploy(
          liquidity,
          debtManagement,
          acquisition,
          ethers.ZeroAddress,
          community,
          reserve
        )).to.be.revertedWithCustomError(Token, "ZeroAddress");

        await expect(Token.deploy(
          liquidity,
          debtManagement,
          acquisition,
          development,
          ethers.ZeroAddress,
          reserve
        )).to.be.revertedWithCustomError(Token, "ZeroAddress");

        await expect(Token.deploy(
          liquidity,
          debtManagement,
          acquisition,
          development,
          community,
          ethers.ZeroAddress
        )).to.be.revertedWithCustomError(Token, "ZeroAddress");
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
  });
  