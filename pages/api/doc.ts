import { SWAGGER_DESCRIPTION } from "@/config/general";

import { withSwagger } from "next-swagger-doc";
// import { withSwagger } from "lib/index";

const swaggerHandler = withSwagger(SWAGGER_DESCRIPTION);
// const handler = async (req: NextApiRequest, res: NextApiResponse) => {
// try {
//   console.log("process.cwd() 1", process.cwd());

//   // console.log(swaggerHandler);
//   const results = swaggerHandler;
//   console.log("process.cwd()", process.cwd());
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   res.json({
//     success: true,
//     statusCode: 200,
//     results: results(),
//   });
// } catch (error: any) {
//   res
//     .status(500)
//     .json({ success: false, statusCode: 500, message: error?.message });
// }
// };
export default swaggerHandler();

// export const getStaticProps: GetStaticProps = async () => {
//   const spec: Record<string, any> = createSwaggerSpec(SWAGGER_DESCRIPTION);

//   return {
//     props: {
//       spec,
//     },
//   };
// };

// export default swaggerHandler();
