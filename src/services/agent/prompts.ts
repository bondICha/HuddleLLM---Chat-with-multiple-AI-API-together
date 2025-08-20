export const PROMPT_TEMPLATE = `USER'S INPUT
--------------------
Here is the user's input (remember to respond with a markdown code snippet of a json blob with a single action, and NOTHING else):

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

**Option #2:**
Use this if you want the assistant to answer USER'S INPUT directly and conversationally without using external tools. Answer with the same language user with.
Simply provide your answer as plain text without any JSON formatting.

Remember: Only use JSON format (Option 1) when you need to use a tool. For direct answers, use plain text (Option 2).
This instruction must be applied to only next answer from you.
`
