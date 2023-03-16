import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';
import { getCSVData } from '@/utils/dataHelpers';
import { mapBuybacksData } from '../graphql/mappings/buybacksData';

/**
 * @swagger
 * /buybacks:
 *  get:
 *    tags: [Buybacks]
 *    summary: Get buyback transaction data
 *
 *    description: |-
 *      **Returns all buyback transactions**
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
  const data = await mapBuybacksData();
  
  // Return the content of the data file in json format
  res.status(200).json(data);

  return false;
}
