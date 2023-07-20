import { SWAGGER_DESCRIPTION } from "@/config/general";
import { createSwaggerSpec } from 'next-swagger-doc';

export const getApiDocs = async () => {
  const spec = createSwaggerSpec(SWAGGER_DESCRIPTION);
  return spec;
};