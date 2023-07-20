// Bind ID against the TOKEN_CONTRACT_ADDRESS
import { TOKEN_CONTRACT_ADDRESS } from "@/config/general";

// Alchemy has already typed the token balances
import { TokenBalancesResponse } from "alchemy-sdk";

// Map data exposed in this endpoint to graphql entities
import { dataHandler as TokenBalance } from "../../token-data";

// simple holders type (shouldnt need this anywhere else)
type Holders = {
  id: string;
  name: string;
  token: string;
  tokenBalance: string | null;
};

// map TokenBalance entries into the holders entity
const updateHoldersEntry = (
  holders: Holders[],
  name: string,
  balance_: TokenBalancesResponse
) => {
  // check for BitToken
  const balanceEntry = holders.findIndex((e) => e.id == balance_.address);

  // construct new value set
  const address = balance_.address;
  const balance = balance_.tokenBalances.map((balance) => {
    return {
      contractAddress: balance.contractAddress,
      tokenBalance: balance.tokenBalance,
    };
  })[0];
  const tokenBalanceBalance = {
    id: `${balance.contractAddress}-${address}-${name}`,
    name: name,
    token: balance.contractAddress,
    tokenBalance: balance.tokenBalance,
  };

  // insert or update entry
  if (balanceEntry === -1) {
    // push the new TokenBalanceBalance data
    holders.push(tokenBalanceBalance);
  } else {
    holders.splice(balanceEntry, 1, tokenBalanceBalance);
  }
};

// map TokenBalance entries into the holder entities and record TokenBalance entry for summary
export const mapTokenBalanceData = async (tokens: { address: string }[]) => {
  // wrap in a try catch to avoid 500 error
  try {
    // get the balance data
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const _tokenBalances = await TokenBalance(process.env.ALCHEMY_API_KEY!);

    // construct holders from mapped content
    const holders: Holders[] = [];

    // construct new tokenBalances data
    const tokenBalances = [
      {
        id: TOKEN_CONTRACT_ADDRESS,
        name: "MNT",
        token: TOKEN_CONTRACT_ADDRESS,
        address: TOKEN_CONTRACT_ADDRESS,
        totalSupply: _tokenBalances.totalSupply,
        circulatingSupply: _tokenBalances.circulatingSupply,
        lockedTotal: _tokenBalances.lockedTotal,
        balanceTotal: _tokenBalances.treasuryBalanceTotal,
        LPTokenTotal: _tokenBalances.treasuryLPTokenTotal,
        mantleCoreTotal: _tokenBalances.mantleCoreTotal,
      },
    ];

    // prepare to map (we'll place each entry against its name + data)
    [
      {
        name: "BalancesData",
        data: _tokenBalances.treasuryBalanceData,
      },
      {
        name: "mantleCoreData",
        data: _tokenBalances.mantleCoreData,
      },
      {
        name: "LPTokenBalancesData",
        data: _tokenBalances.treasuryLPBalanceData,
      },
    ].map(({ name, data }) => updateHoldersEntry(holders, name, data));

    // apply the same to the locked balanceData (these all share a name but not an address)
    _tokenBalances.lockedBalancesData.map((data) =>
      updateHoldersEntry(holders, `LockedBalanceData-${data.address}`, data)
    );
    // return the mapped entities
    return {
      tokens,
      holders,
      tokenBalances,
    };
  } catch {
    // return empty mapping
    return {
      tokens,
      holders: [],
      tokenBalances: [],
    };
  }
};
