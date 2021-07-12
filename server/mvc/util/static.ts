import {exists, existsSync} from "https://deno.land/std/fs/mod.ts";
import {readableStreamFromReader} from "https://deno.land/std/io/mod.ts";
export const readFile = (filename: string) => {
  const decoder = new TextDecoder()
  return decoder.decode(Deno.readFileSync(filename))
}

export class Static{
  root_path:string;
  constructor(root_path:string){
    this.root_path = root_path;
  }
  read(path:string){
    const filePath= this.root_path + path;
    
    console.log("Looking for",filePath);
    if(!existsSync(filePath)){
      return undefined;
    }
    const fileSize=(Deno.statSync(filePath)).size;
    const text = readFile(filePath);
    const size_text = fileSize.toString();
    return {
      body:text, 
      head:{
        status:200,
        headers:{
          'content-length': size_text
        }
      }
    };
  }
}
