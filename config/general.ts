const BITDAO_CONTRACT_ADDRESS = "0x1A4b46696b2bB4794Eb3D4c26f1c55F9170fa4C5";
const BITDAO_BURN_ADDRESS = "0x000000000000000000000000000000000000dead";
const BITDAO_TREASURY_ADDRESS = "0x78605Df79524164911C144801f41e9811B7DB73D";
const BITDAO_LP_WALLET_ADDRESS = "0x5C128d25A21f681e678cB050E551A895c9309945";

const BASE_API = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : "http://localhost:3000";

const description = `
Public API docs
- [Api Playground](${BASE_API}/playground)
- [Api Swagger](${BASE_API}/)
`;
const SWAGGER_DESCRIPTION = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bitdao Public API",
      version: "0.1.0",
      contact: {
        email: "octavio.amu@windranger.io",
        name: "Windranger Developers",
        url: "https://windranger.io/",
        "x-twitter": "WindrangerLabs",
      },
      description: description,

      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
      "x-logo": {
        url: "bitdao.png",
      },
      externalDocs: {
        description: "GitHub v3 REST API",
        url: "https://docs.github.com/rest/",
      },
    },
    servers: [
      { url: "https://api-public.bitdao.io/api/v1", description: "Production" },
      { url: `${BASE_API}/api/v1`, description: "Preview" },
      {
        url: "https://public-api-git-develop-windranger.vercel.app/api/v1",
        description: "Development",
      },
    ],
  },
  apiFolder: "pages/api",
  schemaFolders: ["types"],
};

const BITDAO_LOCKED_ADDRESSES = [
  "0xE5791f93b997c7Fc90753A1f2711E479773a2A87",
  "0xf6032C7c15bF4B56bfc5D69208f9ce47F5958512",
  "0xb67e28a7e0D1AD886eeeb18B0BDa55b7Efb56113",
  "0x991A91681f80cb890338B89C1A72be719A902d8B",
  "0x16fE6e64447051b1Eb68d6408F041ac22f6fd563",
  "0x44b4bABd7cbC8cE32Dc3Ff77ed9B6dF9E2D11003",
  "0x3329Fbcda16f15c4Ed1D6847BF18e9d045EE941F",
  "0xa2E5e8A607562B7BdA05d5820e569C290b43be6D",
  "0x3A9B1Da81ca44FEBc97A713242F6a3FeeeC7C891",
  "0xc20C13D2303EEAEEaeb7f73BabF7014bce6D130a",
];

const USDT_CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

export {
  BITDAO_CONTRACT_ADDRESS,
  BITDAO_BURN_ADDRESS,
  BITDAO_TREASURY_ADDRESS,
  BITDAO_LP_WALLET_ADDRESS,
  SWAGGER_DESCRIPTION,
  BITDAO_LOCKED_ADDRESSES,
  USDT_CONTRACT_ADDRESS,
};
