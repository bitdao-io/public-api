import { SWAGGER_DESCRIPTION } from "@/config/general";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import { createSwaggerSpec } from "next-swagger-doc";
// import { createSwaggerSpec } from "lib/index";
import dynamic from "next/dynamic";
// import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

// const SwaggerUI = dynamic<{
//   spec: Record<string, any>;
// }>(import("swagger-ui-react"), { ssr: false });

// const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
//   ssr: false,
// });
const SwaggerUI = dynamic(import("swagger-ui-react"), {
  ssr: false,
});

function ApiDoc({ spec }: InferGetStaticPropsType<typeof getStaticProps>) {
  return <SwaggerUI spec={spec} />;
}

export const getStaticProps: GetStaticProps = async () => {
  const spec: Record<string, any> = createSwaggerSpec(SWAGGER_DESCRIPTION);

  return {
    props: {
      spec,
    },
  };
};

export default ApiDoc;
