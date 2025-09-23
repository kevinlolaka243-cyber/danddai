import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export  async function GET(request){

    try{
        const response = await openai.responses.create({
        model: "gpt-5",
        input: "Write a one-sentence bedtime story about a unicorn.",
      });
        return new Response(response.output_text, {status: 200});

    }catch(error){
        console.log(error);
        return new Response(error.message, {status: 500});
    } 
}