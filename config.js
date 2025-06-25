import "dotenv/config";

const config = {
  PORT: process.env.PORT,
  MONGODB_URL: process.env.MONGODB_URL,
  ADMIN: process.env.ADMIN,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
};

export default config;
