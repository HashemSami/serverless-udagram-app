import { SNSHandler, SNSEvent, S3Event, S3Handler } from "aws-lambda";
import "source-map-support/register";
import * as AWS from "aws-sdk";

const docClient = new AWS.DynamoDB.DocumentClient();

const connectionsTable = process.env.CONNECTIONS_TABLE;
const stage = process.env.STAGE;
const apiId = process.env.API_ID;

const connectionParams = {
  apiVersion: "2018-11-29",
  endpoint: `${apiId}.execute-api.ap-south-1.amazonaws.com/${stage}`
};

// here we are creating a client to sent messages through api gateway using aws sdk
// and we will use iur websocket connction parameters to send those messages
const apiGateway = new AWS.ApiGatewayManagementApi(connectionParams);

export const handler: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const key = record.s3.object.key;
    console.log("Processing S3 items with key", key);

    const connections = await docClient
      .scan({
        TableName: connectionsTable
      })
      .promise();

    const payload = {
      imageId: key
    };

    for (const connection of connections.Items) {
      const connectionId = connection.id;
      await sendMessageToClient(connectionId, payload);
    }
  }
};

// this function will handle the messages that need to be sent while the websocket connection is on
async function sendMessageToClient(connectionId, payload) {
  try {
    console.log("Sending message to a connection", connectionId);

    await apiGateway
      .postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(payload)
      })
      .promise();
  } catch (e) {
    // delete the conniction item if failed
    console.log("Failed to send message", JSON.stringify(e));
    if (e.statusCode === 410) {
      console.log("Stale connection");

      await docClient
        .delete({
          TableName: connectionsTable,
          Key: {
            id: connectionId
          }
        })
        .promise();
    }
  }
}
