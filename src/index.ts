// openai sdk
import OpenAI from "openai";

// mcp sdk
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// dotenv
import dotenv from "dotenv";
import readline from "readline";

dotenv.config();

const OPEN_API_KEY = process.env.OPENAI_API_KEY;
if (!OPEN_API_KEY) {
	throw new Error("OPENAI_API_KEY is not set");
}

class MCPClient {
	private mcp: Client;
	private llm: OpenAI;
	private transport: StdioClientTransport | null = null;
	private tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];

	constructor() {
		this.llm = new OpenAI({ apiKey: OPEN_API_KEY });
		this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
	}

	// Connect to the MCP server
	async connectToServer(serverScriptPath: string) {
		const isPy = serverScriptPath.endsWith(".py");
		const isJs = serverScriptPath.endsWith(".js");

		if (!isJs && !isPy) {
			throw new Error("Server script must be a .js or .py file");
		}

		const command = isPy
			? process.platform === "win32"
				? "uv"
				: "uv"
			: process.execPath;

		this.transport = new StdioClientTransport({
			command, // python /path/to/server.py
			args: ["run", "--with", "mcp[cli]", "mcp", "run", serverScriptPath],
		});

		await this.mcp.connect(this.transport);

		// Register tools
		const toolsResult = await this.mcp.listTools();

		this.tools = toolsResult.tools.map((tool) => ({
			type: "function",
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.inputSchema,
			},
		}));

		console.log(
			"Connected to server with tools:",
			this.tools.map((tool) => tool.function.name)
		);
	}

	// Process query
	async processPrompt(prompt: string) {
		const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "user", content: prompt },
		];

		const completion = await this.llm.chat.completions.create({
			model: "gpt-4.1-mini",
			messages,
			tools: this.tools,
		});

		const response = completion.choices[0].message;
		messages.push(response);

		if (response.tool_calls) {
			for (const toolCall of response.tool_calls) {
				const functionName = toolCall.function.name;
				const args = JSON.parse(toolCall.function.arguments);
				const toolResult = await this.mcp.callTool({
					name: functionName,
					args,
				});
				messages.push({
					name: functionName,
					role: "function",
					content: JSON.stringify(toolResult),
				});

				const secondCompletion = await this.llm.chat.completions.create({
					model: "gpt-4.1-mini",
					messages,
				});
				return secondCompletion.choices[0].message.content;
			}
		}
		return response.content;
	}

	async chatLoop() {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		try {
			console.log("\nMCP Client CLI");
			console.log("Type 'exit' to quit the chat.\n");

			await new Promise((resolve, reject) => {
				rl.question("You: ", async (answer) => {
					if (answer.toLowerCase() === "exit") {
						rl.close();
						resolve(true);
					}
					const response = await this.processPrompt(answer);
					console.log(`MCP: ${response}`);
				});
			});
		} finally {
			rl.close();
		}
	}

	async cleanup() {
		await this.mcp.close();
	}
}

async function main() {
	if (process.argv.length < 3) {
		console.error("Usage: node index.js <server_script_path>");
		process.exit(1);
	}

	const mcpClient = new MCPClient();
	try {
		await mcpClient.connectToServer(process.argv[2]);
		await mcpClient.chatLoop();
	} finally {
		await mcpClient.cleanup();
		process.exit(0);
	}
}

main();
