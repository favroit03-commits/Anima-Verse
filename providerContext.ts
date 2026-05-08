import axios from "axios";
import { getBaseUrl } from "./getBaseUrl";
import { headers } from "./headers";
import * as cheerio from "cheerio";
import { ProviderContext } from "./types";
import crypto from "crypto";

export const providerContext: ProviderContext = {
  axios,
  getBaseUrl,
  Aes: {
    sha1: async (input: string) => crypto.createHash('sha1').update(input).digest('hex')
  },
  commonHeaders: headers,
  cheerio,
};
