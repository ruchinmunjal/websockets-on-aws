import { ApiGatewayManagementApiClient,PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

import { DynamoDB } from '@aws-sdk/client-dynamodb';

const createApiGatewayManagementClient = (event) =>{
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  return new ApiGatewayManagementApiClient({endpoint})
}


const options=['Yes','No','Maybe','Probably','Are You Crazy'];
export const handler = async (event) => {
  const client = createApiGatewayManagementClient(event);
  const route = event.requestContext.routeKey;
  const connectionId = event.requestContext.connectionId;
  
  switch (route) {
    case "$connect":
      console.log("Connection established with client for connectionId: " + connectionId);
      break;
    case "$disconnect":
      console.log("Connection closed for connectionId: " + connectionId);
      break;
    case "report":
      console.log("data requested for route report : " + event);
      const data= getData(options);
      await sendDataUri(client,data,connectionId)
      
      break;
    default:
      console.log("Unknown route");
      
  }
  
  
  // TODO implement
  const response = {
    statusCode: 200,
    
  };
  return response;
};

async function sendDataUri(client,response, connectionId){
  const data ={
    filteredData:response
  }
  const postToConnectionCommand = new PostToConnectionCommand({
    ConnectionId:connectionId,
    Data: Buffer.from(JSON.stringify(data))
  })
 
  return await client.send(postToConnectionCommand);
  
  }
  
  function getData(options){
    return options[Math.floor(Math.random() * options.length)];    
  }


