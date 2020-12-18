import { SNSHandler, SNSEvent, S3Event, S3Handler } from "aws-lambda";
import "source-map-support/register";

export const handler: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const key = record.s3.object.key;
    console.log("Processing S3 items with key", key);
  }
};
