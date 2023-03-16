import { getCSVData } from "@/utils/dataHelpers";
import path from "path";

export const mapBuybacksData = async () => {
  const jsonDirectory = path.join(process.cwd(), 'data');
  const buybacks = (await getCSVData(jsonDirectory + '/buyback_data.csv') as Record<string, unknown>[]).map((item) => {
    const { asset_2_amount, asset_2 } = item;
    // switch these two fields around
    item.asset_2 = asset_2_amount;
    item.asset_2_amount = asset_2;
    // parse this as a date
    item.date_time_utc = new Date(item.date_time_utc as string);
    
    return item;
  });
  
  return buybacks;
}