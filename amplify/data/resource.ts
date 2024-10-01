import { type ClientSchema, a, defineData, defineFunction } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
export const BEDROCK_AGENT_ID = "bedrock-agent";
export const BEDROCK_AGENT_ALIAS_ID = "bedrock-agent-alias";

export const chatFunction = defineFunction({
  entry: "./chatFunction.ts",
  environment: {
    BEDROCK_AGENT_ID: "7JDUU05B8X",
    BEDROCK_AGENT_ALIAS_ID: "DGCEGAJ3G4",
  },
  timeoutSeconds: 60,

});


export const carLocationUpdate = defineFunction({
  entry: "./carLocationUpdate.ts",
});

export const lowBatteryStationsUpdate = defineFunction({
  entry: "./lowBatteryStationsUpdate.ts",
});

export const lowBatteryChatUpdate = defineFunction({
  entry: "./lowBatteryChatUpdate.ts",
});

export const geoFenceUpdate = defineFunction({
  entry: "./geoFenceUpdate.ts",
});

const schema = a.schema({
  Car: a
    .model({
      deviceId: a.id().required(),
      name: a.string().required(),
      model: a.string().required(),
      year: a.integer().required(),
      color: a.string().required(),
      mileage: a.integer().required(),
    }).authorization((allow) => [allow.publicApiKey()]),
  CarLocation: a
    .customType({
      deviceId: a.string().required(),
      latitude: a.string(),
      longitude: a.string(),
    }),
  LowBatteryStations: a
    .customType({
      station1Address: a.string(),
      station1Latitude: a.string(),
      station1Longitude: a.string(),
      station1Distance: a.string(),
      station2Address: a.string(),
      station2Latitude: a.string(),
      station2Longitude: a.string(),
      station2Distance: a.string(),
    }),
  lowBatteryStationsUpdate: a
    .mutation().arguments({
      station1Address: a.string(),
      station1Latitude: a.string(),
      station1Longitude: a.string(),
      station1Distance: a.string(),
      station2Address: a.string(),
      station2Latitude: a.string(),
      station2Longitude: a.string(),
      station2Distance: a.string(),
    })
    .returns(a.ref("LowBatteryStations"))
    .authorization((allow) => [allow.publicApiKey(), allow.guest()])
    .handler(
      a.handler.function(lowBatteryStationsUpdate)
    ),
  onlowBatteryStationsUpdate: a
    .subscription()
    .for(a.ref("lowBatteryStationsUpdate"))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(
      a.handler.custom({
        entry: "./onLowBatteryStationsUpdate.js"
      })),
  LowBatteryChat: a
    .customType({
      message: a.string()
    }),
  lowBatteryChatUpdate: a
    .mutation().arguments({
      message: a.string()
    })
    .returns(a.ref("LowBatteryChat"))
    .authorization((allow) => [allow.publicApiKey(), allow.guest()])
    .handler(
      a.handler.function(lowBatteryChatUpdate)
    ),
  onlowBatteryChatUpdate: a
    .subscription()
    .for(a.ref("lowBatteryChatUpdate"))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(
      a.handler.custom({
        entry: "./onLowBatteryChatUpdate.js"
      })),
  geoFence: a
    .customType({
      name: a.string(),
      latitude: a.string(),
      longitude: a.string(),
      message: a.string()
    }),
  geoFenceUpdate: a
    .mutation().arguments({
      name: a.string(),
      latitude: a.string(),
      longitude: a.string(),
      message: a.string()
    })
    .returns(a.ref("geoFence"))
    .authorization((allow) => [allow.publicApiKey(), allow.guest()])
    .handler(
      a.handler.function(geoFenceUpdate)
    ),
  ongeoFenceUpdate: a
    .subscription()
    .for(a.ref("geoFenceUpdate"))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(
      a.handler.custom({
        entry: "./onGeoFenceUpdate.js"
      })),
  carLocationUpdate: a
    .mutation().arguments({
      deviceId: a.string().required(),
      latitude: a.string().required(),
      longitude: a.string().required(),
    })
    .returns(a.ref("CarLocation"))
    .authorization((allow) => [allow.publicApiKey(), allow.guest()])
    .handler(
      a.handler.function(carLocationUpdate)),
  onCarLocationUpdate: a
    .subscription()
    .for(a.ref("carLocationUpdate"))
    .authorization((allow) => [allow.publicApiKey()])
    .handler(
      a.handler.custom({
        entry: "./onCarLocationUpdate.js"
      })),
  chat: a
    .query()
    .arguments({
      message: a.string().required(),
    })
    .returns(a.string())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(chatFunction)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
