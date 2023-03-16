import { NextApiRequest, NextApiResponse } from 'next';
import { mapBuybacksData } from '../graphql/mappings/buybacksData';

/**
 * @swagger
 * /buybacks:
 *  get:
 *    tags: [Buybacks]
 *    summary: Get buyback transaction data
 *
 *    description: |-
 *      **Returns all buyback transactions (\* note this is limited to the most recent 10,000 entries, for the full set use the graphql endpoint (https://api-public.bitdao.io/api/v1/graphql))**
 *
 *    responses:
 *
 *      200:
 *        description: Buyback transactions
 *        content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Buybacks'
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // resolve data through parser
  const data = await mapBuybacksData(true);
  
  // Return the content of the data file in json format (10,000 most recent entries...)
  res.status(200).json(data.sort((a, b) => parseInt(b.id as string) - parseInt(a.id as string)).splice(0, 10000));

  return false;
}
