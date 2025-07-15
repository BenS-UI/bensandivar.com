
import { GoogleGenAI } from '@google/genai';
import type { GenerateContentResponse } from '@google/genai';
import { Difference } from '../utils/diff';

// In a Vite project, environment variables are typically exposed via `import.meta.env`.
// To align with the Gemini SDK's standard `process.env` convention, we use Vite's `define`
// feature to make `process.env.API_KEY` available on the client. This declaration
// informs TypeScript about the injected global variable.
declare var process: {
  env: {
    API_KEY: string;
  }
};

// The API key is injected at build time by Vite.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateCodeForChanges(differences: Difference[]): Promise<string> {
  if (!process.env.API_KEY) {
    return Promise.resolve("`ERROR: API_KEY` is not set. Please configure it in your Netlify environment variables (as VITE_API_KEY) to use the AI features.");
  }
  
  if (differences.length === 0) {
    return Promise.resolve("No changes detected. Edit some content and try again!");
  }

  const prompt = `
    You are an expert senior frontend engineer helping a user update their portfolio website's content.
    The user has made the following changes using a visual editor.
    Your task is to generate the necessary TypeScript code to reflect these changes in their source code.

    The application uses a central content store. The changes are provided as a JSON object with a "path", "oldValue", and "newValue".
    The path indicates the location of the change within the main content object.

    Here are the changes:
    \`\`\`json
    ${JSON.stringify(differences, null, 2)}
    \`\`\`

    Based on these changes, provide the user with the exact code they need to copy and paste.
    The output should be a markdown response.
    - Explain which file needs to be updated. The content is managed in a file called 'store.ts' for general text and 'data/projects.ts' or 'data/posts.ts' for project/post arrays.
    - Provide the full, updated code block. Do not use partial code or "..." comments.
    - Ensure the code is clean, well-formatted, and correct TypeScript.
    - Be friendly and helpful.
    - If a change is on an array of objects (like 'projects' or 'posts'), instruct the user to update the specific object in the array in the corresponding data file ('data/projects.ts' or 'data/posts.ts'). If it's a simple text change (like 'home.hero.tagline'), instruct them to update the 'store.ts' file.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating content from AI:", error);
    return Promise.resolve("Sorry, I encountered an error while generating the code. Please check the console for details.");
  }
}
