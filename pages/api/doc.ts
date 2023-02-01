import { SWAGGER_DESCRIPTION } from "@/config/general";
import { withSwagger } from "next-swagger-doc";

const swaggerHandler = withSwagger({
  ...SWAGGER_DESCRIPTION,
  apiFolder: "pages/api",
  schemaFolders: ["openapi"],
});
export default swaggerHandler();
