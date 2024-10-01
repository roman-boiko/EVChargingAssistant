import type { Schema } from "./resource";


export const handler: Schema["geoFenceUpdate"]["functionHandler"] = async (
  event,
  context
) => {
  return {
    name: event.arguments.name,
    latitude: event.arguments.latitude,
    longitude: event.arguments.longitude,
    message: event.arguments.message,
  };
};
