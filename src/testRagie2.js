import { Ragie } from "ragie";
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.RAGIE_API_KEY;

const ragie = new Ragie({
  auth: apiKey
});

(async () => {
  const response = await ragie.retrievals.retrieve({
    query: "social security taxable wages"
  });
  
  console.log(response);
})();