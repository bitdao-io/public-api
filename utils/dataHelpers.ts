import fs from 'fs';
import {parse} from 'csv-parse';

// Read the csv data file and convert to json
export const csvParser = (resolve: (value?: unknown) => void, reject: (reason: unknown) => void) => parse({delimiter: ','}, function(err, data) {
  if (!err) {
    const headers = data.splice(0, 1)[0];
    const json = data.map((values: unknown[]) => {
      
      return headers.reduce((items: Record<string, unknown>, header: string, key: number) => {
        items[header?.toLowerCase().replace(/\s/g, "_").replace("(", "_").replace(")", "") || "id"] = values[key]
        
        return items;
      }, {})
    })
    resolve(json);
  } else {
    reject(err)
  }
});

// given a csv file - return json
export const getCSVData = async (file: string) => {
  // resolve data through parser
  const data = await new Promise((resolve, reject) => fs.createReadStream(file, 'utf8').pipe(csvParser(resolve, reject)));

  return data;
}
