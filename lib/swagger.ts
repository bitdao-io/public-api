import { SWAGGER_DESCRIPTION } from "@/config/general";
import { createSwaggerSpec } from "next-swagger-doc";
// import "server-only";

export const getApiDocs = async () => {
  const spec: Record<string, any> = createSwaggerSpec(SWAGGER_DESCRIPTION);
  return spec;
};
