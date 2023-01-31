const BIT_CONTRACT_ADDRESS = "0x1A4b46696b2bB4794Eb3D4c26f1c55F9170fa4C5";
const BIT_BURN_ADDRESS = "0x000000000000000000000000000000000000dead";
const BITDAO_TREASURY_ADDRESS = "0x78605Df79524164911C144801f41e9811B7DB73D";
const BITDAO_LP_WALLET_ADDRESS = "0x5C128d25A21f681e678cB050E551A895c9309945";
const BASE_API = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : "http://localhost:3000";

const description = `*API* Description [swagger docs](${BASE_API}/api-doc)`;
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
      mytest: "test",
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
      { url: "https://api-public.bitdao.io", description: "Production" },
      { url: `${BASE_API}`, description: "Preview" },
      {
        url: "https://public-api-git-develop-windranger.vercel.app",
        description: "Development",
      },
    ],
  },
  apiFolder: "pages/api",
  schemaFolders: ["types"],
};

export {
  BIT_CONTRACT_ADDRESS,
  BIT_BURN_ADDRESS,
  BITDAO_TREASURY_ADDRESS,
  BITDAO_LP_WALLET_ADDRESS,
  SWAGGER_DESCRIPTION,
};
