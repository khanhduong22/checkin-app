require('dotenv').config()
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004"});
  try {
     const result = await model.embedContent("Hello world");
     console.log("Success with text-embedding-004!", result.embedding.values.slice(0, 3));
  } catch(e) {
     console.log("Error text-embedding-004:", e.message);
  }
}
run();
