import type { Schema } from "./resource";
import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

// initialize bedrock runtime client
const client = new BedrockAgentRuntimeClient({
    region: process.env.AWS_REGION,
});

const agentId = process.env.BEDROCK_AGENT_ID;
const agentAliasId = process.env.BEDROCK_AGENT_ALIAS_ID;
const sessionId = "Session123";

export const handler: Schema["chat"]["functionHandler"] = async (
    event,
    context
) => {
    // User prompt
    const prompt = event.arguments.message;
    const command = new InvokeAgentCommand({
        agentId,
        agentAliasId,
        sessionId,
        inputText: prompt,
    });

    // Invoke model
    try {
        let completion = "";
        const response = await client.send(command);

        if (response.completion === undefined) {
            throw new Error("Completion is undefined");
        }

        for await (let chunkEvent of response.completion) {
            const chunk = chunkEvent.chunk;
            console.log(chunk);
            const decodedResponse = new TextDecoder("utf-8").decode(chunk?.bytes);
            completion += decodedResponse;
        }
        return completion;
    } catch (error) {
        console.error(error);
        throw error;
    }
};