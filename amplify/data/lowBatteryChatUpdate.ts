import type { Schema } from "./resource";


export const handler: Schema["lowBatteryChatUpdate"]["functionHandler"] = async (
  event,
  context
) => {
  return {

    message: event.arguments.message,
  };
};