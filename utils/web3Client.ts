import { createPublicClient, http } from "viem";
import { mantle } from "viem/chains";

export const publicClient = createPublicClient({
  chain: mantle,
  transport: http(),
});
