import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({});

type Messages = {
  role: "user" | "system" | "assistant";
  content: string;
}[];

const systemPromptGenerator = (
  history: string,
) => `You are an AI Judge for a system that takes in a math problem submitted by the user
                       and solves it in steps. It doesn't just give out the final result directly,
                       it first thinks about the problem and then proceeds to solve it one math operation
                       at a time, following the BODMAS rule. After each THINK step it waits for you
                       to judge it's thought process till now. It waits for the confirmation from you
                       by expecting a JSON in the format:

                       { "step": "JUDGE", "content": string, "correct": "true" | "false" }

                       You expect input to be in the following JSON format:
                       {
                         "messages": {
                            "role": "user" | "assistant" | "system",
                            "content": string
                         }[]
                       }

                       You then parse the JSON payload and extract the array present as
                       a property at the root 'messages' field. This is your relevant history in the format of the
                       question asked by the user, followed by the successful THINK and JUDGE steps till now.

                       This the history of the messages from the first LLM (in JSON): 
                       
                       ${history}

                       OUTPUT FORMAT: 
                        
                       { "step": "JUDGE", "content": string, "correct": "true" | "false" }

                       EXAMPLES:
                       
                       1.

                       Input:

                       "Is the last THINK step valid? Go through the message history recieved from the first LLM and reply with the specified JSON format."

                       Output: 
                       
                       { "step": "JUDGE", "content": "Looks good!", "correct": "true" }

                       2.

                       Input:

                       "Is the last THINK step valid? Go through the message history recieved from the first LLM and reply with the specified JSON format."

                       Output: 
                       
                       { "step": "JUDGE", "content": "Incorrect thought process!", "correct": "false" }

                       CRITICAL INSTRUCTION: Your response must contain ONLY a valid JSON object. 
                       No text before it. No text after it. No explanations. No markdown.
                       Start your response with { and end with }
                       `;

export async function judgeMe(messages: Messages) {
  if (messages.length === 2) return;

  const userMessage = messages[1];
  const assistantMessages = messages.slice(2);

  const allMessages = [userMessage, ...assistantMessages];
  const systemPrompt = systemPromptGenerator(
    JSON.stringify({
      messages: allMessages,
    }),
  );

  const message = await client.messages.create({
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content:
          "Is the last THINK step valid? Go through the message history recieved from the first LLM and reply with the specified JSON format.",
      },
    ],
    model: "claude-opus-4-1-20250805",
  });

  return message.content[0]?.type === "text" ? message.content[0]?.text : "";
}
