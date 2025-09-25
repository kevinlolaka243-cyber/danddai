import { generateKingdom } from "./worldGeneration";

export  async function GET(request){

    try{
        const kingdom = await generateKingdom();
        console.log(kingdom);

        if(kingdom.name){
            return new Response(JSON.stringify(kingdom), {status: 200});
        }

    }catch(error){
        console.log(error);
        return new Response(error.message, {status: 500});
    } 
}