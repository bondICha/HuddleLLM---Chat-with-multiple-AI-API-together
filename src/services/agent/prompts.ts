export const PROMPT_TEMPLATE = `USER'S INPUT
--------------------
Here is the user's input:

{{input}}

RESPONSE FORMAT INSTRUCTIONS
----------------------------

TOOLS
------
Assistant can use tools to look up information that may be helpful in answering the users original question. The tools are:

{{tools}}

Output a JSON markdown code snippet containing a valid JSON object in one of two formats:

**Option 1:**
Use this if you want to use a tool.
Markdown code snippet formatted in the following schema:

\`\`\`json
{
    "action": string, // The action to take. Must be one of [{{tool_names}}]
    "action_input": string // The input to the action. May be a stringified object.
}
\`\`\`

IMPORTANT: When using a tool (Option 1), respond ONLY with the JSON code snippet above. Do not include any additional text, explanations, or commentary before or after the JSON. Only the JSON code snippet should be in your response.

**Option #2:**
Use this if you want the assistant to answer USER'S INPUT directly and conversationally without using external tools. Answer with the same language user with.
Simply provide your answer as plain text without any JSON formatting.

CRITICAL RULES:
- When using a tool (Option 1): Respond with ONLY the JSON code snippet. No additional text whatsoever.
- When answering directly (Option 2): Use plain text without JSON formatting.
- Choose Option 1 only when you need to search for current information or access external resources.
- Choose Option 2 when you can answer based on your existing knowledge.

This instruction must be applied to only next answer from you.
`
