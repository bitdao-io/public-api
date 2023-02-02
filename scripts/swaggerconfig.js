#!/usr/bin/env node

const fs = require("fs");

const generateFile = async () => {
  const configFile = await import("../config/general.ts");
  const jsonData = JSON.stringify(configFile.SWAGGER_DESCRIPTION, false, 2);
  fs.promises.writeFile("next-swagger-doc.json", jsonData).then(() => {
    console.log("JSON saved");
  });
};
generateFile();
