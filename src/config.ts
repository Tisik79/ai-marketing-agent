import dotenv from 'dotenv';
import { FacebookAdsApi, AdAccount } from 'facebook-nodejs-business-sdk';

// Načtení proměnných prostředí ze souboru .env
dotenv.config();

// Definice rozhraní pro konfiguraci
interface AppConfig {
  facebookAppId: string | undefined;
  facebookAppSecret: string | undefined;
  facebookAccessToken: string | undefined;
  facebookAccountId: string | undefined;
  port: number;
}

// Načtení konfigurace z proměnných prostředí
export const config: AppConfig = {
  facebookAppId: process.env.FACEBOOK_APP_ID,
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
  facebookAccessToken: process.env.FACEBOOK_ACCESS_TOKEN,
  facebookAccountId: process.env.FACEBOOK_ACCOUNT_ID,
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000, // Default port 3000
};

// Funkce pro validaci konfigurace
export const validateConfig = (): boolean => {
  const requiredVars: (keyof AppConfig)[] = [
    'facebookAppId',
    'facebookAppSecret',
    'facebookAccessToken',
    'facebookAccountId',
  ];

  for (const key of requiredVars) {
    if (!config[key]) {
      console.error(`Chybějící konfigurační proměnná: ${key.toUpperCase()}`);
      return false;
    }
  }
  return true;
};

// Funkce pro inicializaci Facebook SDK
export const initFacebookSdk = () => {
  if (!validateConfig()) {
    throw new Error('Nelze inicializovat Facebook SDK: Chybí konfigurace.');
  }
  // We know these are defined because validateConfig passed
  FacebookAdsApi.init(config.facebookAccessToken!);
  // Optional: Set a default AdAccount instance if needed frequently
  // const account = new AdAccount(config.facebookAccountId!);
  // console.log('Facebook SDK inicializováno pro účet:', config.facebookAccountId);
};

// Funkce pro získání instance AdAccount
export const getAdAccount = (): AdAccount => {
   if (!config.facebookAccountId) {
       throw new Error('Facebook Account ID není nakonfigurováno.');
   }
   return new AdAccount(config.facebookAccountId);
}
