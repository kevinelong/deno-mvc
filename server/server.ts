import { serve } from "https://deno.land/std@0.100.0/http/server.ts";
import { routes } from "./routes.ts";


/* SERVER */
export default class MVCServer{
  constructor(){

  }
  serve(){
    (async ()=>{
      const get_path = (url:string) => url.replace(new RegExp("^[^#]*?://.*?(/.*)$"), '$1');
      const s = serve({ port: 8000 });

      for await (const r of s) {
        const output = routes.route(get_path(r.url), r);
        console.log(output.body);
        r.respond({status:output.head.status, body:output.body, headers:new Headers(output.head.headers)});
      }

    })();
  }

  get_path (url:string){
    return url.replace(new RegExp("^[^#]*?://.*?(/.*)$"), '$1');
  }
}
