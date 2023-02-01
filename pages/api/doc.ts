import { SWAGGER_DESCRIPTION } from "@/config/general";
import { NextApiRequest, NextApiResponse } from "next";

import { createSwaggerSpec } from "next-swagger-doc";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const swaggerHandler = createSwaggerSpec(SWAGGER_DESCRIPTION);
    console.log(swaggerHandler);
    const results = swaggerHandler;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.json({
      success: true,
      statusCode: 200,
      results: results,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, statusCode: 500, message: error?.message });
  }
};
export default handler;

// export const getStaticProps: GetStaticProps = async () => {
//   const spec: Record<string, any> = createSwaggerSpec(SWAGGER_DESCRIPTION);

//   return {
//     props: {
//       spec,
//     },
//   };
// };

// export default swaggerHandler();
